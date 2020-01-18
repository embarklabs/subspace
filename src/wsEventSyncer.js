import { fromEvent, ReplaySubject } from 'rxjs';
import hash from 'object-hash';

class EventSyncer {

  constructor(web3, events, db) {
    this.events = events;
    this.web3 = web3;
    this.db = db;
    this.subscriptions = [];
  }

  track(contractInstance, eventName, filterConditionsOrCb, gteBlockNum, networkId) {
    const isFilterFunction = typeof filterConditionsOrCb === 'function';
    const eventKey =  hash(Object.assign({address: contractInstance.options.address, networkId}, (isFilterFunction ? {filterConditionsOrCb} : (filterConditionsOrCb || {}))));

    this.db.deleteNewestBlocks(eventKey, gteBlockNum);

    let filterConditions = {fromBlock: 0, toBlock: "latest"};
    let filterConditionsCb;
    if (isFilterFunction) {
      filterConditionsCb = filterConditionsOrCb;
    } else {
      filterConditions = Object.assign(filterConditions, filterConditionsOrCb || {});
    }

    let eventSummary = this.db.getLastKnownEvent(eventKey);

    let sub = new ReplaySubject();
    let contractObserver = fromEvent(this.events, eventKey)

    contractObserver.subscribe((e) => {
      if (!e) return;

      const id = hash({eventName, blockNumber: e.blockNumber, transactionIndex: e.transactionIndex, logIndex: e.logIndex});

      // TODO: would be nice if this was smart enough to understand the type of returnValues and do the needed conversions
      const eventData = {
        id,
        returnValues: {...e.returnValues},
        blockNumber: e.blockNumber, 
        transactionIndex: e.transactionIndex, 
        logIndex: e.logIndex,
        removed: e.removed
      }

      // TODO: test reorgs

      sub.next({blockNumber: e.blockNumber, ...e.returnValues});	

      if (e.removed){
        this.db.deleteEvent(eventKey, id);
        return;
      }

      if (this.db.eventExists(eventKey, eventData.id)) return;

      this.db.recordEvent(eventKey, eventData);

      this.events.emit("updateDB");
    });

    const eth_subscribe = this._retrieveEvents(eventKey, 
      eventSummary.firstKnownBlock,
      eventSummary.lastKnownBlock,
      filterConditions,
      filterConditionsCb,
      contractInstance,
      eventName);

    const og_subscribe = sub.subscribe;
    sub.subscribe = (next, error, complete) => {
      const s = og_subscribe.apply(sub, [next, error, complete]);
      s.add(() => { // Removing web3js subscription when rxJS unsubscribe is executed
        if(eth_subscribe) eth_subscribe.unsubscribe();
      });
      return s;
    }

    return sub;
  }

  _retrieveEvents(eventKey, firstKnownBlock, lastKnownBlock, filterConditions, filterConditionsCb, contractInstance, eventName) {
    // TODO: this should be moved to a 'smart' module
    // it should be able to do events X at the time to avoid slow downs as well as the 10k limit

    if (firstKnownBlock == 0 || (firstKnownBlock > 0 && firstKnownBlock <= filterConditions.fromBlock)) {
      if (filterConditions.toBlock === 'latest') {
        // emit DB Events [fromBlock, lastKnownBlock]
        this._serveDBEvents(eventKey, filterConditions.fromBlock, lastKnownBlock, filterConditions, filterConditionsCb);
        // create a event subscription [lastKnownBlock + 1, ...] 
        let filters = Object.assign({}, filterConditions, { fromBlock: filterConditions.fromBlock > lastKnownBlock ? filterConditions.fromBlock : lastKnownBlock + 1 });
        return this._subscribeToEvent(contractInstance.events[eventName], filters, filterConditionsCb, eventKey);
      }
      else if (filterConditions.toBlock <= lastKnownBlock) {
        // emit DB Events [fromBlock, toBlock]
        this._serveDBEvents(eventKey, filterConditions.fromBlock, filterConditions.toBlock, filterConditions, filterConditionsCb);
      }
      else {
        // emit DB Events [fromBlock, lastKnownBlock]
        this._serveDBEvents(eventKey, filterConditions.fromBlock, lastKnownBlock, filterConditions, filterConditionsCb);
        // create a past event subscription [lastKnownBlock + 1, toBlock]
        let filters = Object.assign({}, filterConditions, { fromBlock: filterConditions.fromBlock > lastKnownBlock ? filterConditions.fromBlock : lastKnownBlock + 1 });
        this._getPastEvents(contractInstance, eventName, filters, filterConditionsCb, eventKey);
      }
    }
    else if (firstKnownBlock > 0) {
      // create a past event subscription [ firstKnownBlock > fromBlock ? fromBlock : 0, firstKnownBlock - 1]
      let fromBlock = firstKnownBlock > filterConditions.fromBlock ? filterConditions.fromBlock : 0;
      let filters = Object.assign({}, filterConditions, { fromBlock, toBlock: firstKnownBlock - 1 });
      this._getPastEvents(contractInstance, eventName, filters, filterConditionsCb, eventKey);
      if (filterConditions.toBlock === 'latest') {
        // emit DB Events [firstKnownBlock, lastKnownBlock]
        this._serveDBEvents(eventKey, firstKnownBlock, lastKnownBlock, filterConditions, filterConditionsCb);
        // create a subscription [lastKnownBlock + 1, ...]
        const filters = Object.assign({}, filterConditions, { fromBlock: lastKnownBlock + 1 });
        return this._subscribeToEvent(contractInstance.events[eventName], filters, filterConditionsCb, eventKey);
      }
      else if (filterConditions.toBlock <= lastKnownBlock) {
        // emit DB Events [fromBlock, toBlock]
        this._serveDBEvents(eventKey, filterConditions.fromBlock, filterConditions.toBlock, filterConditions, filterConditionsCb);
      }
      else {
        // emit DB Events [fromBlock, lastKnownBlock]
        this._serveDBEvents(eventKey, filterConditions.fromBlock, lastKnownBlock, filterConditions, filterConditionsCb);
        // create a past event subscription [lastKnownBlock + 1, toBlock]
        let filters = Object.assign({}, filterConditions, { fromBlock: lastKnownBlock + 1, toBlock: filterConditions.toBlock });
        this._getPastEvents(contractInstance, eventName, filters, filterConditionsCb, eventKey);
      }
    }
  }

  _serveDBEvents(eventKey, firstKnownBlock, lastKnownBlock, filterConditions, filterConditionsCb) {
    const cb = this._parseEventCBFactory(filterConditions, filterConditionsCb, eventKey);
    const storedEvents = this.db.getEventsFor(eventKey).filter(x => x.blockNumber >= firstKnownBlock && x.blockNumber <= lastKnownBlock);
    storedEvents.forEach(ev => {
      cb(null, ev);
    });
  }

  _getPastEvents(contract, eventName, filterConditions, filterConditionsCb, eventKey) {
    const cb = this._parseEventCBFactory(filterConditions, filterConditionsCb, eventKey);
    contract.getPastEvents.apply(contract, [eventName, filterConditions, (err, events) => {
      events.forEach(ev => {
        cb(err, ev);
      });
    }]);
  }

  _subscribeToEvent(event, filterConditions, filterConditionsCb, eventKey) {
    const s = event.apply(event, [filterConditions, this._parseEventCBFactory(filterConditions, filterConditionsCb, eventKey) ]);
    this.subscriptions.push(s);
    return s;
  }

  _parseEventCBFactory = (filterConditions, filterConditionsCb, eventKey) => (err, ev) => {
    if (err) {
      console.error(err);
      return;
    }

    if (filterConditions) {
      let propsToFilter = [];
      for (let prop in filterConditions.filter) {
        if (Object.keys(ev.returnValues).indexOf(prop) >= 0) {
          propsToFilter.push(prop);
        }
      }
      for (let prop of propsToFilter) {
        if (filterConditions.filter[prop] !== ev.returnValues[prop]) return;
      }
    }
    else if (filterConditionsCb && !filterConditionsCb(ev.returnValues)) {
      return;
    }
    this.events.emit(eventKey, ev);
  }

  close(){
    this.subscriptions.forEach(x => {
      x.unsubscribe();
    })
  }
}

export default EventSyncer;