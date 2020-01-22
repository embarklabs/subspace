import { ReplaySubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import equal from 'fast-deep-equal';
import Database  from './database/database.js';
import NullDatabase  from './database/nullDatabase.js';
import Events from 'events';
import Web3Eth from 'web3-eth';
import {isAddress} from './utils';
import stripHexPrefix from 'strip-hex-prefix';
import {hexToDec} from 'hex2dec';
import EventSyncer from './eventSyncer';
import LogSyncer from './logSyncer';

export default class Subspace {

  constructor(provider, options = {}) {
    if (!!provider.on) {
      // https://github.com/ethereum/web3.js/blob/1.x/packages/web3-core-subscriptions/src/subscription.js#L205
      console.warn("subspace: the current provider doesn't support subscriptions. Falling back to http polling");
    }

    this.events = new Events();
    this.web3 = new Web3Eth(provider);

    this.options = {};
    this.options.refreshLastNBlocks = options.refreshLastNBlocks || 12;
    this.options.callInterval = options.callInterval || 0;
    this.options.dbFilename = options.dbFilename || 'subspace.db';
    this.latestBlockNumber = undefined;
    this.disableDatabase = options.disableDatabase;
    this.networkId = undefined;
    this.isWebsocketProvider = options.disableSubscriptions ? false : !!provider.on;

    this.newBlocksSubscription = null;
    this.intervalTracker = null;
    this.callables = [];
  }

  init() {
    return new Promise((resolve, reject) => {
      if (this.disableDatabase === true) {
        this._db = new NullDatabase("", this.events);
      } else {
        this._db = new Database(this.options.dbFilename, this.events);
      }
      this.eventSyncer = new EventSyncer(this.web3, this.events, this._db, this.isWebsocketProvider);
      this.logSyncer = new LogSyncer(this.web3, this.events, this._db);

      this.web3.net.getId().then(netId => {
        this.networkId = netId;
      });

      this.web3.getBlock('latest').then(block => {
        this.latestBlockNumber = block.number;

        if(this.isWebsocketProvider){
          this._initNewBlocksSubscription();
        } else {
          this.options.callInterval = this.options.callInterval || 1000;
          this._initCallInterval();
        }

        resolve();
      })
    })
  }

  contract(contractInstance) {
    if (!contractInstance) {
      throw new Error("please pass a contract instance to Subspace.contract()")
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
    }

    Object.keys(SubspaceContract.events).forEach(ev => {
      if(!SubspaceContract.options.jsonInterface.find(x => x.type === 'event' && x.name == ev)) return;
      SubspaceContract.events[ev].track = (filterConditionsOrCb) => this.trackEvent(SubspaceContract, ev, filterConditionsOrCb);
    });

    SubspaceContract.trackProperty = (propName, methodArgs, callArgs) => {
      return this.trackProperty(SubspaceContract, propName, methodArgs, callArgs);
    }

    Object.keys(SubspaceContract.methods).forEach(methodName => {
      const oldFunc = SubspaceContract.methods[methodName];

      const _this = this;
      const newFunc = function(){
        const txObject = oldFunc.apply(null, arguments);
        txObject.track = (callArgs) => _this.trackProperty(SubspaceContract, methodName, txObject.arguments, callArgs);
        return txObject;
      }

      SubspaceContract.methods[methodName] = newFunc;
    });

    SubspaceContract.trackBalance = (erc20Address) => {
      return this.trackBalance(SubspaceContract.options.address, erc20Address);
    }

    return SubspaceContract;
  }

  // TODO: get contract abi/address instead
  trackEvent(contractInstance, eventName, filterConditionsOrCb) {
    let deleteFrom = this.latestBlockNumber - this.options.refreshLastNBlocks;
    let returnSub = this.eventSyncer.track(contractInstance, eventName, filterConditionsOrCb, deleteFrom, this.networkId);

    returnSub.map = (prop) => {
      return returnSub.pipe(map((x) => {
        if (typeof(prop) === "string") {
          return x[prop];
        }
        if (Array.isArray(prop)) {
          let newValues = {}
          prop.forEach((p) => {
            newValues[p] = x[p]
          })
          return newValues
        }
      }))
    }

    return returnSub;
  }

  clearDB(collection) {
    if (collection){
      // TODO: delete specific collection
    } else {
      // TODO: delete everything
    }
  }

  trackLogs(options, inputsABI) {
    if(!this.isWebsocketProvider) console.warn("This method only works with websockets");
    return this.logSyncer.track(options, inputsABI, this.latestBlockNumber - this.options.refreshLastNBlocks, this.networkId);
  }

  _initNewBlocksSubscription() {
    if (this.newBlocksSubscription != null || this.options.callInterval !== 0) return;
   
    this.newBlocksSubscription = this.web3.subscribe('newBlockHeaders', (err, result) => {
      if (err) {
        console.error(err);
        return;
      }

      this.callables.forEach(fn => {
        fn();
      });
    });
  }

  _initCallInterval() {
    if (this.intervalTracker != null || this.options.callInterval === 0) return;

    this.intervalTracker = setInterval(() => {
      this.callables.forEach(fn => {
        fn();
      });
    }, this.options.callInterval);
  }

  // TODO: should save value in database?
  trackProperty(contractInstance, propName, methodArgs = [], callArgs = {}) {
    const sub = new ReplaySubject();

    if (!Array.isArray(methodArgs)) {
      methodArgs = [methodArgs]
    }

    const method = contractInstance.methods[propName].apply(contractInstance.methods[propName], methodArgs)
    const callContractMethod = () => {
      method.call.apply(method.call, [callArgs, (err, result) => {
        if (err) {
          sub.error(err);
          return;
        }
        sub.next(result);
      }]);
    };

    callContractMethod();

    this.callables.push(callContractMethod);

    let returnSub = sub.pipe(distinctUntilChanged((a, b) => equal(a, b)));

    returnSub.map = (prop) => {
      return returnSub.pipe(map((x) => {
        if (typeof(prop) === "string") {
          return x[prop];
        }
        if (Array.isArray(prop)) {
          let newValues = {}
          prop.forEach((p) => {
            newValues[p] = x[p]
          })
          return newValues
        }
      }))
    }

    return returnSub;
  }

  trackBalance(address, erc20Address) {
    const sub = new ReplaySubject();

    if (!isAddress(address)) throw "invalid address"
    if (erc20Address && !isAddress(erc20Address)) throw "invalid ERC20 contract address"

    let callFn;
    if (!erc20Address){
      callFn = () => {
        const fn  = this.web3.getBalance;

        fn.apply(fn, [address, (err, balance) => {
          if(err) {
            sub.error(err);
            return;
          }
          sub.next(balance);
        }]);
      };
    } else {
      callFn = () => {
        const fn  = this.web3.call;
                  //  balanceOf
        const data = "0x70a08231" + "000000000000000000000000" + stripHexPrefix(address); 
        fn.apply(fn, [{to: erc20Address, data}, (err, result) => {
          if (err) {
            sub.error(err);
            return;
          }
          sub.next(hexToDec(result));
        }]);
      };
    }

    // FIX ME: has issues immediatly getting the value
    // this.web3.getBlock('latest').then(block => {
    setTimeout(() => {
      callFn();
    }, 500);
    // });

    this.callables.push(callFn);

    return sub.pipe(distinctUntilChanged((a, b) => equal(a, b)));
  }

  close(){
    clearInterval(this.intervalTracker);
    if (this.newBlocksSubscription) this.newBlocksSubscription.unsubscribe();
    this.eventSyncer.close();
    this.intervalTracker = null;
    this.callables = [];
  }

}