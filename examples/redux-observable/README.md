phoenix - redux-observable example 
===
NodeJS application that uses `redux-observable` to initialize Phoenix, deploy a contract and periodically create a transaction. This app will deploy a test contract to **Ganache**.

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
node -r esm src/index.js 
```

You'll see in the console how the state changes everytime phoenix receives an event, and a new transaction is created every second or so.


*Note*: this is a simple example application that does not include error handling for the web3 connection. Be sure `ganache-cli` is running in `localhost:8545` before browsing the dapp.