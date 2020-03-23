import {timer, from, Observable} from "rxjs";
import {distinctUntilChanged, map, exhaustMap, share, shareReplay} from "rxjs/operators";
import equal from "fast-deep-equal";
import Database from "./database/database.js";
import NullDatabase from "./database/nullDatabase.js";
import Events from "events";
import {isAddress, toChecksumAddress, mapFunc} from "./utils";
import stripHexPrefix from "strip-hex-prefix";
import {hexToDec} from "hex2dec";
import EventSyncer from "./eventSyncer";
import LogSyncer from "./logSyncer";
import hash from "object-hash";

export default class Subspace {
  observables = {};
  intervalObservable = null;

  // Stats
  latestBlockNumber = undefined;
  latest10Blocks = [];

  constructor(web3, options = {}) {
    if (!web3?.currentProvider?.on) {
      // https://github.com/ethereum/web3.js/blob/1.x/packages/web3-core-subscriptions/src/subscription.js#L205
      console.warn("subspace: the current provider doesn't support subscriptions. Falling back to http polling");
    }

    this.events = new Events();
    this.web3 = web3;

    this.options = {};
    this.options.refreshLastNBlocks = options.refreshLastNBlocks ?? 12;
    this.options.callInterval = options.callInterval;
    this.options.dbFilename = options.dbFilename ?? "subspace.db";
    this.options.disableDatabase = options.disableDatabase;
    this.options.snapshot = options.snapshot;

    this.networkId = undefined;
    this.isWebsocketProvider = options.disableSubscriptions ? false : !!web3?.currentProvider?.on;
  }

  async init() {
    if (this.options.disableDatabase === true) {
      this._db = new NullDatabase("", this.events);
    } else {
      this._db = new Database(this.options.dbFilename, this.events);
    }
    
    if(this.options.snapshot) {
      await this._db.restore(this.options.snapshot);
    }

    this.eventSyncer = new EventSyncer(this.web3.eth, this.events, this._db, this.isWebsocketProvider);
    this.logSyncer = new LogSyncer(this.web3.eth, this.events, this._db);

    this.networkId = await this.web3.eth.net.getId();

    const block = await this.web3.eth.getBlock("latest");

    // Preload <= 10 blocks to calculate avg block time
    if (block.number !== 0) {
      const minBlock = Math.max(0, block.number - 9);
      for (let i = minBlock; i < block.number; i++) {
        this.latest10Blocks.push(this.web3.eth.getBlock(i));
      }

      this.latest10Blocks = await Promise.all(this.latest10Blocks);
    }

    // Initial stats
    this.latestBlockNumber = block.number;
    this.latest10Blocks.push(block);

    if (this.isWebsocketProvider) {
      this._initNewBlocksSubscription();
    } else {

      if(!this.options.callInterval){
        this.options.callInterval = Math.max(this._calcAverage(), 1000);
      }

      this._initCallInterval();
    }
  }

  contract(contractInstance) {
    if (!contractInstance) {
      throw new Error("please pass a contract instance to Subspace.contract()");
    }

    let address = (contractInstance.options && contractInstance.options.address) || contractInstance.address || contractInstance.deployedAddress;
    let abi = (contractInstance.options && contractInstance.options.jsonInterface) || contractInstance.abi || contractInstance.abiDefinition;
    let from = (contractInstance.options && contractInstance.options.from) || contractInstance.from || contractInstance.defaultAddress || this.web3.eth.defaultAccount;
    let gas = (contractInstance.options && contractInstance.options.gas) || contractInstance.gas || contractInstance.gas || "800000";

    const SubspaceContract = new this.web3.eth.Contract(abi, {from, gas});
    SubspaceContract.options.address = address;
    SubspaceContract.options.from = from;

    if (!from) {
      setTimeout(async () => {
        const accounts = await this.web3.eth.getAccounts();
        SubspaceContract.options.from = accounts[0];
      }, 100);
    }

    SubspaceContract.trackEvent = (eventName, filterConditions) => {
      return this.trackEvent(SubspaceContract, eventName, filterConditions);
    };

    Object.keys(SubspaceContract.events).forEach(ev => {
      if (!SubspaceContract.options.jsonInterface.find(x => x.type === "event" && x.name == ev)) return;
      SubspaceContract.events[ev].track = filterConditions =>
        this.trackEvent(SubspaceContract, ev, filterConditions);
    });

    SubspaceContract.trackProperty = (propName, methodArgs, callArgs) => {
      return this.trackProperty(SubspaceContract, propName, methodArgs, callArgs);
    };

    Object.keys(SubspaceContract.methods).forEach(methodName => {
      const oldFunc = SubspaceContract.methods[methodName];

      const _this = this;
      const newFunc = function() {
        const txObject = oldFunc.apply(null, arguments);
        txObject.track = callArgs => _this.trackProperty(SubspaceContract, methodName, txObject.arguments, callArgs);
        return txObject;
      };

      SubspaceContract.methods[methodName] = newFunc;
    });

    SubspaceContract.trackBalance = erc20Address => {
      return this.trackBalance(SubspaceContract.options.address, erc20Address);
    };

    return SubspaceContract;
  }

  clearDB(collection) {
    if (collection) {
      // TODO: delete specific collection
    } else {
      // TODO: delete everything
    }
  }

  _calcAverage(){
    const times = [];
    for (let i = 1; i < this.latest10Blocks.length; i++) {
      let time = this.latest10Blocks[i].timestamp - this.latest10Blocks[i - 1].timestamp;
      times.push(time);
    }
    return times.length ? Math.round(times.reduce((a, b) => a + b) / times.length) * 1000 : 0;
  }

  _initNewBlocksSubscription() {
    if(this.options.callInterval) return;

    const newBlockObservable = new Observable(observer => {
      observer.next(); // initial tick;
      
      const newBlocksSubscription = this.web3.eth.subscribe("newBlockHeaders", err => {
        if (err) {
          observer.error(err);
          return;
        }
        observer.next();
      });

      return () => newBlocksSubscription.unsubscribe();
    });

    this.intervalObservable = newBlockObservable.pipe(share());
  }

  _initCallInterval() {
    if (this.intervalObservable != null || this.options.callInterval === 0) return;
    this.intervalObservable = timer(0, this.options.callInterval).pipe(share());
  }

  _getObservable(subjectHash, observableBuilder) {
    if (this.observables[subjectHash]) return this.observables[subjectHash];
    this.observables[subjectHash] = observableBuilder();
    return this.observables[subjectHash];
  }

  _getDistinctObservableFromPromise(subjectName, promiseCB, cb) {
    return this._getObservable(subjectName, () => {

      let observable = this.intervalObservable.pipe(
        exhaustMap(() => from(promiseCB())),
        distinctUntilChanged((a, b) => equal(a, b))
      );

      if(cb){
        observable = observable.pipe(map(x => {
          cb(x);
          return x;
        }));
      }

      return observable.pipe(shareReplay({refCount: true, bufferSize: 1}));
    });
  }

  trackEvent(contractInstance, eventName, filterConditions) {
    const subjectHash = hash({
      address: contractInstance.options.address,
      networkId: this.networkId,
      eventName,
      filterConditions
    });

    return this._getObservable(subjectHash, () => {
      const deleteFrom = this.latestBlockNumber - this.options.refreshLastNBlocks;
      const observable = this.eventSyncer
        .track(contractInstance, eventName, filterConditions, deleteFrom, this.networkId)
        .pipe(shareReplay({refCount: true}));

      observable.map = mapFunc(observable);

      return observable;
    });
  }

  trackLogs(options, inputsABI) {
    if (!this.isWebsocketProvider) console.warn("This method only works with websockets");

    const subjectHash = hash({inputsABI, options});
    return this._getObservable(subjectHash, () => {
      const [subject, ethSubscription] = this.logSyncer.track(
        options,
        inputsABI,
        this.latestBlockNumber - this.options.refreshLastNBlocks,
        this.networkId
      );
      // TODO: remove eth subscription
      return subject;
    });
  }

  trackProperty(contractInstance, propName, methodArgs = [], callArgs = {}) {
    const identifier = hash({
      address: contractInstance.options.address,
      networkId: this.networkId,
      propName,
      methodArgs,
      callArgs
    });

    const observable = this._getDistinctObservableFromPromise(identifier, () => {
      if (!Array.isArray(methodArgs)) {
        methodArgs = [methodArgs];
      }
      const method = contractInstance.methods[propName].apply(contractInstance.methods[propName], methodArgs);
      return method.call.apply(method.call, [callArgs]);
    });

    observable.map = mapFunc(observable);

    return observable;
  }

  trackBalance(address, erc20Address) {
    if (!isAddress(address)) throw "invalid address";
    if (erc20Address && !isAddress(erc20Address)) throw "invalid ERC20 contract address";

    address = toChecksumAddress(address);
    erc20Address = erc20Address ? toChecksumAddress(erc20Address) : null;
    
    return this._getDistinctObservableFromPromise(hash({address, erc20Address}), () => {
      if (!erc20Address) {
        this.web3.eth.getBalance(address).then(balance => console.log("Balance: ", balance));
        return this.web3.eth.getBalance(address);
      } else {
                    //  balanceOf
        const data = "0x70a08231000000000000000000000000" + stripHexPrefix(address);
        return new Promise((resolve, reject) => this.web3.eth.call({to: erc20Address, data}).then(balance => resolve(hexToDec(balance))).catch(reject));
      }
    });
  }

  trackBlockNumber() {
    return this._getDistinctObservableFromPromise("blockNumber", () => this.web3.eth.getBlockNumber());
  }

  trackBlock() {
    return this._getDistinctObservableFromPromise("block", () => this.web3.eth.getBlock("latest"), block => {
      if (this.latest10Blocks[this.latest10Blocks.length - 1].number === block.number) return;
      this.latest10Blocks.push(block);
      if (this.latest10Blocks.length > 10) {
        this.latest10Blocks.shift();
      }
    });
  }

  trackGasPrice() {
    return this._getDistinctObservableFromPromise("gasPrice", () => this.web3.eth.getGasPrice());
  }

  trackAverageBlocktime() {
    return this._getObservable("avgBlockTime", () => {
      
      
      return this.trackBlock().pipe(
        map(() => this._calcAverage()),
        distinctUntilChanged((a, b) => equal(a, b))
      );
    });
  }

  close() {
    this.eventSyncer.close();
  }

  snapshot() {
    return this._db.serialize();
  }

  async loadSnapshot(serializedDb) {
    return this._db.restore(serializedDb, true);
  }
}
