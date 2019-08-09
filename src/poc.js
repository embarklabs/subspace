// var Web3 = require('web3')
const Events = require('events')
const { map, scan } = require('rxjs/operators');

const Simulator = require('./simulator.js')
const EventSyncer = require('./eventSyncer.js')

const events = new Events()
const eventSyncer = new EventSyncer(events);

eventSyncer.init(run);

function run() {
  let myscan = scan((acc, curr) => {
    acc.push(curr);
    if (acc.length > 4) {
      acc.shift();
    }
    return acc;
  }, [])

  let mymap = map(arr => arr.reduce((acc, current) => acc + current, 0) / arr.length)

  eventSyncer.trackEvent('contractEvent', ((x) => x.from === "0x123")).pipe(map(x => x.rating), myscan, mymap).subscribe((v) => {
    console.dir("current average is " + v)
  })

  const simulator = new Simulator(events);
  simulator.emitEvents()
}