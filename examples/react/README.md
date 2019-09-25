subspace - react example 
===
Simple application using a react observable component to receive a stream of emitted events. This app will deploy a test contract to **Ganache**.

## Requirements
- `ganache-cli`
- `yarn` or `npm` installed.

## Install
In the parent folder, link the package with `yarn` or `npm`
```
yarn link
```
Then in the current folder link `subspace`, and install the packages
```
yarn link subspace
yarn
```

## Usage
In a terminal execute 
```
ganache-cli
```

In a different session, execute
```
yarn run start
```

Browse the DApp in [http://localhost:3000](http://localhost:3000)


*Note*: this is a simple example application that does not include error handling for the web3 connection. Be sure `ganache-cli` is running in `localhost:8545` before browsing the dapp.