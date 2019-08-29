const Web3Eth = require('web3-eth');

let eth = new Web3Eth("ws://localhost:8545");

async function run() {
  let accounts = await eth.getAccounts();
  

  setTimeout(async () => {
    await eth.sendTransaction({from: accounts[0], to: accounts[1], value: "100000000"});
    await eth.sendTransaction({from: accounts[2], to: accounts[0], value: "999999999"});
    await eth.sendTransaction({from: accounts[2], to: accounts[0], value: "232433434"});
  }, 3000);

  const EventSyncer = require('../src/eventSyncer.js')
  const eventSyncer = new EventSyncer(eth.currentProvider);

  await eventSyncer.init();

  eventSyncer.trackBalance(accounts[0]).pipe().subscribe((balance) => {
    console.log("accounts[0] balance is ", balance);
  })

}

run()
