const Web3Eth = require('web3-eth');
const {deployRatingContract, mine} = require('./utils-web3');
const Subspace = require('../dist/index.js').default;
const ganache = require("ganache-core");

console.log("The following error is emitted by ganache - https://github.com/trufflesuite/ganache-core/issues/267")
let eth = new Web3Eth(ganache.provider());

async function run() {
  let accounts = await eth.getAccounts();
  var RatingContract = await deployRatingContract(eth)

  // Events are generated in these blocks:
  //             x           x   x   x   x         x              x    x                       x
  // 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  await mine(eth);
  await RatingContract.methods.doRating(1, 5).send({from: accounts[0]})
  await mine(eth);
  await mine(eth);
  await RatingContract.methods.doRating(2, 3).send({from: accounts[0]})
  await RatingContract.methods.doRating(3, 1).send({from: accounts[0]})
  await RatingContract.methods.doRating(4, 5).send({from: accounts[0]})
  await RatingContract.methods.doRating(5, 5).send({from: accounts[0]})
  await mine(eth);
  await RatingContract.methods.doRating(6, 5).send({from: accounts[0]})
  await mine(eth);
  await mine(eth);
  await RatingContract.methods.doRating(7, 5).send({from: accounts[0]})
  await RatingContract.methods.doRating(8, 5).send({from: accounts[0]})
  await mine(eth);
  await mine(eth); 
  await mine(eth);
  await mine(eth);
  await RatingContract.methods.doRating(8, 5).send({from: accounts[0]})
  
  const subspace = new Subspace(eth.currentProvider);
  await subspace.init()

  // Testing single block with a event
  subspace.trackEvent(RatingContract, 'Rating', {fromBlock: 3, toBlock: 3}).subscribe((v) => {
    console.log("A", v)
  });

  // Testing blocks that have no events in between
  subspace.trackEvent(RatingContract, 'Rating', {fromBlock: 8, toBlock: 11}).subscribe((v) => {
    console.log("B", v)
  });

  // Testing blocks that begin with no events
  subspace.trackEvent(RatingContract, 'Rating', {fromBlock: 12, toBlock: 15}).subscribe((v) => {
    console.log("C", v)
  });

  // Testing all blocks
  subspace.trackEvent(RatingContract, 'Rating', {}).subscribe((v) => {
    console.log("D", v)
  });

  // Testing blocks that end in no events
  subspace.trackEvent(RatingContract, 'Rating', {fromBlock: 14, toBlock: 18}).subscribe((v) => {
    console.log("E", v)
  });


  setTimeout(() => {
    // Testing if events come from the DB instead of a subscription
    subspace.trackEvent(RatingContract, 'Rating', {fromBlock: 7, toBlock: 11}).subscribe((v) => {
      console.log("E", v)
    });
  }, 5000);

}

run()