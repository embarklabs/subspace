const Web3Eth = require('web3-eth');
const {deployRatingContract, mine} = require('./utils-web3');
const Subspace = require('../dist/index.js').default;
const ganache = require("ganache-core");

console.log("The following error is emitted by ganache - https://github.com/trufflesuite/ganache-core/issues/267")
let eth = new Web3Eth("http://localhost:8545");

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

  setTimeout(async () => {
    setInterval(async () => {
      await RatingContract.methods.doRating(1, 1).send({from: accounts[0]})
    }, 2000);
  }, 3000)
  await mine(eth);
  
  const subspace = new Subspace(eth.currentProvider);
  await subspace.init()

  
  // Testing single block with a event
  subspace.trackEvent(RatingContract, 'Rating', {fromBlock: 3}).subscribe({
    next(x) { console.log('got value ', x)},
    error(err) { console.log("ERROR")},
    complete() { console.log('done')}
  });


  console.log(".....")

}

run();