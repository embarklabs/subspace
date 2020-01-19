class WsEventScanner {
  constructor(web3) {
    this.web3 = web3;
    this.subscriptions = [];
  }

  async scan(serveDBEvents, getPastEvents, subscribe, firstKnownBlock, lastKnownBlock, filterConditions) {
    const lastBlockNumberAtLoad = await this.web3.getBlockNumber();

    // If there's a toBlock with a number
    let toBlockFilter = 0;
    if(filterConditions.toBlock && filterConditions.toBlock !== 'latest' ){
      toBlockFilter = filterConditions.toBlock;
    }
    const toBlockInPast =  toBlockFilter && toBlockFilter < lastBlockNumberAtLoad;
    const hardLimit = toBlockInPast ? toBlockFilter : null;
    
    if (firstKnownBlock == 0 || (firstKnownBlock > 0 && firstKnownBlock <= filterConditions.fromBlock)) {
      if (filterConditions.toBlock === 'latest') {
        // emit DB Events [fromBlock, lastKnownBlock]
        serveDBEvents(filterConditions, lastKnownBlock);
        // create a event subscription [lastKnownBlock + 1, ...] 
        let filters = Object.assign({}, filterConditions, { fromBlock: filterConditions.fromBlock > lastKnownBlock ? filterConditions.fromBlock : lastKnownBlock + 1 });
        return subscribe(this.subscriptions, filters);
      }
      else if (filterConditions.toBlock <= lastKnownBlock) {
        // emit DB Events [fromBlock, toBlock]
        serveDBEvents(filterConditions, filterConditions.toBlock);
      }
      else {
        // emit DB Events [fromBlock, lastKnownBlock]
        serveDBEvents(filterConditions, lastKnownBlock);
        // get past events [lastKnownBlock + 1, toBlock]
        const fromBlock = filterConditions.fromBlock > lastKnownBlock ? filterConditions.fromBlock : lastKnownBlock + 1;
        await getPastEvents(fromBlock, filterConditions.toBlock, hardLimit);  
      }
    }
    else if (firstKnownBlock > 0) {
      // get past events [ firstKnownBlock > fromBlock ? fromBlock : 0, firstKnownBlock - 1]
      const fromBlock = firstKnownBlock > filterConditions.fromBlock ? filterConditions.fromBlock : 0;
      await getPastEvents(fromBlock, firstKnownBlock - 1, hardLimit);  

      if (filterConditions.toBlock === 'latest') {
        // emit DB Events [firstKnownBlock, lastKnownBlock]
        serveDBEvents(filterConditions, lastKnownBlock, firstKnownBlock);
        // create a subscription [lastKnownBlock + 1, ...]
        const filters = Object.assign({}, filterConditions, { fromBlock: lastKnownBlock + 1 });
        return subscribe(this.subscriptions, filters);
      }
      else if (filterConditions.toBlock <= lastKnownBlock) {
        // emit DB Events [fromBlock, toBlock]
        serveDBEvents(filterConditions, filterConditions.toBlock);
      }
      else {
        // emit DB Events [fromBlock, lastKnownBlock]
        serveDBEvents(filterConditions, lastKnownBlock);
        // get past events [lastKnownBlock + 1, toBlock]
        await getPastEvents(lastKnownBlock + 1, filterConditions.toBlock, hardLimit);  
      }
    }
  }

  close(){
    this.subscriptions.forEach(x => x.unsubscribe());
  }
}

export default WsEventScanner;
