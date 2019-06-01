// var Web3 = require('web3')
const Events = require('events')
const events = new Events()

const { Observable, fromEvent, interval, Subject } = require('rxjs');
const { throttle, throttleTime, map, distinctUntilChanged, filter, average, reduce, count, scan} =  require('rxjs/operators');

var loki = require('lokijs')
//var db = new loki('loki.json', {autosave: true, autoload: true})

var db = new loki('phoenix.db', {
	autoload: true,
	autoloadCallback : databaseInitialize,
	autosave: true, 
	autosaveInterval: 2000 // save every four seconds for our example
})
//db.loadDatabase()

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

    let dbChanges = fromEvent(events, "updateDB")

    dbChanges.pipe(throttle(val => interval(400))).subscribe(() => {
        console.dir("saving database...")
        db.saveDatabase()
    })

    function trackEvent(eventName, filterConditions) {
        let eventKey = eventName + "-from0x123";

        let lastEvent = tracked.find({"eventName": eventName})[0]
        if (!lastEvent || lastEvent.length <= 0) {
            tracked.insert({"eventName": eventName, id: 0})
            lastEvent = tracked.find({"eventName": eventName})[0]
        }

        console.dir("last id was " + lastEvent.id)

        let sub = new Subject();

        for (let previous of children.find({ 'eventKey': eventKey })) {
            console.dir("checking previous event: " + previous.id)
            sub.next(previous)
        }

        let contractObserver = fromEvent(events, eventName)
        contractObserver.pipe(filter((x) => x.id > lastEvent.id)).pipe(filter(filterConditions)).subscribe((e) => {
            console.dir("------- syncing event");
            e.eventKey = eventKey
            console.dir(e);
            if (children.find({ 'id': e.id }).length > 0) {
                console.dir("event already synced: " + e.id)
            } else {
                children.insert(e)
                tracked.updateWhere(((x) => x.eventName === eventName), ((x) => x.id = e.id))
                events.emit("updateDB")
                sub.next(e)
            }
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

}