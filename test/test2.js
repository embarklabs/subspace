const { map, scan, last, distinctUntilChanged } = require('rxjs/operators');
const Web3Eth = require('web3-eth');
const {deployEscrowContract} = require('./utils-web3');
const Subspace = require('../dist/node.js');

let eth = new Web3Eth("ws://localhost:8545");

let myscan = scan((acc, curr) => {
  acc.push(curr);
  return acc;
}, [])

let mymap = map(arr => arr.reduce((acc, current) => acc + current, 0) / arr.length)

async function run() {
  let accounts = await eth.getAccounts();
  var EscrowContract = await deployEscrowContract(eth)

  await EscrowContract.methods.createEscrow(1, accounts[0], accounts[1]).send({from: accounts[0]})
  await EscrowContract.methods.createEscrow(1, accounts[1], accounts[2]).send({from: accounts[0]})
  await EscrowContract.methods.createEscrow(1, accounts[1], accounts[0]).send({from: accounts[0]})
  await EscrowContract.methods.createEscrow(1, accounts[0], accounts[2]).send({from: accounts[0]})

  // EscrowContract.events.getPastEvents('Rating', {fromBlock: 1})
  EscrowContract.events.Created({fromBlock: 1}, (err, event) => {
    // console.dir("new event")
    // console.dir(event)
  })

  const subspace = new Subspace(eth.currentProvider);

  await subspace.init()
  console.dir("getting escrows created by " + accounts[0])

    // subspace.trackEvent(EscrowContract, 'Created', ((x) => true)).pipe().subscribe((v) => {
  subspace.trackEvent(EscrowContract, 'Created', { filter: { buyer: accounts[0] }, fromBlock: 1 }).pipe().subscribe((v) => {
    // subspace.trackEvent(EscrowContract, 'Rating', ((x) => true)).pipe(map(x => x.rating)).subscribe((v) => {
    console.dir("value is ")
    console.dir(v)
  });

}

run()