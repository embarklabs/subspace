const { fromEvent, interval, ReplaySubject } = require('rxjs');
const { throttle, distinctUntilChanged } = require('rxjs/operators');
const loki = require('lokijs');

class Database {

  constructor(dbFilename, events, cb) {
    this.db = new loki(dbFilename, {
      autoload: true,
      autoloadCallback: () => {
        this.databaseInitialize(cb)
      },
      autosave: true,
      // LokiJS determines it's running in a browser if process is undefined, yet we need webpack shim for process in a different package.
      // TODO: create a more robust getENV
      env: "BROWSER",
      autosaveInterval: 2000
    })
    this.events = events;
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
      this.db.saveDatabase()
    })

    cb();
  }

  getLastKnownEvent(eventName) {
    let tracked = this.db.getCollection('tracked');
    let lastEvent = tracked.find({ "eventName": eventName })[0];
    if (!lastEvent || lastEvent.length <= 0) {
      tracked.insert({ "eventName": eventName, id: 0 });
      lastEvent = tracked.find({ "eventName": eventName })[0];
    }
    return lastEvent;
  }

  updateEventId(eventName, eventId) {
    let tracked = this.db.getCollection('tracked');
    tracked.updateWhere(((x) => x.eventName === eventName), ((x) => x.id = eventId));
  }

  getEventsFor(eventKey) {
    let children = this.db.getCollection('children');
    return children.find({ 'eventKey': eventKey });
  }

  eventExists(eventId) {
    let children = this.db.getCollection('children');
    return (children.find({ 'id': eventId }).length > 0);
  }

  recordEvent(values) {
    let children = this.db.getCollection('children');
    children.insert(values);
  }

}

module.exports = Database;