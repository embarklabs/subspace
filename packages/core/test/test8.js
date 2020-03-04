const Web3Eth = require('web3-eth');
const Subspace = require('../dist/index.js').default;

let eth = new Web3Eth("https://mainnet.infura.io/v3/562ba55287324547adbdd59b1dabc869");

async function run() {
  const subspace = new Subspace(eth.currentProvider);
  await subspace.init()

  subspace.trackBlockNumber().subscribe((v) => console.log("Blocknumber", v));
  subspace.trackGasPrice().subscribe((v) => console.log("GasPrice", v));
  subspace.trackBlock().subscribe((v) => {
    console.log("V", v);
    console.log("Block.difficulty", v.difficulty);
  });
  subspace.trackAverageBlocktime().subscribe((v) => console.log("Blocktime", v));
}

run()