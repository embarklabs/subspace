const EventSyncer = require('./eventSyncer.js')

const eventSyncer = new EventSyncer(web3);

eventSyncer.init(() => {});

  // eventSyncer.trackEvent('contractEvent', ((x) => x.from === "0x123")).pipe(map(x => x.rating), myscan, mymap).subscribe((v) => {
    // console.dir("current average is " + v)
  // })


// return Event
