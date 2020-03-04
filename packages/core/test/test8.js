const Web3 = require('web3');
const Subspace = require('../dist/index.js').default;

let web3 = new Web3("https://mainnet.infura.io/v3/562ba55287324547adbdd59b1dabc869");

async function run() {
  const subspace = new Subspace(web3);
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