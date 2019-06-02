// var Web3 = require('web3')
const Events = require('events')
const { Observable, fromEvent, interval, Subject } = require('rxjs');
const { throttle, throttleTime, map, distinctUntilChanged, filter, average, reduce, count, scan } = require('rxjs/operators');

const Simulator = require('./simulator.js')
const EventSyncer = require('./eventSyncer.js')


var loki = require('lokijs')
//var db = new loki('loki.json', {autosave: true, autoload: true})

var db = new loki('phoenix.db', {
  autoload: true,
  autoloadCallback: databaseInitialize,
  autosave: true,
  autosaveInterval: 2000 // save every four seconds for our example
})
//db.loadDatabase()

const events = new Events()
const simulator = new Simulator(events);
const eventSyncer = new EventSyncer(db, events);

function databaseInitialize() {
  let children = db.getCollection('children')
  if (!children) {
    children = db.addCollection('children')
    db.saveDatabase()
  }
  let tracked = db.getCollection('tracked')
  if (!tracked) {
    tracked = db.addCollection('tracked')
    db.saveDatabase()
  }
  run()
}

function run() {
  let children = db.getCollection('children')
  let tracked = db.getCollection('tracked')

  process.on('exit', function () {
    db.close()
  });

  let dbChanges = fromEvent(events, "updateDB")

  dbChanges.pipe(throttle(val => interval(400))).subscribe(() => {
    console.dir("saving database...")
    db.saveDatabase()
  })

  let myscan = scan((acc, curr) => {
    acc.push(curr);
    if (acc.length > 4) {
      acc.shift();
    }
    return acc;
  }, [])

  let mymap = map(arr => arr.reduce((acc, current) => acc + current, 0) / arr.length)

  eventSyncer.trackEvent('contractEvent', ((x) => x.from === "0x123")).pipe(map(x => x.rating), myscan, mymap).subscribe((v) => {
    console.dir("current value is " + v)
  })

  simulator.emitEvents()
}