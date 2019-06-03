const { fromEvent, interval, ReplaySubject } = require('rxjs');
const { throttle, filter } = require('rxjs/operators');
const loki = require('lokijs')

class EventSyncer {

  constructor(events) {
    this.events = events;
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

  trackEvent(eventName, filterConditions) {
    let eventKey = eventName + "-from0x123";

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

    let contractObserver = fromEvent(this.events, eventName)
    contractObserver.pipe(filter((x) => x.id > lastEvent.id)).pipe(filter(filterConditions)).subscribe((e) => {
      console.dir("------- syncing event");
      e.eventKey = eventKey
      console.dir(e);
      if (children.find({ 'id': e.id }).length > 0) {
        console.dir("event already synced: " + e.id)
      } else {
        children.insert(e)
        tracked.updateWhere(((x) => x.eventName === eventName), ((x) => x.id = e.id))
        this.events.emit("updateDB")
        sub.next(e)
      }
      console.dir("-------");
    })

    return sub;
  }

}

// process.on('exit', function () {
//   db.close()
// });

module.exports = EventSyncer;