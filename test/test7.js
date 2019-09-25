const Web3Eth = require('web3-eth');

let eth = new Web3Eth("wss://mainnet.infura.io/ws/v3/e62b6ada19b042ee9c6d68746b965ccf");

async function run() {
  let accounts = await eth.getAccounts();
  
  const EventSyncer = require('../dist/node.js');
  const eventSyncer = new EventSyncer(eth.currentProvider);

  await eventSyncer.init()

  // Testing single block with a event
  eventSyncer.trackLogs({address: "0x744d70fdbe2ba4cf95131626614a1763df805b9e", topics: ["0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925", "0x00000000000000000000000068f47e153e1aa7d6529e078feff86eada87ddee3", null]}).subscribe((v) => {
    console.log(v);
  });

}

run()