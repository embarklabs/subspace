phoenix - reactive-graphql example 
===
Simple application that shows how to use graphql queries with Phoenix observables

## Requirements
- `ganache-cli`
- `yarn` or `npm` installed.

## Install
In the parent folder, link the package with `yarn` or `npm`
```
yarn link
```
Then in the current folder link `phoenix`, and install the packages
```
yarn link phoenix
yarn
```

## Usage
In a terminal execute 
```
ganache-cli
```

In a different session, execute
```
node src/index.js 
```

You'll see in the console the result of the graphql query


*Note*: this is a simple example application that does not include error handling for the web3 connection. Be sure `ganache-cli` is running in `localhost:8545` before executing the dapp.