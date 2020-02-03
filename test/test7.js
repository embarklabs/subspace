const Web3Eth = require('web3-eth');
const Subspace = require('../dist/index.js').default;

let eth = new Web3Eth("wss://mainnet.infura.io/ws/v3/_____________");

async function run() { 
  const subspace = new Subspace(eth.currentProvider);
  await subspace.init()

  // Testing single block with a event
  subspace.trackLogs({address: "0x744d70fdbe2ba4cf95131626614a1763df805b9e", topics: ["0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925", "0x00000000000000000000000068f47e166e1aa7d6529e021feff86eada87aaee3", null]}).subscribe((v) => {
    console.log(v);
  });

}

run()