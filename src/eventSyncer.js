import { fromEvent, ReplaySubject } from 'rxjs';
import hash from 'object-hash';
import HttpEventScanner from './httpEventScanner';
import WsEventScanner from './wsEventScanner';

class EventSyncer {

  constructor(web3, events, db, isWebsocketProvider) {
    this.events = events;
    this.web3 = web3;
    this.db = db;
    this.isWebsocketProvider = isWebsocketProvider;
    this.eventScanner = isWebsocketProvider ? new WsEventScanner(web3) : new HttpEventScanner(web3);
  }

  track(contractInstance, eventName, filters, gteBlockNum, networkId) {
    const eventKey =  hash(Object.assign({address: contractInstance.options.address, networkId}, (filters || {})));

    this.db.deleteNewestBlocks(eventKey, gteBlockNum);

    let filterConditions = Object.assign({fromBlock: 0, toBlock: "latest"}, filters || {});
    let lastKnownBlock = this.db.getLastKnownEvent(eventKey);
    let firstKnownBlock = this.db.getFirstKnownEvent(eventKey);


    let sub = new ReplaySubject();
    let contractObserver = fromEvent(this.events, eventKey)

    contractObserver.subscribe((e) => {
      if (!e) {
        sub.complete();
        return;
      }

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


    const fnDBEvents = this.serveDBEvents(eventKey);
    const fnPastEvents = this.getPastEvents(eventKey, contractInstance, eventName, filters);

    if(this.isWebsocketProvider){
      const fnSubscribe = this.subscribeToEvent(eventKey, contractInstance, eventName);
      const eth_subscribe = this.eventScanner.scan(fnDBEvents, fnPastEvents, fnSubscribe, firstKnownBlock, lastKnownBlock, filterConditions);

      const og_subscribe = sub.subscribe;
      sub.subscribe = async (next, error, complete) => {
        const s = og_subscribe.apply(sub, [next, error, complete]);
        s.add(() => { // Removing web3js subscription when rxJS unsubscribe is executed
          eth_subscribe.then(susc => {
            if(susc) {
              susc.unsubscribe();
            }
          });
        });
        return s;
      }
    } else {
      this.eventScanner.scan(fnDBEvents, fnPastEvents, lastKnownBlock, filterConditions);
    }

    return sub;
  }

  getPastEvents = (eventKey, contractInstance, eventName, filters) => async (fromBlock, toBlock, hardLimit) => { 
    let events = await contractInstance.getPastEvents(eventName, { ...filters, fromBlock, toBlock });  
    const cb = this.callbackFactory(filters, eventKey);
    
    events.forEach(ev => cb(null, ev));

    if(hardLimit && toBlock === hardLimit){ // Complete the observable
      this.events.emit(eventKey);
    }
  }

  serveDBEvents = eventKey => (filters, toBlock, fromBlock = null) => {
    const cb = this.callbackFactory(filters, eventKey);
    const storedEvents = this.db.getEventsFor(eventKey).filter(x => x.blockNumber >= (fromBlock || filters.fromBlock) && x.blockNumber <= toBlock);
    storedEvents.forEach(ev => {
      cb(null, ev);
    });
  }

  subscribeToEvent = (eventKey, contractInstance, eventName) => (subscriptions, filters) => {
    const cb = this.callbackFactory(filters, eventKey);
    const s = contractInstance.events[eventName](filters, cb);
    subscriptions.push(s);
    return s;
  }

  callbackFactory = (filterConditions, eventKey) => (err, ev) => {
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
    this.eventScanner.close();
  }
}

export default EventSyncer;
