import { fromEvent, ReplaySubject } from 'rxjs';
import hash from 'object-hash';
import {sleep} from './utils'


class EventSyncer {

  constructor(web3, events, db) {
    this.events = events;
    this.web3 = web3;
    this.db = db;
    this.pollExecution = [];
  }

  async poll(execId, fn, timeout){
    const shouldStop = await fn();
    if(!this.pollExecution[execId] || shouldStop) return;
    if(timeout) await sleep(timeout * 1000);
    await this.poll(execId, fn, timeout);
  }

  track(contractInstance, eventName, filters, gteBlockNum, networkId) {
    const eventKey =  hash(Object.assign({address: contractInstance.options.address, networkId}, (filters || {})));

    this.db.deleteNewestBlocks(eventKey, gteBlockNum);

    let filterConditions = Object.assign({fromBlock: 0, toBlock: "latest"}, filters || {});
    let lastKnownBlock = this.db.getLastKnownEvent(eventKey);

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

    this.scan(this.pollExecution.push(true) - 1, eventKey, lastKnownBlock, filterConditions, contractInstance, eventName);

    return sub;
  }

  async getPastEvents(eventKey, contractInstance, eventName, filters, fromBlock, toBlock, hardLimit) { 
    let events = await contractInstance.getPastEvents(eventName, { ...filters, fromBlock, toBlock });  
    const cb = this._parseEventCBFactory(filters, eventKey);
    events.forEach(ev => { 
      cb(null, ev);
    });

    if(hardLimit && toBlock === hardLimit){
      console.log("TODO: end observer");
    }
  }

  async scan(execId, eventKey, lastCachedBlock, filterConditions, contractInstance, eventName) {
    const maxBlockRange = 500000; // TODO: extract to config
    const lastBlockNumberAtLoad = await this.web3.getBlockNumber();

    // If there's a toBlock with a number
    let toBlockFilter = 0;
    if(filterConditions.toBlock && filterConditions.toBlock !== 'latest' ){
      toBlockFilter = filterConditions.toBlock;
    }
    const toBlockInPast =  toBlockFilter && toBlockFilter < lastBlockNumberAtLoad;

    // Determine if data already exists and return it.
    let dbLimit = toBlockFilter > 0 ? Math.min(toBlockFilter, lastCachedBlock) : lastCachedBlock;
    if(lastCachedBlock > 0 && filterConditions.fromBlock >= 0){
      this._serveDBEvents(eventKey, filterConditions.fromBlock, dbLimit, filterConditions);
      lastCachedBlock = lastCachedBlock + 1;
    }
    
    lastCachedBlock = Math.max(lastCachedBlock, filterConditions.fromBlock||0);

    // Get old events and store them in db
    await this.poll(execId, async () => {
      try {
        const maxBlock = Math.min(lastCachedBlock + maxBlockRange, lastBlockNumberAtLoad);
        const toBlock = toBlockInPast ? Math.min(maxBlock, toBlockFilter) : maxBlock;
        const toBlockLimit = Math.min(await this.web3.getBlockNumber(), toBlock);  

        if(toBlockLimit > lastCachedBlock) {  
          await this.getPastEvents(eventKey, contractInstance, eventName, filterConditions, lastCachedBlock, toBlockLimit, toBlockInPast ? toBlockFilter || 0 : 0);  
          lastCachedBlock = toBlockLimit + 1;  
        }
      } catch (e) {  
        console.log(e.toString());  
      } 

      // Should exit?
      return lastCachedBlock > Math.max(lastBlockNumberAtLoad, toBlockInPast ? toBlockFilter || 0 : 0);
     });

    if(toBlockInPast) return;

    // Get new data, with a timeout between requests
    await this.poll(execId, async () => {
      try {
        let toBlockLimit = await this.web3.getBlockNumber()
        if(toBlockLimit >= lastCachedBlock) {  
          console.log("Getting new data")
          await this.getPastEvents(eventKey, contractInstance, eventName, filterConditions, lastCachedBlock, toBlockLimit, toBlockFilter || 0);  
          lastCachedBlock = toBlockLimit + 1;  
        }
      } catch (e) {  
        console.log(e.toString());  
      } 

      // Should exit?
      return filterConditions.toBlock !== 'latest' && lastCachedBlock > Math.max(lastBlockNumberAtLoad, toBlockFilter || 0);
    }, 1);
  }

  _serveDBEvents(eventKey, fromBlock, toBlock, filterConditions) {
    const cb = this._parseEventCBFactory(filterConditions, eventKey);
    const storedEvents = this.db.getEventsFor(eventKey).filter(x => x.blockNumber >= fromBlock && x.blockNumber <= toBlock);
    storedEvents.forEach(ev => {
      cb(null, ev);
    });
  }

  _parseEventCBFactory = (filterConditions, eventKey) => (err, ev) => {
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

    this.events.emit(eventKey, ev);
  }

  close(){
    this.pollExecution = Array(this.pollExecution.length).fill(false);
  }
}

export default EventSyncer;
