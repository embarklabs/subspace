import { fromEvent } from 'rxjs';
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

    let dbChanges = fromEvent(this.events, "updateDB")
    dbChanges.subscribe(() => {
      this.db.saveDatabase()
    })

    cb();
  }

  getLastKnownEvent(eventKey) {
    const collection = this.db.getCollection(eventKey);

    let firstKnownBlock = 0;
    let lastKnownBlock = 0;

    if(collection && collection.count()){
      firstKnownBlock = collection.min('blockNumber');
      lastKnownBlock = collection.max('blockNumber'); 
    } else {
      this.db.addCollection(eventKey);
    }
    
    return {
      firstKnownBlock, 
      lastKnownBlock
    };
  }


  getEventsFor(eventKey) {
    let children = this.db.getCollection(eventKey);
    return children.find();
  }

  eventExists(eventKey, eventId) {
    let children = this.db.getCollection(eventKey);
    return (children.find({ 'id': eventId }).length > 0);
  }

  recordEvent(eventKey, values) {
    let children = this.db.getCollection(eventKey);
    children.insert(values);
  }

}

export default Database;
