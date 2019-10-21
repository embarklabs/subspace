
class NullDatabase {

  constructor(_dbFilename, events, cb) {
    this.events = events;
    if (cb) {
      cb();
    }
  }

  databaseInitialize(cb) {
    if (cb) {
      cb();
    }
  }

  getLastKnownEvent() {
    return {
      firstKnownBlock: 0, 
      lastKnownBlock: 0
    };
  }

  getEventsFor(eventKey) {
    return [];
  }

  eventExists(eventKey, eventId) {
    return false;
  }

  recordEvent(eventKey, values) {
  }

  deleteEvent(eventKey, eventId) {
  }

  deleteNewestBlocks(eventKey, gteBlockNum) {
  }

}

export default NullDatabase;
