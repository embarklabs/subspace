const ganache = require("ganache-core");
const Web3Eth = require('web3-eth');

console.log("The following error is emitted by ganache - https://github.com/trufflesuite/ganache-core/issues/267")
let eth = new Web3Eth(ganache.provider());

async function run() {
  let accounts = await eth.getAccounts();
  
  setTimeout(async () => {
    await eth.sendTransaction({from: accounts[0], to: accounts[1], value: "100000000"});
    await eth.sendTransaction({from: accounts[2], to: accounts[0], value: "999999999"});
    await eth.sendTransaction({from: accounts[2], to: accounts[0], value: "232433434"});
  }, 2000);

  const EventSyncer = require('../dist/node.js');
  const eventSyncer = new EventSyncer(eth.currentProvider);

  await eventSyncer.init();

  eventSyncer.trackBalance(accounts[0]).subscribe((balance) => {
    console.log("accounts[0] balance is ", balance);
  })

}

run()
