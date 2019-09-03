import { fromEvent, interval, ReplaySubject } from 'rxjs';
import { throttle, distinctUntilChanged } from 'rxjs/operators';
import loki from 'lokijs';

const getENV = function () {
  if (typeof global !== 'undefined' && (global.android || global.NSObject)) {
     // If no adapter assume nativescript which needs adapter to be passed manually
     return 'NATIVESCRIPT'; //nativescript
  }

  if (typeof window === 'undefined') {
    return 'NODEJS';
  } 

  // TODO: LokiJS determines it's running in a browser if process is undefined, 
  // yet we need webpack shim for process in a different package.
  // this code ignores is the same getENV from loki except for the check for node webkit

  if (typeof document !== 'undefined') {
    if (document.URL.indexOf('http://') === -1 && document.URL.indexOf('https://') === -1) {
      return 'CORDOVA';
    }
    return 'BROWSER';
  }
 
  return 'CORDOVA';
};



class Database {

  constructor(dbFilename, events, cb) {
    this.db = new loki(dbFilename, {
      autoload: true,
      autoloadCallback: () => {
        this.databaseInitialize(cb)
      },
      autosave: true,
      env: getENV(),
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

export default Database;
