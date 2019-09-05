phoenix - redux example 
===
Simple application that shows how to dispatch a redux action from an observable. This app will deploy a test contract to **Ganache**.
For using Phoenix with `react` and `redux`, please check `examples/react-redux` to see a practical example

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

You'll see in the console how the state changes everytime phoenix receives an event.


*Note*: this is a simple example application that does not include error handling for the web3 connection. Be sure `ganache-cli` is running in `localhost:8545` before browsing the dapp.