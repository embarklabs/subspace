subspcae - redux example 
===
Simple application that shows how to dispatch a redux action from an observable. This app will deploy a test contract to **Ganache**.
For using Subspace with `react` and `redux`, please check `examples/react-redux` to see a practical example

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
node -r esm src/index.js 
```

You'll see in the console how the state changes everytime Subspace receives an event.


*Note*: this is a simple example application that does not include error handling for the web3 connection. Be sure `ganache-cli` is running in `localhost:8545` before executing the dapp.