![Subspace](https://raw.githubusercontent.com/status-im/subspace/master/logo.png?token=AABLEUFLVJ24SL7R6JIRXVS5T2MFI)
===

## Overview
Subspace is a framework agnostic JS library that embraces reactive programming with RxJS, by observing asynchronous changes in Smart Contracts, and providing methods to track and subscribe to events, changes to the state of contracts and address balances, and react to these changes and events via observables.

Subspace also takes care of syncing under the hood, saving & loading the state in a local database.

### Install
Subspace can be used in browser, node and native script environments. You can install it through `npm` or `yarn`:
```
npm install --save @embarklabs/subspace web3 rxjs # RxJS and Web3.js are needed peer-dependencies
```

### Documentation
https://subspace.embarklabs.io

## Contribution
Thank you for considering to help out with the source code! We welcome contributions from anyone on the internet, and are grateful for even the smallest of fixes!

If you'd like to contribute to Subspace, please fork, fix, commit and send a pull request for the maintainers to review and merge into the main code base. If you wish to submit more complex changes though, please check up with the core devs first on #embark-status channel to ensure those changes are in line with the general philosophy of the project and/or get some early feedback which can make both your efforts much lighter as well as our review and merge procedures quick and simple.

### To build:

* `yarn`
* `yarn bootstrap`

## License
MIT
