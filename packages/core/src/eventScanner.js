import {sleep} from "./utils";

class EventScanner {
  constructor(web3, isWebsocketProvider) {
    this.pollExecution = [];
    this.subscriptions = [];
    this.web3 = web3;
    this.isWebsocketProvider = isWebsocketProvider;
  }

  async poll(execId, fn, timeout) {
    const shouldStop = await fn();
    if (!this.pollExecution[execId] || shouldStop) return;
    if (timeout) await sleep(timeout * 1000);
    await this.poll(execId, fn, timeout);
  }

  async scan(serveDBEvents, getPastEvents, subscribe, lastCachedBlock, filterConditions) {
    const execId = this.pollExecution.push(true) - 1;
    const maxBlockRange = 500000; // TODO: extract to config
    const lastBlockNumberAtLoad = await this.web3.getBlockNumber();

    
    // If there's a toBlock with a number
    let toBlockFilter = 0;
    if (filterConditions.toBlock && filterConditions.toBlock !== "latest") {
      toBlockFilter = filterConditions.toBlock;
    }
    const toBlockInPast = toBlockFilter && toBlockFilter < lastBlockNumberAtLoad;
    

    // Events from the DB
    let shouldStop = serveDBEvents(toBlockFilter, lastCachedBlock);
    if(shouldStop) return;


    // Get old events and store them in db
    lastCachedBlock = Math.max(lastCachedBlock + 1, filterConditions.fromBlock || 0);
    await this.poll(execId, async () => {
      try {
        const maxBlock = Math.min(lastCachedBlock + maxBlockRange, lastBlockNumberAtLoad);
        const toBlock = toBlockInPast ? Math.min(maxBlock, toBlockFilter) : maxBlock;
        const toBlockLimit = Math.min(await this.web3.getBlockNumber(), toBlock);
        if (toBlockLimit >= lastCachedBlock) {
          shouldStop = await getPastEvents(lastCachedBlock, toBlockLimit, toBlockInPast ? toBlockFilter : null);
          lastCachedBlock = toBlockLimit + 1;
        }
      } catch (e) {
        console.log(e.toString());
      }

      // Should exit?
      return (
        shouldStop ||
        (toBlockInPast && lastCachedBlock >= toBlockFilter) ||
        lastCachedBlock > Math.max(lastBlockNumberAtLoad, toBlockInPast ? toBlockFilter || 0 : 0)
      );
    });

    if(shouldStop) return;
    if (toBlockInPast) return;


    // Subscriptions
    if(this.isWebsocketProvider){
      let filters = Object.assign({}, filterConditions, {
        fromBlock: lastCachedBlock,
        toBlock: "latest" // TODO: use a proper toBlock depending if the toBlock is in the future and !== "latest"
      });
      return subscribe(this.subscriptions, filters);
    } else {
      // Get new data, with a timeout between requests
      await this.poll(
        execId,
        async () => {
          try {
            let toBlockLimit = await this.web3.getBlockNumber();
            if (toBlockLimit >= lastCachedBlock) {
              await getPastEvents(lastCachedBlock, toBlockLimit, toBlockFilter);
              lastCachedBlock = toBlockLimit + 1;
            }
          } catch (e) {
            console.log(e.toString());
          }

          // Should exit?
          return (
            filterConditions.toBlock !== "latest" && lastCachedBlock > Math.max(lastBlockNumberAtLoad, toBlockFilter)
          );
        },
        1
      );
    }
  }

  close() {
    this.pollExecution = Array(this.pollExecution.length).fill(false);
    this.subscriptions.forEach(x => x.unsubscribe());
  }
}

export default EventScanner;
