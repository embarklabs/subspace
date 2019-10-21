subspace - react example using Embark framework
===
Simple application using a react observable component to receive a stream of emitted events. This app will deploy a test contract to **Ganache**. This example assumes you have Embark installed

## Requirements
- `embark` framework installed. https://embark.status.im
- `ganache-cli`
- `yarn` or `npm` installed.

## Install
In the parent folder, install, build and link the package with `yarn` or `npm`
```
yarn
yarn build:dev
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
