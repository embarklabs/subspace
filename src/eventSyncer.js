import { fromEvent, ReplaySubject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import equal from 'fast-deep-equal';
import hash from 'object-hash';
import Database  from './database.js';
import Events from 'events';
import Web3Eth from 'web3-eth';
import stripHexPrefix from 'strip-hex-prefix';
import toBN from 'number-to-bn';

export default class EventSyncer {

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
    })
  }

  // TODO: get contract abi/address instead
  trackEvent(contractInstance, eventName, filterConditionsOrCb) {
    let eventKey = eventName + '-' + hash(filterConditionsOrCb);

    let filterConditions = {fromBlock: 0, toBlock: "latest"};
    let filterConditionsCb;
    if (typeof filterConditionsOrCb === 'function') {
      filterConditionsCb = filterConditionsOrCb;
    } else {
      filterConditions = Object.assign(filterConditions, filterConditionsOrCb || {});
    }
    
    let eventSummary = this._db.getLastKnownEvent(eventKey);

    let sub = new ReplaySubject();
    let contractObserver = fromEvent(this.events, eventKey)

    contractObserver.subscribe((e) => {
      if(!e) return;
      
      // TODO: would be nice if trackEvent was smart enough to understand the type of returnValues and do the needed conversions

      const eventData = {
        id: hash({eventName, blockNumber: e.blockNumber, transactionIndex: e.transactionIndex, logIndex: e.logIndex}),
        returnValues: {...e.returnValues},
        blockNumber: e.blockNumber, 
        transactionIndex: e.transactionIndex, 
        logIndex: e.logIndex
      }

      sub.next({blockNumber: e.blockNumber, ...e.returnValues});

      if (this._db.eventExists(eventKey, eventData.id)) return;

      this._db.recordEvent(eventKey, eventData);

      this.events.emit("updateDB");
    });

    this._retrieveEvents(eventKey, 
                         eventSummary.firstKnownBlock,
                         eventSummary.lastKnownBlock,
                         filterConditions,
                         filterConditionsCb,
                         contractInstance,
                         eventName);

    return sub;
  }


  _retrieveEvents(eventKey, firstKnownBlock, lastKnownBlock, filterConditions, filterConditionsCb, contractInstance, eventName) {
    // TODO: this should be moved to a 'smart' module
    // it should be able to do events X at the time to avoid slow downs as well as the 10k limit
    // TODO: filter subscriptions with fromBlock and toBlock

    if (firstKnownBlock == 0 || (firstKnownBlock > 0 && firstKnownBlock <= filterConditions.fromBlock)) {
      if (filterConditions.toBlock === 'latest') {
        // emit DB Events [fromBlock, lastKnownBlock]
        this._serveDBEvents(eventKey, filterConditions.fromBlock, lastKnownBlock, filterConditions, filterConditionsCb);
        // create a event subscription [lastKnownBlock + 1, ...] 
        let filters = Object.assign({}, filterConditions, { fromBlock: filterConditions.fromBlock > lastKnownBlock ? filterConditions.fromBlock : lastKnownBlock + 1 });
        this._subscribeToEvent(contractInstance.events[eventName], filters, filterConditionsCb, eventKey);
      }
      else if (filterConditions.toBlock <= lastKnownBlock) {
        // emit DB Events [fromBlock, toBlock]
        this._serveDBEvents(eventKey, filterConditions.fromBlock, filterConditions.toBlock, filterConditions, filterConditionsCb);
      }
      else {
        // emit DB Events [fromBlock, lastKnownBlock]
        this._serveDBEvents(eventKey, filterConditions.fromBlock, lastKnownBlock, filterConditions, filterConditionsCb);
        // create a past event subscription [lastKnownBlock + 1, toBlock]
        let filters = Object.assign({}, filterConditions, { fromBlock: filterConditions.fromBlock > lastKnownBlock ? filterConditions.fromBlock : lastKnownBlock + 1 });
        this._getPastEvents(contractInstance, eventName, filters, filterConditionsCb, eventKey);
      }
    }
    else if (firstKnownBlock > 0) {
      // create a past event subscription [ firstKnownBlock > fromBlock ? fromBlock : 0, firstKnownBlock - 1]
      let fromBlock = firstKnownBlock > filterConditions.fromBlock ? filterConditions.fromBlock : 0;
      let filters = Object.assign({}, filterConditions, { fromBlock, toBlock: firstKnownBlock - 1 });
      this._getPastEvents(contractInstance, eventName, filters, filterConditionsCb, eventKey);
      if (filterConditions.toBlock === 'latest') {
        // emit DB Events [firstKnownBlock, lastKnownBlock]
        this._serveDBEvents(eventKey, firstKnownBlock, lastKnownBlock, filterConditions, filterConditionsCb);
        // create a subscription [lastKnownBlock + 1, ...]
        const filters = Object.assign({}, filterConditions, { fromBlock: lastKnownBlock + 1 });
        this._subscribeToEvent(contractInstance.events[eventName], filters, filterConditionsCb, eventKey);
      }
      else if (filterConditions.toBlock <= lastKnownBlock) {
        // emit DB Events [fromBlock, toBlock]
        this._serveDBEvents(eventKey, filterConditions.fromBlock, filterConditions.toBlock, filterConditions, filterConditionsCb);
      }
      else {
        // emit DB Events [fromBlock, lastKnownBlock]
        this._serveDBEvents(eventKey, filterConditions.fromBlock, lastKnownBlock, filterConditions, filterConditionsCb);
        // create a past event subscription [lastKnownBlock + 1, toBlock]
        let filters = Object.assign({}, filterConditions, { fromBlock: lastKnownBlock + 1, toBlock: filterConditions.toBlock });
        this._getPastEvents(contractInstance, eventName, filters, filterConditionsCb, eventKey);
      }
    }
  }

  _serveDBEvents(eventKey, firstKnownBlock, lastKnownBlock, filterConditions, filterConditionsCb) {
    const cb = this._parseEventCBFactory(filterConditions, filterConditionsCb, eventKey);
    const storedEvents = this._db.getEventsFor(eventKey).filter(x => x.blockNumber >= firstKnownBlock && x.blockNumber <= lastKnownBlock);
    storedEvents.forEach(ev => {
      cb(null, ev);
    });
  }

  _getPastEvents(contract, eventName, filterConditions, filterConditionsCb, eventKey) {
    const cb = this._parseEventCBFactory(filterConditions, filterConditionsCb, eventKey);
    contract.getPastEvents.apply(contract, [eventName, filterConditions, (err, events) => {
        events.forEach(ev => {
          cb(err, ev);
        });
    } ]);
  }

  _subscribeToEvent(event, filterConditions, filterConditionsCb, eventKey) {
    event.apply(event, [filterConditions, this._parseEventCBFactory(filterConditions, filterConditionsCb, eventKey) ]);
  }


  _parseEventCBFactory = (filterConditions, filterConditionsCb, eventKey) => (err, ev) => {
    if(err) return;

    if (filterConditions) {
      let propsToFilter = [];
      for (let prop in filterConditions.filter) {
        if (Object.keys(ev.returnValues).indexOf(prop) >= 0) {
          propsToFilter.push(prop);
        }
      }
      for (let prop of propsToFilter) {
        if (filterConditions.filter[prop] !== ev.returnValues[prop])
          return;
      }
    }
    else if (filterConditionsCb && !filterConditionsCb(ev.returnValues)) {
      return;
    }

    this.events.emit(eventKey, ev);
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

  clean(){
    clearInterval(this.intervalTracker);
    this.newBlocksSubscription.unsubscribe();
    this.intervalTracker = null;
    this.callables = [];
  }

}