import {sleep} from './utils'

class HttpEventScanner {
  constructor(web3){
    this.pollExecution = [];
    this.web3 = web3;
  }

  async poll(execId, fn, timeout){
    const shouldStop = await fn();
    if(!this.pollExecution[execId] || shouldStop) return;
    if(timeout) await sleep(timeout * 1000);
    await this.poll(execId, fn, timeout);
  }

  async scan(serveDBEvents, getPastEvents, lastCachedBlock, filterConditions) {
    const execId = this.pollExecution.push(true) - 1;
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
      serveDBEvents(filterConditions, dbLimit);
      lastCachedBlock = lastCachedBlock + 1;
    }
    
    lastCachedBlock = Math.max(lastCachedBlock, filterConditions.fromBlock||0);

    // Get old events and store them in db
    await this.poll(execId, async () => {
      try {
        const maxBlock = Math.min(lastCachedBlock + maxBlockRange, lastBlockNumberAtLoad);
        const toBlock = toBlockInPast ? Math.min(maxBlock, toBlockFilter) : maxBlock;
        const toBlockLimit = Math.min(await this.web3.getBlockNumber(), toBlock);  

        if(toBlockLimit >= lastCachedBlock) {  
          await getPastEvents(lastCachedBlock, toBlockLimit, toBlockInPast ? toBlockFilter : null);  
          lastCachedBlock = toBlockLimit + 1;  
        }
      } catch (e) {  
        console.log(e.toString());  
      } 

      // Should exit?
      return (toBlockInPast && lastCachedBlock >= (toBlockFilter || 0)) || (lastCachedBlock > Math.max(lastBlockNumberAtLoad, toBlockInPast ? toBlockFilter || 0 : 0));
     });

    if(toBlockInPast) return;

    // Get new data, with a timeout between requests
    await this.poll(execId, async () => {
      try {
        let toBlockLimit = await this.web3.getBlockNumber()
        if(toBlockLimit >= lastCachedBlock) {  
          await getPastEvents(lastCachedBlock, toBlockLimit, toBlockFilter || 0);  
          lastCachedBlock = toBlockLimit + 1;  
        }
      } catch (e) {  
        console.log(e.toString());  
      } 

      // Should exit?
      return filterConditions.toBlock !== 'latest' && lastCachedBlock > Math.max(lastBlockNumberAtLoad, toBlockFilter || 0);
    }, 1);
    
  }

  close(){
    this.pollExecution = Array(this.pollExecution.length).fill(false);
  }
}

export default HttpEventScanner;
