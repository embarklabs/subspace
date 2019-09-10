import { ReplaySubject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import equal from 'fast-deep-equal';
import Database  from './database.js';
import Events from 'events';
import Web3Eth from 'web3-eth';
import stripHexPrefix from 'strip-hex-prefix';
import toBN from 'number-to-bn';
import EventSyncer from './eventSyncer';

export default class Subspace {

  constructor(provider, options = {}) {
    this.events = new Events();
    this.web3 = new Web3Eth(provider);

    this.options = {};
    this.options.callInterval = options.callInterval || 0;
    this.options.dbFilename = options.dbFilename || 'phoenix.db';
    
    this.newBlocksSubscription = null;
    this.intervalTracker = null;
    this.callables = [];
  }

  init() {
    return new Promise((resolve, reject) => {
      this._db = new Database(this.options.dbFilename, this.events, resolve);
      this.db = this._db.db;
      this.eventSyncer = new EventSyncer(this.web3, this.events, this._db);

    })
  }

  // TODO: get contract abi/address instead
  trackEvent(contractInstance, eventName, filterConditionsOrCb) {
    return this.eventSyncer.track(contractInstance, eventName, filterConditionsOrCb);
  }

  _initNewBlocksSubscription() {
    if(this.newBlocksSubscription != null || this.options.callInterval !== 0) return;

    this.newBlocksSubscription = this.web3.subscribe('newBlockHeaders', (err, result) => {
      if(err) {
        sub.error(err);
        return;
      }
      
      this.callables.forEach(fn => {
        fn();
      });
    });
  }

  _initCallInterval() {
    if(this.intervalTracker != null || this.options.callInterval === 0) return;

    this.intervalTracker = setInterval(() => {
      this.callables.forEach(fn => {
        fn();
      });
    }, this.options.callInterval);

  }

  // TODO: should save value in database?
  trackProperty(contractInstance, propName, methodArgs = [], callArgs = {}) {
    const sub = new ReplaySubject();

    const method = contractInstance.methods[propName].apply(contractInstance.methods[propName], methodArgs)
    const callContractMethod = () => {
      method.call.apply(method.call, [callArgs, (err, result) => {
        if(err) {
          sub.error(err);
          return;
        }
        sub.next(result);
      }]);
    };
    
    callContractMethod();

    this._initNewBlocksSubscription();
    this._initCallInterval();
    
    this.callables.push(callContractMethod);

    return sub.pipe(distinctUntilChanged((a, b) => equal(a, b)));
  }

  // TODO: should save value in database?
  trackBalance(address, erc20Address) {
    const sub = new ReplaySubject();

    // TODO: validate address?

    let callFn;
    if(!erc20Address){
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
        const data = "0x70a08231" + "000000000000000000000000" + stripHexPrefix(erc20Address); 
        fn.apply(fn, [{to: erc20Address, data}, (err, result) => {
          if(err) {
            sub.error(err);
            return;
          }
          sub.next(toBN(result).toString(10));
        }]);
      };
    }

    callFn();

    this._initNewBlocksSubscription();
    this._initCallInterval();
    
    this.callables.push(callFn);

    return sub.pipe(distinctUntilChanged((a, b) => equal(a, b)));
  }

  close(){
    clearInterval(this.intervalTracker);
    if(this.newBlocksSubscription) this.newBlocksSubscription.unsubscribe();
    this.eventSyncer.close();
    this.intervalTracker = null;
    this.callables = [];
  }

}