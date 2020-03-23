import {Observable} from "rxjs";
import hash from "object-hash";
import EventScanner from "./eventScanner";

class EventSyncer {
  constructor(web3, events, db, isWebsocketProvider) {
    this.events = events;
    this.web3 = web3;
    this.db = db;

    this.isWebsocketProvider = isWebsocketProvider;
    this.eventScanner = new EventScanner(web3, isWebsocketProvider);
  }

  track(contractInstance, eventName, filters, gteBlockNum, networkId) {
    const eventKey = hash(Object.assign({address: contractInstance.options.address, networkId}, filters ?? {}));

    this.db.deleteNewestBlocks(eventKey, gteBlockNum);

    let filterConditions = Object.assign({fromBlock: 0, toBlock: "latest"}, filters ?? {});
    let lastKnownBlock = this.db.getLastKnownEvent(eventKey);

    const observable = new Observable(subscriber => {
      const cb = this.callbackFactory(subscriber, filters, eventKey, eventName);
      const fnDBEvents = this.serveDBEvents(cb, eventKey, !filterConditions.saveToDb);
      const fnPastEvents = this.getPastEvents(cb, eventKey, contractInstance, eventName, filters);
      const fnSubscribe = this.isWebsocketProvider ? this.subscribeToEvent(cb, contractInstance, eventName) : null;

      const ethSubscription = this.eventScanner.scan(
        fnDBEvents,
        fnPastEvents,
        fnSubscribe,
        lastKnownBlock,
        filterConditions
      );

      return () => {
        if (ethSubscription) {
          ethSubscription.then(s => {
            if (s) {
              s.unsubscribe();
            }
          });
        }
      };
    });

    return observable;
  }

  getPastEvents = (cb, eventKey, contractInstance, eventName, filters) => async (fromBlock, toBlock, hardLimit) => {
    let events = await contractInstance.getPastEvents(eventName, {...filters, fromBlock, toBlock});
    events.forEach(ev => cb(null, ev));
    if (hardLimit && toBlock === hardLimit) {
      cb(null, null, true); // Complete observable
      return true;
    }
    return false;
  };

  serveDBEvents = (cb, eventKey, fromDB) => (toBlock, lastCachedBlock) => {
    if(!fromDB) return false; 

    const events = this.db.getEventsFor(eventKey);
    events.forEach(ev => cb(null, ev));

    if(toBlock > 0 && lastCachedBlock >= toBlock) {
      cb(null, null, true); // Complete observable
      return true;
    }

    return false;
  };

  subscribeToEvent = (cb, contractInstance, eventName) => (subscriptions, filters) => {
    const s = contractInstance.events[eventName](filters, (err, event) => cb(err, event));
    subscriptions.push(s);
    // TODO: Complete observable if necessary
    return s;
  };

  callbackFactory = (subscriber, filterConditions, eventKey, eventName) => (err, event, complete = false) => {
    if (complete) {
      subscriber.complete();
      return;
    }

    if (err) {
      console.error(err);
      return;
    }

    if (filterConditions) {
      let propsToFilter = [];
      for (let prop in filterConditions.filter) {
        if (Object.keys(event.returnValues).indexOf(prop) >= 0) {
          propsToFilter.push(prop);
        }
      }
      for (let prop of propsToFilter) {
        if (filterConditions.filter[prop] !== event.returnValues[prop]) return;
      }
    }

    const eventData = {
      id: hash({
        eventName,
        blockNumber: event.blockNumber,
        transactionIndex: event.transactionIndex,
        logIndex: event.logIndex
      }),
      returnValues: {...event.returnValues},
      blockNumber: event.blockNumber,
      transactionIndex: event.transactionIndex,
      logIndex: event.logIndex,
      removed: event.removed
    };

    subscriber.next(eventData.returnValues);

    if (filterConditions && !!filterConditions.saveToDb) {
      this.events.emit("updateDB", {eventKey, eventData});
    }
  };

  close() {
    this.eventScanner.close();
  }
}

export default EventSyncer;
