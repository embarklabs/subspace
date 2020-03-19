# API

## General

### `new Subspace(web3Provider [, options])`
Constructor. 

**Parameters**
1. `web3Provider` - `Object`: a valid web3 provider.
2. `options` - `Object` (optional): Options used to initialize Subspace
	- `dbFilename` - `String` (optional): Name of the database where the information will be stored (default `'subspace.db'`)
	- `callInterval` - `Number` (optional): - Interval of time in milliseconds to poll a contract/address to determine changes in state or balance (default: `undefined`. Obtains data every block. If using a HttpProvider, the default is: `1000`)
    - `refreshLastNBlocks` - Ignores last N blocks (from current block), stored in the local db and refresh them via a web3 subscription. Useful for possible reorgs (default: 12),
    - `disableSubscriptions` - Subspace by default will attempt to use websocket subscriptions if the current provider supports them, otherwise it will use polling because it asumes the provider is an HttpProvider. This functionality can be disabled by passing true to this option. (default: undefined)


### `init()`
Initializes **Subspace**

**Returns**
`Promise` that once it's resolved, will mean that **Subspace** is available to use

### `close()`
Dispose and perform the cleanup necessary to remove the internal subscriptions and interval timers created by **Subspace** during its normal execution.

### `contract(instance|{abi,address})`
Adds a `track` method to the web3 contract objects. You can obtain this functionality by passing a `web3.eth.Contract` instance, or the `abi` and `address` of your contract

**Returns**
`web3.eth.Contract` object enhanced with `.track()` functions for methods and events.

## Contract methods

### `myContract.events.MyEvent.track([options])`
Track a contract event.

**Parameters**
1. `options` - `Object` (optional): web3 filter options object to limit the number of events based on a block number range, or indexed filters
    - `filter` - `Object` (optional): Lets you filter events by indexed parameters, e.g. `{filter: {myNumber: [12,13]}}` means all events where `"myNumber"` is `12` or `13`.
    - `fromBlock` - `Number` (optional): The block number from which to get events on.
    - `toBlock` - `Number` (optional): The block number to get events up to (Defaults to `"latest"`)
    - `topics` - `Array` (optional): This allows you to manually set the topics for the event filter. If given the filter property and event signature, (`topic[0]`) will not be set automatically.

**Returns**
`RxJS Observable` which will stream the event `returnValues`.


### `myContract.methods.myMethod([param1[, ...]]).track([callOptions])`
Track a constant function / contract state variable on each block mined, or depending on the `callInterval` option used during **Subspace** initialization.

**Parameters**
1. `callOptions` - `Object` (optional): The options used for calling.
    - `from` - `String` (optional): The address the call “transaction” should be made from.
    - `gasPrice` - `String` (optional): The gas price in wei to use for this call “transaction”.
    - `gas` - `Number` (optional): The maximum gas provided for this call “transaction” (gas limit).

**Returns**
`RxJS Observable` which will stream the function / variable values. Data type will depend on the contract function invoked. 


### `myContract.trackBalance(address [, tokenAddress])`
Track a contract's balance changes for an address on each block mined, or depending on the `callInterval` option used during **Subspace** initialization.

**Parameters**
1. `address` - `String`: The address to get the balance of.
2. `tokenAddress` - `String` (optional): If you want to track the balance for an ERC20 contract, here you can specify the token address. Otherwise, Only ETH balances will be returned.

**Returns**
`RxJS Observable` which will stream a string containing the address balance.


## Blocks, gas price and block time

### `trackBlock()`
Receive the block information for any new block. It's the reactive equivalent to `web3.eth.getBlock("latest")`.

**Returns**
`RxJS Observable` which will stream a block object for the latest block received

### `trackBlockNumber()`
Returns the latest block number. It's the reactive equivalent to `web3.eth.getBlockNumber`.

**Returns**
`RxJS Observable` with the latest block number

### `trackGasPrice()`
Returns the current gas price oracle. It's the reactive equivalent to `web3.eth.getGasPrice`.

**Returns**
`RxJS Observable` with the average gas price in wei.

### `trackAverageBlocktime()`
Average block time of the last 10 blocks.

**Returns**
`RxJS Observable` with the moving average block time of the last 10 blocks. The time is returned in milliseconds:


## Low level API for data tracking

These are used in case you don't want to decorate your web3 contract objects, or if you want to track the balance for an specific address.

### `trackEvent(contractObject, eventName [, options])`
Track a contract event.

**Parameters**
1. `contractObject` - `web3.eth.Contract`: An already initialized contract object pointing to an address and containing a valid ABI.
2. `eventName` - `String`: The name of the event to subscribe.
3. `options` - `Object` (optional): web3 filter options object to limit the number of events based on a block number range, or indexed filters
    - `filter` - `Object` (optional): Lets you filter events by indexed parameters, e.g. `{filter: {myNumber: [12,13]}}` means all events where `"myNumber"` is `12` or `13`.
    - `fromBlock` - `Number` (optional): The block number from which to get events on.
    - `toBlock` - `Number` (optional): The block number to get events up to (Defaults to `"latest"`)
    - `topics` - `Array` (optional): This allows you to manually set the topics for the event filter. If given the filter property and event signature, (`topic[0]`) will not be set automatically.

**Returns**
`RxJS Observable` which will stream the event `returnValues`.

### `trackProperty(contractObject, functionName [, functionArgs] [, callOptions])`
Track a constant function / contract state variable on each block mined, or depending on the `callInterval` option used during **Subspace** initialization.

**Parameters**
1. `contractObject` - `web3.eth.Contract`: An already initialized contract object pointing to an address and containing a valid ABI.
2. `functionName` - `String`: Name of the function or variable whose values will be tracked.
3. `functionArgs` - `Array` (optional): Array of arguments that the tracked function receives
4. `callOptions` - `Object` (optional): The options used for calling.
    - `from` - `String` (optional): The address the call “transaction” should be made from.
    - `gasPrice` - `String` (optional): The gas price in wei to use for this call “transaction”.
    - `gas` - `Number` (optional): The maximum gas provided for this call “transaction” (gas limit).

**Returns**
`RxJS Observable` which will stream the function / variable values. Data type will depend on the contract function invoked. 

### `trackBalance(address [, tokenAddress])`
Track balance changes for an address on each block mined, or depending on the `callInterval` option used during **Subspace** initialization.

**Parameters**
1. `address` - `String`: The address to get the balance of.
2. `tokenAddress` - `String` (optional): If you want to track the balance for an ERC20 contract, here you can specify the token address. Otherwise, Only ETH balances will be returned.

**Returns**
`RxJS Observable` which will stream a string containing the address balance.

### `trackLogs(options [, abi])`
Tracks incoming logs, filtered by the given options.

**Parameters**
1. `options` - `Object` (optional): web3 filter options object to limit the number of logs
    - `address` - `String|Array` (optional): An address or a list of addresses to only get logs from particular account(s).
    - `fromBlock` - `Number` (optional): The block number from which to get events on.
    - `topics` - `Array` (optional): An array of values which must each appear in the log entries. The order is important, if you want to leave topics out use null, e.g. [null, '0x00...']. You can also pass another array for each topic with options for that topic e.g. [null, ['option1', 'option2']].
2. `abi` - `Array` (optional): Array containing the ABI for the inputs of the logs received. It will automatically decode the logs using this ABI instead of returning the hexadecimal data.

**Returns**
`RxJS Observable` which will stream the logs. If the inputs ABI is included in the call, the logs will be automatically decoded.