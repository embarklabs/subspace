const ganache = require("ganache-core");
const Web3Eth = require('web3-eth');
const Subspace = require('../dist/index.js').default;

console.log("The following error is emitted by ganache - https://github.com/trufflesuite/ganache-core/issues/267")
let eth = new Web3Eth(ganache.provider());

async function run() {
  let accounts = await eth.getAccounts();
  console.log(accounts);


setTimeout(() => {
  console.log("ABC")
  eth.getBalance(accounts[0]).then(console.log);
}, 3000)


  setTimeout(async () => {
    await eth.sendTransaction({from: accounts[0], to: accounts[1], value: "100000000"});
    await eth.sendTransaction({from: accounts[1], to: accounts[0], value: "999999999"});
    await eth.sendTransaction({from: accounts[0], to: accounts[1], value: "232433434"});
  }, 2000);

  const subspace = new Subspace(eth.currentProvider);

  await subspace.init();

  subspace.trackBalance(accounts[0]).subscribe((balance) => {
    console.log("accounts[0] balance is ", balance);
  })

  subspace.trackBalance(accounts[1]).subscribe((balance) => {
    console.log("accounts[1] balance is ", balance);
  })

}

run()
