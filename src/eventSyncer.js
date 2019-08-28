const { fromEvent, interval, ReplaySubject } = require('rxjs');
const { throttle, distinctUntilChanged } = require('rxjs/operators');
const { randomString } = require('./utils.js');
const equal = require('fast-deep-equal');

const Database = require('./database.js');
const Events = require('events');
const Web3Eth = require('web3-eth');

class EventSyncer {

  constructor(provider, dbFilename) {
    this.events = new Events();
    this.web3 = new Web3Eth(provider);
    this.dbFilename = dbFilename || 'phoenix.db';
  }

  init() {
    return new Promise((resolve, reject) => {
      this._db = new Database(this.dbFilename, this.events, resolve);
      this.db = this._db.db;
    })
  }

  // TODO: get contract abi/address instead
  trackEvent(contractInstance, eventName, filterConditionsOrCb) {
    // let eventKey = eventName + "-from0x123";
    let eventKey = eventName;

    let filterConditions, filterConditionsCb;
    if (typeof filterConditionsOrCb === 'function') {
      filterConditionsCb = filterConditionsOrCb
    } else {
      filterConditions = filterConditionsOrCb
    }

    // TODO: should use this to resume events tracking
    // let lastEvent = this._db.getLastKnownEvent(eventName)

    let sub = new ReplaySubject();

    this._db.getEventsFor(eventKey).forEach(sub.next);

    let eventbusKey = "event-" + eventName + "-" + randomString();
    let contractObserver = fromEvent(this.events, eventbusKey)

    // TODO: this should be moved to a 'smart' module
    // for e.g, it should start fromBlock, from the latest known block (which means it should store block info)
    // it should be able to do events X at the time to avoid slow downs as well as the 10k limit
    contractInstance.events[eventName].apply(contractInstance.events[eventName], [(filterConditions || {fromBlock: 0}), (err, event) => {
      if (filterConditions) {
        let propsToFilter = [];
        for (let prop in filterConditions.filter) {
          if (Object.keys(event.returnValues).indexOf(prop) >= 0) {
            propsToFilter.push(prop)
          }
        }
        for (let prop of propsToFilter) {
          if (filterConditions.filter[prop] !== event.returnValues[prop]) return;
        }
      } else if (filterConditionsCb && !filterConditionsCb(event.returnValues)) {
        return;
      }

      this.events.emit(eventbusKey, event);
    }])

    // TODO: would be nice if trackEvent was smart enough to understand the type of returnValues and do the needed conversions
    contractObserver.pipe().subscribe((e) => {
      e.eventKey = eventKey
      if (this._db.eventExists(e.id)) return;
      if (e.returnValues['$loki']) return sub.next(e.returnValues)

      this._db.recordEvent(e.returnValues);
      this._db.updateEventId(eventName, e.id)
      this.events.emit("updateDB")
      sub.next(e.returnValues)
    })

    return sub;
  }

  // TODO: should save value in database
  trackProperty(contractInstance, propName, methodArgs = [], callArgs = {}) {
    let sub = new ReplaySubject();

    let method = contractInstance.methods[propName].apply(contractInstance.methods[propName], methodArgs)
    method.call.apply(method.call, [callArgs, (err, result) => {
      sub.next(result)
    }])

    this.web3.subscribe('newBlockHeaders', (error, result) => {
      method.call.apply(method.call, [callArgs, (err, result) => {
        sub.next(result)
      }])
    })

    return sub.pipe(distinctUntilChanged((a, b) => equal(a, b)));
  }

}

module.exports = EventSyncer;
