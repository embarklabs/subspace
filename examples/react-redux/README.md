phoenix - react and redux example 
===
Simple application that dispatches a redux action whenever an event is emitted. This app will deploy a test contract to **Ganache**.

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
yarn run start
```

Browse the DApp in [http://localhost:3000](http://localhost:3000)


*Note*: this is a simple example application that does not include error handling for the web3 connection. Be sure `ganache-cli` is running in `localhost:8545` before browsing the dapp.