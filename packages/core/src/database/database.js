import {fromEvent} from "rxjs";
import Loki from "lokijs";

const getENV = function() {
  if (typeof global !== "undefined" && (global.android || global.NSObject)) {
    // If no adapter assume nativescript which needs adapter to be passed manually
    return "NATIVESCRIPT"; //nativescript
  }

  if (typeof window === "undefined") {
    return "NODEJS";
  }

  // TODO: LokiJS determines it's running in a browser if process is undefined,
  // yet we need webpack shim for process in a different package.
  // this code ignores is the same getENV from loki except for the check for node webkit

  if (typeof document !== "undefined") {
    if (document.URL.indexOf("http://") === -1 && document.URL.indexOf("https://") === -1) {
      return "CORDOVA";
    }
    return "BROWSER";
  }

  return "CORDOVA";
};

class Database {
  constructor(dbFilename, events, cb) {
    this.db = new Loki(dbFilename, {
      autoload: true,
      autoloadCallback: () => {
        this.databaseInitialize();
      },
      autosave: true,
      env: getENV(),
      autosaveInterval: 2000
    });

    this.events = events;
  }

  databaseInitialize(cb) {
    fromEvent(this.events, "updateDB").subscribe(({eventKey, eventData}) => {
      if (eventData.removed) {
        this.deleteEvent(eventKey, eventData.id);
        return;
      }

      if (this.eventExists(eventKey, eventData.id)) return;

      this.recordEvent(eventKey, eventData);

      this.db.saveDatabase();
    });
  }

  serialize() {
    return this.db.serialize();
  }

  restore(serializedDb, forced) {
    return new Promise((resolve, reject) => {
      const collections = this.db.listCollections();
      if (!collections?.length || forced) {
        this.db.loadJSON(serializedDb);
        this.db.saveDatabase(err => {
          if(err) {
            reject(err);
          }
          resolve();
        });
      }
    });
  }

  getLastKnownEvent(eventKey) {
    const collection = this.db.getCollection(eventKey);
    if (collection?.count()) {
      return collection.max("blockNumber");
    } else {
      this.db.addCollection(eventKey);
    }
    return 0;
  }

  getFirstKnownEvent(eventKey) {
    const collection = this.db.getCollection(eventKey);
    if (collection?.count()) {
      return collection.min("blockNumber");
    } else {
      this.db.addCollection(eventKey);
    }
    return 0;
  }

  getEventsFor(eventKey) {
    let children = this.db.getCollection(eventKey);
    return children ? children.find() : [];
  }

  eventExists(eventKey, eventId) {
    let collection = this.db.getCollection(eventKey);
    if (!collection) {
      this.db.addCollection(eventKey);
      return false;
    }

    return collection.find({id: eventId}).length > 0;
  }

  recordEvent(eventKey, values) {
    let children = this.db.getCollection(eventKey);
    children.insert(values);
  }

  deleteEvent(eventKey, eventId) {
    const collection = this.db.getCollection(eventKey);
    if (collection)
      collection
        .chain()
        .find({id: eventId})
        .remove();
  }

  deleteNewestBlocks(eventKey, gteBlockNum) {
    if (gteBlockNum <= 0) return;

    const collection = this.db.getCollection(eventKey);
    if (collection)
      collection
        .chain()
        .find({blockNumber: {$gte: gteBlockNum}})
        .remove();
  }
}

export default Database;
