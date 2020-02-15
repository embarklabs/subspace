import {BehaviorSubject, from} from "rxjs";
import {distinctUntilChanged, map, exhaustMap, shareReplay} from "rxjs/operators";
import equal from "fast-deep-equal";
import Database from "./database/database.js";
import NullDatabase from "./database/nullDatabase.js";
import Events from "events";
import Web3Eth from "web3-eth";
import {isAddress} from "./utils";
import stripHexPrefix from "strip-hex-prefix";
import {hexToDec} from "hex2dec";
import EventSyncer from "./eventSyncer";
import LogSyncer from "./logSyncer";
import hash from "object-hash";

export default class Subspace {
  observables = {};

  newBlocksSubscription = null;
  intervalTracker = null;

  // Stats
  latestBlockNumber = undefined;
  latest10Blocks = [];

  constructor(provider, options = {}) {
    if (!provider.on) {
      // https://github.com/ethereum/web3.js/blob/1.x/packages/web3-core-subscriptions/src/subscription.js#L205
      console.warn("subspace: the current provider doesn't support subscriptions. Falling back to http polling");
    }

    this.events = new Events();
    this.web3 = new Web3Eth(provider);

    this.options = {};
    this.options.refreshLastNBlocks = options.refreshLastNBlocks ?? 12;
    this.options.callInterval = options.callInterval ?? 0;
    this.options.dbFilename = options.dbFilename ?? "subspace.db";
    this.options.disableDatabase = options.disableDatabase;

    this.networkId = undefined;
    this.isWebsocketProvider = options.disableSubscriptions ? false : !!provider.on;
    this.triggerSubject = new BehaviorSubject();
  }

  init() {
    return new Promise(async resolve => {
      if (this.options.disableDatabase === true) {
        this._db = new NullDatabase("", this.events);
      } else {
        this._db = new Database(this.options.dbFilename, this.events);
      }
      this.eventSyncer = new EventSyncer(this.web3, this.events, this._db, this.isWebsocketProvider);
      this.logSyncer = new LogSyncer(this.web3, this.events, this._db);

      this.web3.net.getId().then(netId => {
        this.networkId = netId;
      });

      const block = await this.web3.getBlock("latest");

      // Preload <= 10 blocks to calculate avg block time
      if (block.number !== 0) {
        const minBlock = Math.max(0, block.number - 9);
        for (let i = minBlock; i < block.number; i++) {
          this.latest10Blocks.push(this.web3.getBlock(i));
        }

        this.latest10Blocks = await Promise.all(this.latest10Blocks);
      }

      // Initial stats
      this.latestBlockNumber = block.number;
      this.latest10Blocks.push(block);

      if (this.isWebsocketProvider) {
        this._initNewBlocksSubscription();
      } else {
        this.options.callInterval = this.options.callInterval || 1000;
        this._initCallInterval();
      }

      resolve();
    });
  }

  contract(contractInstance) {
    if (!contractInstance) {
      throw new Error("please pass a contract instance to Subspace.contract()");
    }

    let address = (contractInstance.options && contractInstance.options.address) || contractInstance.address || contractInstance.deployedAddress;
    let abi = (contractInstance.options && contractInstance.options.jsonInterface) || contractInstance.abi || contractInstance.abiDefinition;
    let from = (contractInstance.options && contractInstance.options.from) || contractInstance.from || contractInstance.defaultAddress || this.web3.defaultAccount;
    let gas = (contractInstance.options && contractInstance.options.gas) || contractInstance.gas || contractInstance.gas || "800000";

    const SubspaceContract = new this.web3.Contract(abi, {from, gas});
    SubspaceContract.options.address = address;
    SubspaceContract.options.from = from;

    if (!from) {
      setTimeout(async () => {
        const accounts = await this.web3.getAccounts();
        SubspaceContract.options.from = accounts[0];
      }, 100);
    }

    SubspaceContract.trackEvent = (eventName, filterConditionsOrCb) => {
      return this.trackEvent(SubspaceContract, eventName, filterConditionsOrCb);
    };

    Object.keys(SubspaceContract.events).forEach(ev => {
      if (!SubspaceContract.options.jsonInterface.find(x => x.type === "event" && x.name == ev)) return;
      SubspaceContract.events[ev].track = filterConditionsOrCb =>
        this.trackEvent(SubspaceContract, ev, filterConditionsOrCb);
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

  _initNewBlocksSubscription() {
    if (this.newBlocksSubscription != null || this.options.callInterval !== 0) return;

    this.newBlocksSubscription = this.web3.subscribe("newBlockHeaders", (err, result) => {
      if (err) {
        console.error(err);
        return;
      }
      this.triggerSubject.next();
    });
  }

  _initCallInterval() {
    if (this.intervalTracker != null || this.options.callInterval === 0) return;
    this.intervalTracker = setInterval(() => this.triggerSubject.next(), this.options.callInterval);
  }

  _getObservable(subjectHash, observableBuilder) {
    if (this.observables[subjectHash]) return this.observables[subjectHash];
    this.observables[subjectHash] = observableBuilder();
    return this.observables[subjectHash];
  }

  _getDistinctObservableFromPromise(subjectName, promiseCB, cb) {
    return this._getObservable(subjectName, () => {
      let observable = this.triggerSubject.pipe(
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
      const [subject, ethSubscription] = this.eventSyncer.track(contractInstance, eventName, filterConditions, deleteFrom, this.networkId);

      // TODO: remove eth subscription

      subject.map = prop => {
        return returnSub.pipe(
          map(x => {
            if (typeof prop === "string") {
              return x[prop];
            }
            if (Array.isArray(prop)) {
              let newValues = {};
              prop.forEach(p => {
                newValues[p] = x[p];
              });
              return newValues;
            }
          })
        );
      };

      return subject;
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

    observable.map = prop => {
      return observable.pipe(
        map(x => {
          if (typeof prop === "string") {
            return x[prop];
          }
          if (Array.isArray(prop)) {
            let newValues = {};
            prop.forEach(p => {
              newValues[p] = x[p];
            });
            return newValues;
          }
        })
      );
    };

    return observable;
  }

  trackBalance(address, erc20Address) {
    if (!isAddress(address)) throw "invalid address";
    if (erc20Address && !isAddress(erc20Address)) throw "invalid ERC20 contract address";

    address = toChecksumAddress(address);
    erc20Address = toChecksumAddress(address);
    
    return this._getDistinctObservableFromPromise(hash({address, erc20Address}), () => {
      if (!erc20Address) {
        return this.web3.getBalance(address);
      } else {
                  //  balanceOf
        const data = "0x70a08231" + "000000000000000000000000" + stripHexPrefix(address);
        return new Promise((resolve, reject) => this.web3.call({to: erc20Address, data}).then(balance => resolve(hexToDec(balance))).catch(reject));
      }
    });
  }

  trackBlockNumber() {
    return this._getDistinctObservableFromPromise("blockNumber", () => this.web3.getBlockNumber());
  }

  trackBlock() {
    return this._getDistinctObservableFromPromise("gasPrice", () => this.web3.getBlock("latest"), block => {
      if (this.latest10Blocks[this.latest10Blocks.length - 1].number === block.number) return;
      this.latest10Blocks.push(block);
      if (this.latest10Blocks.length > 10) {
        this.latest10Blocks.shift();
      }
    });
  }

  trackGasPrice() {
    return this._getDistinctObservableFromPromise("gasPrice", () => this.web3.getGasPrice());
  }

  trackAverageBlocktime() {
    return this._getObservable("avgBlockTime", () => {
      const calcAverage = () => {
        const times = [];
        for (let i = 1; i < this.latest10Blocks.length; i++) {
          let time = this.latest10Blocks[i].timestamp - this.latest10Blocks[i - 1].timestamp;
          times.push(time);
        }
        return times.length ? Math.round(times.reduce((a, b) => a + b) / times.length) * 1000 : 0;
      };
      
      return this.trackBlock().pipe(
        map(() => calcAverage()),
        distinctUntilChanged((a, b) => equal(a, b))
      );
    });
  }

  close() {
    clearInterval(this.intervalTracker);
    if (this.newBlocksSubscription) this.newBlocksSubscription.unsubscribe();
    this.eventSyncer.close();
    this.intervalTracker = null;
  }
}
