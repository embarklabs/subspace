const { Observable, fromEvent, interval, Subject, ReplaySubject } = require('rxjs');
const { throttle, throttleTime, map, distinctUntilChanged, filter, average, reduce, count, scan } = require('rxjs/operators');

class EventSyncer {

  constructor(db, events) {
    this.db = db;
    this.events = events;
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

    console.dir("after")

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

module.exports = EventSyncer;