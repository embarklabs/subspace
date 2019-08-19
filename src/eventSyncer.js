const { fromEvent, interval, ReplaySubject } = require('rxjs');
const { throttle, filter } = require('rxjs/operators');
const loki = require('lokijs')
const Events = require('events')

function randomString() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

class EventSyncer {

  constructor(web3) {
    // this.events = events;
    this.events = new Events;
    this.web3 = web3;
  }

  init(cb) {
    this.db = new loki('phoenix.db', {
      autoload: true,
      autoloadCallback: () => {
        this.databaseInitialize(cb)
      },
      autosave: true,
      autosaveInterval: 2000 // save every four seconds for our example
    })
  }

  databaseInitialize(cb) {
    let children = this.db.getCollection('children')
    if (!children) {
      children = this.db.addCollection('children')
      this.db.saveDatabase()
    }
    let tracked = this.db.getCollection('tracked')
    if (!tracked) {
      tracked = this.db.addCollection('tracked')
      this.db.saveDatabase()
    }

    let dbChanges = fromEvent(this.events, "updateDB")

    dbChanges.pipe(throttle(val => interval(400))).subscribe(() => {
      console.dir("saving database...")
      this.db.saveDatabase()
    })

    cb();
  }

  // trackEvent(eventName, filterConditions) {
  trackEvent(contractInstance, eventName, filterConditionsOrCb) {
    // let eventKey = eventName + "-from0x123";
    let eventKey = eventName;
    let namespace = randomString()


    let filterConditions, filterConditionsCb;
    if (typeof filterConditionsOrCb === 'function') {
      filterConditionsCb = filterConditionsOrCb
    } else {
      filterConditions = filterConditionsOrCb
    }

    let tracked = this.db.getCollection('tracked')
    let lastEvent = tracked.find({ "eventName": eventName })[0]
    if (!lastEvent || lastEvent.length <= 0) {
      tracked.insert({ "eventName": eventName, id: 0 })
      lastEvent = tracked.find({ "eventName": eventName })[0]
    }

    console.dir("last id was " + lastEvent.id)

    let sub = new ReplaySubject();

    let children = this.db.getCollection('children')
    for (let previous of children.find({ 'eventKey': eventKey })) {
      console.dir("checking previous event: " + previous.id)
      sub.next(previous)
    }

    let contractObserver = fromEvent(this.events, "event-" + eventName + "-" + namespace)

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
        if (propsToFilter.length === 0) {
          return this.events.emit("event-" + eventName + "-" + namespace, event);
        }

        for (let prop of propsToFilter) {
          if (filterConditions.filter[prop] !== event.returnValues[prop]) {
            return;
          }
        }
      } else if (filterConditionsCb) {
        if (!filterConditionsCb(event.returnValues)) {
          return;
        }
      }

      this.events.emit("event-" + eventName + "-" + namespace, event);
    }])

    // contractObserver.pipe(filter((x) => x.id > lastEvent.id)).pipe(filter(filterConditions)).subscribe((e) => {
    contractObserver.pipe().subscribe((e) => {
      console.dir("------- syncing event");
      e.eventKey = eventKey
      // console.dir(e);
      if (children.find({ 'id': e.id }).length > 0) {
        console.dir("event already synced: " + e.id)
      } else {
        // TODO: would be nice if trackEvent was smart enough to understand the type of returnValues and do the needed conversions
        if (e.returnValues['$loki']) { // was already saved / synced
          console.dir("already synced")
          return sub.next(e.returnValues)
        }
        children.insert(e.returnValues)
        tracked.updateWhere(((x) => x.eventName === eventName), ((x) => x.id = e.id))
        this.events.emit("updateDB")
        sub.next(e.returnValues)
      }
    })

    return sub;
  }

  trackProperty(contractInstance, propName, filterConditionsOrCb) {
    // let eventKey = propName + "-from0x123";
    let eventKey = propName;
    let namespace = randomString()

    let filterConditions, filterConditionsCb;
    if (typeof filterConditionsOrCb === 'function') {
      filterConditionsCb = filterConditionsOrCb
    } else {
      filterConditions = filterConditionsOrCb
    }

    let tracked = this.db.getCollection('tracked')

    let sub = new ReplaySubject();

    let children = this.db.getCollection('children')

    // TODO: use call args from user
    let method = contractInstance.methods[propName].apply(contractInstance.methods[propName], [])

    method.call.apply(method.call, [(filterConditions || {}), (err, result) => {
      sub.next(result)
    }])

    var subscription = this.web3.eth.subscribe('newBlockHeaders', function (error, result) {
      method.call.apply(method.call, [(filterConditions || {}), (err, result) => {
        sub.next(result)
      }])
    })

    // TODO: add distinctUntilChanged
    return sub;
  }

}

// process.on('exit', function () {
//   db.close()
// });

module.exports = EventSyncer;