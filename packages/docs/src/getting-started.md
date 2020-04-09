---
title: Getting Started
---
# Getting Started

## Installation
**Subspace** can be used in browser, node and native script environments. To get started install the package `@embarklabs/subspace` using `npm` or `yarn` by executing this command in your project directory:
```bash
# Using npm
npm install --save @embarklabs/subspace web3 rxjs

# Using yarn
yarn add @embarklabs/subspace  web3 rxjs
```

<div class="c-notification">
Notice that we also include <code>web3</code> and <code>rxjs</code>. These are required peer dependencies
</div>

## Importing the library

```js
// ESM (might require babel / browserify)
import Subspace from '@embarklabs/subspace';  

// CommonJS
const Subspace = require('@embarklabs/subspace'); 
```


## Connecting to a web3 provider
To interact with the EVM, **Subspace** requires a valid Web3 object, connected to a provider

```js
const subspace = new Subspace(web3);
await subspace.init();
```

In addition to the provider, `Subspace` also accepts an `options` object with settings that can change its behavior:
- `dbFilename` - Name of the database where the information will be stored (default `'subspace.db'`)
- `callInterval` - Interval of time in milliseconds to query a contract/address to determine changes in state or balance. It's only used with HttpProviders (default: `undefined`. Obtains data every block using the average block time as an interval).
- `refreshLastNBlocks` - Ignores last N blocks (from current block), stored in the local db and refresh them via a web3 subscription. Useful for possible reorgs (default: 12),
- `disableSubscriptions` - Subspace by default will attempt to use websocket subscriptions if the current provider supports them, otherwise it will use polling because it asumes the provider is an HttpProvider. This functionality can be disabled by passing true to this option. (default: `undefined`)
- `saveToDb` - `Boolean` (optional): Store events into a local database for faster data retrievals.  (default: `true`)
- `snapshot` - `String` (optional): URL of a `.json` file with a snapshot of the database that can be used to avoid retrieving all the events from scratch the first time the &ETH;app is used.


## Enhancing your contract objects
Subspace provides a method to enhance your web3 Contract objects: `subspace.contract(instance|{abi,address})`. Calling this method will return a new contract object decorated with a `.track()` method for your contract view functions and events.

```js
const myRxContract = subspace.contract(myContractInstance);
```

You can also instantiate a contract directly by passing the contract ABI and its address:

```js
const myRXContract = subspace.contract({abi: ...., address: '0x1234...CDEF'})
```

## Reacting to data
Once it's initialized, you can use **Subspace**'s methods to track the contract state, events and balances. These functions return RxJS Observables which you can subscribe to, and obtain and transform the observed data via operators.

<div class="c-notification">
<h3>What is an Observable?</h3>
The <code>Observable</code> type can be used to model push-based data sources such as DOM events, timer intervals, and sockets. In addition, observables are:
- Compositional: Observables can be composed with higher-order combinators.
- Lazy: Observables do not start emitting data until an observer has subscribed.
</div>

#### Further read
- [RxJS Observables](https://rxjs-dev.firebaseapp.com/guide/observable)

## Tracking state
You can track changes to a contract state variable, by specifying the view function and arguments to call and query the contract. 
```js
const stateObservable$ = Contract.methods.functionName(functionArgs).track();
```

<div class="c-notification">
<h3>Tracking the public variables of a contract</h3>
State variables implicity create a <code>view</code> function when they're defined as <code>public</code>. The <code>functionName</code> would be the same as the variable name, and <code>functionArgs</code> will have a value when the type is a <code>mapping</code> or array (since these require an index value to query them).
</div>

Example:

```js
const productTitle$ = ProductList.methods.products(0).track().map("title");
productTitle$.subscribe((title) => console.log("product title is " + title));


// Alternative using Subspace low level API
const producTitle$ = subspace.trackProperty(ProductList, "products", [0], {from: web3.eth.defaultAccount});
...
```

The subscription will be triggered whenever the title changes

## Tracking events
You can track events and react to their returned values.
```js
const eventObservable$ = Contract.event.eventName.track();
```

Example:

```js
const rating$ = Product.events.Rating.track().map("rating")).pipe(map(x => parseInt(x)));
rating$.subscribe((rating) => console.log("rating received: " + rating));


// Alternative using Subspace low level API
const rating$ = subspace.trackEvent(Product, "Rating", {fromBlock: 0});
...
```

**Event Sourcing**

You can easily do event sourcing with subspace.

For e.g: if you needed to get the average rating of the last 5 events:

```js
import { $average, $latest } from "@embarklabs/subspace";

const rating$ = Product.events.Rating.track().map("rating")).pipe(map(x => parseInt(x)));

rating$.pipe($latest(5), $average()).subscribe((rating) => {
  console.log("average rating of the last 5 events is " + rating)
});
```

## Tracking balances
You can also track changes in both ETH and ERC20 token balances for each mined block or time interval depending on the `callInterval` configured. 

Tracking ETH balance in an address:

```js
const address = "0x0001020304050607080900010203040506070809";

subspace.trackBalance(address).subscribe((balance) => {
  console.log("ETH balance is ", balance)
});
```

Tracking ETH balance in a Contract:

```js
Contract.trackBalance().subscribe((balance) => {
  console.log("ETH balance is ", balance)
});
```

Tracking an ERC20 balance in a Contract:

```js
const tokenAddress = "0x744d70fdbe2ba4cf95131626614a1763df805b9e"; // SNT Address

const myBalanceObservable$ = Contract.trackBalance(tokenAddress);
```

<div class="c-notification c-notification--warning">
Balances are returned as a string containing the value in <strong>wei</strong>.
</div>



## Getting block data, gas prices and block time
Subspace also provides a way to always receive the latest block object: 
```js
subspace.trackBlock().subscribe(block => {
  console.log("The latest block data: ", block);
});
```

If you don't need all the block information, but just the block number, you can use instead:
```js
subspace.trackBlockNumber().subscribe(blockNumber => {
  console.log("The latest block number: ", blockNumber);
});
```

You can also access the average block time. This takes in account only the last 10 blocks:

```js
subspace.trackAverageBlocktime().subscribe(blocktimeMS => {
  console.log("The average block time in milliseconds is: ", blocktimeMS);
});
```

Finally, if you want to obtain the most up to date median gas price:

```js
subspace.trackGasPrice().subscribe(gasPrice => {
  console.log("Gas price in wei", gasPrice);
});
```


## Subscriptions
Once you have an `Observable`, you may receive a stream of data by creating a subscription. Subscriptions are triggered each time an observable emits a new value. These subscription receive a callback that must have a parameter which represents the value received from the observable (a contract state variable, an event, or the balance of an address);  and they return an object representing the subscription.

Subscriptions can be disposed by executing the method `unsubscribe()` liberating the resource held by it:

```js
const myBalanceObservable$ = subspace.trackBalance(address, tokenAddress);
const subscription = myBalanceObservable$.subscribe(value => { 
  console.log("The balance is: ", value); 
});

// ...

subscription.unsubscribe();
```

#### Further read
- [RxJS Subscriptions](https://rxjs-dev.firebaseapp.com/guide/subscription)

## Cleanup
If **Subspace** is not needed anymore, you need can invoke `close()` to dispose and perform the cleanup necessary to remove the internal subscriptions and interval timers created by **Subspace** during its normal execution, thus avoiding any potential memory leak.

```
subspace.close();
```
<div class="c-notification c-notification--warning">
<h3>What about subscriptions created with our observables?</h3>
<code>close()</code> will dispose any web3 subscription created when using a Subspace tracking method, however any subscription to an observable must still be unsubscribed manually. The npm package <code>subsink</code> can be used to clear all the observables' subscriptions at once.
</div>

## Snapshots
A way to speed up the loading of events is to use a snapshot of the database. This is done by providing the option `snapshot` in the `Subspace` constructor. This option should contain a json string containing the database of events used by the application.

The content of the database can be obtained by executing the following function (assuming the DB already has data):

```js
subspace.snapshot();
```

It's also possible to load a snapshot on demand.
```js
await subspace.loadSnapshot(serializedDb);
```

