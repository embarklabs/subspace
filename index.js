// var Web3 = require('web3')
const Events = require('events')
const events = new Events()

const { Observable, fromEvent, interval, Subject } = require('rxjs');
const { throttle, map, distinctUntilChanged, filter, average, reduce, count, scan} =  require('rxjs/operators');

var loki = require('lokijs')
var db = new loki('loki.json')
var children = db.addCollection('children')
// var result = children.insert({name: 'foo', legs: 8})
// console.dir(result)
// var result2 = children.insert({name: 'bar', legs: 8})
// console.dir(result2)
// console.dir(children.get(result2.$loki))

let contractEvents = [
    { id: 1, from: "0x123", type: "Rating", rating: 3 },
    { id: 2, from: "0x123", type: "Rating", rating: 1 },
    { id: 3, from: "0x234", type: "Rating", rating: 5 },
    { id: 4, from: "0x123", type: "Rating", rating: 4 },
    { id: 5, from: "0x123", type: "Rating", rating: 2 },
    { id: 6, from: "0x342", type: "Rating", rating: 2 }
]

function emitEvents() {
    let i = 0
    // emit contract event each 1 second
    setInterval(() => {
        if (i >= contractEvents.length) return
        events.emit("contractEvent", contractEvents[i])
        i += 1
    }, 1 * 1000)
}

function trackEvent(eventName, filterConditions) {
    let eventKey = eventName + "-from0x123";

    let sub = new Subject();

    for (let previous of children.find({'eventKey': eventKey})) {
        sub.next(previous)
    }

    let contractObserver = fromEvent(events, eventName)
    contractObserver.pipe(filter(filterConditions)).subscribe((e) => {
        console.dir("------- syncing event");
        e.eventKey = eventKey
        console.dir(e);
        children.insert(e)
        sub.next(e)
        // events.emit(eventKey)
        console.dir("-------");
    })

    return sub;
}

let myscan = scan((acc, curr) => {
    acc.push(curr);
    if (acc.length > 4) {
        acc.shift();
    }
    return acc;
}, [])

let mymap = map(arr => arr.reduce((acc, current) => acc + current, 0) / arr.length)

trackEvent('contractEvent', ((x) => x.from === "0x123")).pipe(map(x => x.rating), myscan, mymap).subscribe((v) => {
    console.dir("current value is " + v)
})

emitEvents()