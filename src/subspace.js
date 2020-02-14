import {ReplaySubject, BehaviorSubject} from "rxjs";
import {distinctUntilChanged, map} from "rxjs/operators";
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
  subjects = {};
  callables = [];

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

      this.callables.forEach(fn => fn());
    });
  }

  _initCallInterval() {
    if (this.intervalTracker != null || this.options.callInterval === 0) return;

    this.intervalTracker = setInterval(() => {
      this.callables.forEach(fn => fn());
    }, this.options.callInterval);
  }

  _getSubject(subjectHash, subjectCB) {
    if (this.subjects[subjectHash]) return this.subjects[subjectHash];
    this.subjects[subjectHash] = subjectCB();
    return this.subjects[subjectHash];
  }

  _addDistinctCallable(trackAttribute, cbBuilder, SubjectType, subjectArg = undefined) {
    return this._getSubject(trackAttribute, () => {
      const sub = new SubjectType(subjectArg);
      const cb = cbBuilder(sub);
      cb();
      this.callables.push(cb);
      return sub.pipe(distinctUntilChanged((a, b) => equal(a, b)));
    });
  }

  trackEvent(contractInstance, eventName, filterConditions) {
    const subjectHash = hash({
      address: contractInstance.options.address,
      networkId: this.networkId,
      eventName,
      filterConditions
    });
    return this._getSubject(subjectHash, () => {
      let deleteFrom = this.latestBlockNumber - this.options.refreshLastNBlocks;
      let returnSub = this.eventSyncer.track(contractInstance, eventName, filterConditions, deleteFrom, this.networkId);

      returnSub.map = prop => {
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

      return returnSub;
    });
  }

  trackLogs(options, inputsABI) {
    if (!this.isWebsocketProvider) console.warn("This method only works with websockets");

    const subjectHash = hash({inputsABI, options});
    return this._getSubject(subjectHash, () =>
      this.logSyncer.track(options, inputsABI, this.latestBlockNumber - this.options.refreshLastNBlocks, this.networkId)
    );
  }

  trackProperty(contractInstance, propName, methodArgs = [], callArgs = {}) {
    const subjectHash = hash({
      address: contractInstance.options.address,
      networkId: this.networkId,
      propName,
      methodArgs,
      callArgs
    });

    return this._getSubject(subjectHash, () => {
      const subject = new ReplaySubject(1);

      if (!Array.isArray(methodArgs)) {
        methodArgs = [methodArgs];
      }

      const method = contractInstance.methods[propName].apply(contractInstance.methods[propName], methodArgs);

      const callContractMethod = () => {
        method.call.apply(method.call, [
          callArgs,
          (err, result) => {
            if (err) {
              subject.error(err);
              return;
            }
            subject.next(result);
          }
        ]);
      };

      callContractMethod();

      this.callables.push(callContractMethod);

      const returnSub = subject.pipe(distinctUntilChanged((a, b) => equal(a, b)));

      returnSub.map = prop => {
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

      return returnSub;
    });
  }

  trackBalance(address, erc20Address) {
    if (!isAddress(address)) throw "invalid address";
    if (erc20Address && !isAddress(erc20Address)) throw "invalid ERC20 contract address";

    const subjectHash = hash({address, erc20Address});

    const getETHBalance = cb => {
      const fn = this.web3.getBalance;
      fn.apply(fn, [address, cb]);
    };

    const getTokenBalance = cb => {
      const fn = this.web3.call;
      //  balanceOf
      const data = "0x70a08231" + "000000000000000000000000" + stripHexPrefix(address);
      fn.apply(fn, [{to: erc20Address, data}, cb]);
    };

    let callFn;
    if (!erc20Address) {
      callFn = subject => () =>
        getETHBalance((err, balance) => {
          if (err) {
            subject.error(err);
            return;
          }
          subject.next(balance);
        });
    } else {
      callFn = subject => () =>
        getTokenBalance((err, balance) => {
          if (err) {
            subject.error(err);
            return;
          }
          subject.next(hexToDec(balance));
        });
    }

    return this._addDistinctCallable(subjectHash, callFn, ReplaySubject, 1);
  }

  trackBlock() {
    const blockCB = subject => () => {
      this.web3
        .getBlock("latest")
        .then(block => {
          if (this.latest10Blocks[this.latest10Blocks.length - 1].number === block.number) return;

          this.latest10Blocks.push(block);
          if (this.latest10Blocks.length > 10) {
            this.latest10Blocks.shift();
          }
          subject.next(block);
        })
        .catch(error => subject.error(error));
    };

    return this._addDistinctCallable(
      "blockObservable",
      blockCB,
      BehaviorSubject,
      this.latest10Blocks[this.latest10Blocks.length - 1]
    );
  }

  trackBlockNumber() {
    const blockNumberCB = subject => () => {
      this.web3
        .getBlockNumber()
        .then(result => subject.next(result))
        .catch(error => subject.error(error));
    };
    return this._addDistinctCallable("blockNumberObservable", blockNumberCB, ReplaySubject, 1);
  }

  trackGasPrice() {
    const gasPriceCB = subject => () => {
      this.web3
        .getGasPrice()
        .then(result => subject.next(result))
        .catch(error => subject.error(error));
    };
    return this._addDistinctCallable("gasPriceObservable", gasPriceCB, ReplaySubject, 1);
  }

  trackAverageBlocktime() {
    this.trackBlock();

    const calcAverage = () => {
      const times = [];
      for (let i = 1; i < this.latest10Blocks.length; i++) {
        let time = this.latest10Blocks[i].timestamp - this.latest10Blocks[i - 1].timestamp;
        times.push(time);
      }
      return times.length ? Math.round(times.reduce((a, b) => a + b) / times.length) * 1000 : 0;
    };

    const avgTimeCB = subject => () => subject.next(calcAverage());

    return this._addDistinctCallable("blockTimeObservable", avgTimeCB, BehaviorSubject, calcAverage());
  }

  close() {
    clearInterval(this.intervalTracker);
    if (this.newBlocksSubscription) this.newBlocksSubscription.unsubscribe();
    this.eventSyncer.close();
    this.intervalTracker = null;
    this.callables = [];
  }
}
