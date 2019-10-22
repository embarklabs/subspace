import { fromEvent, ReplaySubject } from 'rxjs';
import hash from 'object-hash';

class LogSyncer {
  constructor(web3, events, db) {
    this.events = events;
    this.web3 = web3;
    this.db = db;

    this.subscriptions = [];
  }

  track(options, inputsABI, gteBlockNum, networkId){
    const eventKey = 'logs-' + hash(Object.assign({networkId}, options || {}));
    const filterConditions = Object.assign({fromBlock: 0, toBlock: "latest"}, options || {});

    this.db.deleteNewestBlocks(eventKey, gteBlockNum);

    const eventSummary = this.db.getLastKnownEvent(eventKey);
    const sub = new ReplaySubject();
    const logObserver = fromEvent(this.events, eventKey)

    logObserver.subscribe((e) => {
      if (!e) return;

      const id = hash({eventName: eventKey, blockNumber: e.blockNumber, transactionIndex: e.transactionIndex, logIndex: e.logIndex});

      // TODO: would be nice if this was smart enough to understand the type of returnValues and do the needed conversions
      const eventData = {
        id: hash({eventName: eventKey, blockNumber: e.blockNumber, transactionIndex: e.transactionIndex, logIndex: e.logIndex}),
        data: e.data,
        address: e.address,
        topics: e.topics,
        removed: e.removed
      }

      const obsData = {blockNumber: e.blockNumber, data: e.data, address: e.address, topics: e.topics};

      if(inputsABI){
        eventData.returnValues = web3.eth.abi.decodeLog(inputsABI, e.data, e.topics.slice(1));
        obsData.returnValues = eventData.returnValues;
      }

      // TODO: test reorgs

      sub.next(obsData);

      if(e.removed){
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
                                           filterConditions
                                          );

    const og_subscribe = sub.subscribe;
    sub.subscribe = (next, error, complete) => {
      const s = og_subscribe.apply(sub, [next, error, complete]);
      s.add(() => { // Removing web3js subscription when rxJS unsubscribe is executed
        if (eth_subscribe) eth_subscribe.unsubscribe();
      });
      return s;
    }

    return sub;
  }

  _retrieveEvents(eventKey, firstKnownBlock, lastKnownBlock, filterConditions) {
    // TODO: this should be moved to a 'smart' module
    // it should be able to do events X at the time to avoid slow downs as well as the 10k limit
    if (firstKnownBlock == 0 || (firstKnownBlock > 0 && firstKnownBlock <= filterConditions.fromBlock)) {
      if (filterConditions.toBlock === 'latest') {
        // emit DB Events [fromBlock, lastKnownBlock]
        this._serveDBEvents(eventKey, filterConditions.fromBlock, lastKnownBlock, filterConditions);
        // create a event subscription [lastKnownBlock + 1, ...]
        let filters = Object.assign({}, filterConditions, { fromBlock: filterConditions.fromBlock > lastKnownBlock ? filterConditions.fromBlock : lastKnownBlock + 1 });
        return this._subscribeToEvent(filters, eventKey);
      }
      else if (filterConditions.toBlock <= lastKnownBlock) {
        // emit DB Events [fromBlock, toBlock]
        this._serveDBEvents(eventKey, filterConditions.fromBlock, filterConditions.toBlock, filterConditions);
      }
      else {
        // emit DB Events [fromBlock, lastKnownBlock]
        this._serveDBEvents(eventKey, filterConditions.fromBlock, lastKnownBlock, filterConditions);
        // create a past event subscription [lastKnownBlock + 1, toBlock]
        let filters = Object.assign({}, filterConditions, { fromBlock: filterConditions.fromBlock > lastKnownBlock ? filterConditions.fromBlock : lastKnownBlock + 1 });
        this._getPastEvents(filters, eventKey);
      }
    }
    else if (firstKnownBlock > 0) {
      // create a past event subscription [ firstKnownBlock > fromBlock ? fromBlock : 0, firstKnownBlock - 1]
      let fromBlock = firstKnownBlock > filterConditions.fromBlock ? filterConditions.fromBlock : 0;
      let filters = Object.assign({}, filterConditions, { fromBlock, toBlock: firstKnownBlock - 1 });
      this._getPastEvents(filters, eventKey);
      if (filterConditions.toBlock === 'latest') {
        // emit DB Events [firstKnownBlock, lastKnownBlock]
        this._serveDBEvents(eventKey, firstKnownBlock, lastKnownBlock, filterConditions);
        // create a subscription [lastKnownBlock + 1, ...]
        const filters = Object.assign({}, filterConditions, { fromBlock: lastKnownBlock + 1 });
        return this._subscribeToEvent(filters, eventKey);
      }
      else if (filterConditions.toBlock <= lastKnownBlock) {
        // emit DB Events [fromBlock, toBlock]
        this._serveDBEvents(eventKey, filterConditions.fromBlock, filterConditions.toBlock, filterConditions);
      }
      else {
        // emit DB Events [fromBlock, lastKnownBlock]
        this._serveDBEvents(eventKey, filterConditions.fromBlock, lastKnownBlock, filterConditions);
        // create a past event subscription [lastKnownBlock + 1, toBlock]
        let filters = Object.assign({}, filterConditions, { fromBlock: lastKnownBlock + 1, toBlock: filterConditions.toBlock });
        this._getPastEvents(filters, eventKey);
      }
    }
  }

  _serveDBEvents(eventKey, firstKnownBlock, lastKnownBlock, filterConditions) {
    const cb = this._parseEventCBFactory(filterConditions, eventKey);
    const storedEvents = this.db.getEventsFor(eventKey).filter(x => x.blockNumber >= firstKnownBlock && x.blockNumber <= lastKnownBlock);
    storedEvents.forEach(ev => {
      cb(null, ev);
    });
  }

  _getPastEvents(filterConditions, eventKey) {
    const cb = this._parseEventCBFactory(filterConditions, eventKey);
    this.web3.getPastLogs(options, (err, logs) => {
      if(err) {
        throw new Error(err);
      }

      logs.forEach(l => {
        cb(null, l);
      })
    });
  }

  _subscribeToEvent(filterConditions, eventKey) {
    const s = this.web3.subscribe('logs', filterConditions, this._parseEventCBFactory(filterConditions, eventKey));
    this.subscriptions.push(s);
    return s;
  }

  _parseEventCBFactory = (filterConditions, eventKey) => (err, ev) => {
    if (err) {
      throw new Error(err);
    }

    if (filterConditions) {
      if (filterConditions.address && ev.address.toLowerCase() !== filterConditions.address.toLowerCase()) return;
      if (filterConditions.topics){
        let shouldSkip = false;
        filterConditions.topics.forEach((topic, i) => {
          if (topic != null && (!ev.topics[i] || ev.topics[i].toLowerCase() !== topic.toLowerCase())){
            shouldSkip = true;
          }
        });
        if(shouldSkip) return;
      }
    }

    this.events.emit(eventKey, ev);
  }

  close(){
    this.subscriptions.forEach(x => {
      x.unsubscribe();
    })
  }
}

export default LogSyncer;
