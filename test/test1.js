const { map, scan, last, distinctUntilChanged } = require('rxjs/operators');
const Web3Eth = require('web3-eth');
const {deployRatingContract} = require('./utils-web3');
const Subspace = require('../dist/node.js');

let eth = new Web3Eth("http://localhost:8545");

let myscan = scan((acc, curr) => {
  acc.push(curr);
  return acc;
}, [])

let mymap = map(arr => arr.reduce((acc, current) => acc + current, 0) / arr.length)

async function run() {
  let accounts = await eth.getAccounts();
  var RatingContract = await deployRatingContract(eth)

  await RatingContract.methods.doRating(1, 5).send({from: accounts[0]})
  await RatingContract.methods.doRating(1, 3).send({from: accounts[0]})
  await RatingContract.methods.doRating(1, 1).send({from: accounts[0]})
  await RatingContract.methods.doRating(1, 5).send({from: accounts[0]})

  // RatingContract.events.getPastEvents('Rating', {fromBlock: 1})
  RatingContract.events.Rating({fromBlock: 1}, (err, event) => {
    // console.dir("new event")
    // console.dir(event)
  })

  const subspace = new Subspace(eth.currentProvider);

  await subspace.init()

  // TODO: would be nice if trackEvent was smart enough to understand the type of returnValues and do the needed conversions
  // subspace.trackEvent(RatingContract, 'Rating', ((x) => true)).pipe(map(x => parseInt(x.rating)), myscan, mymap).subscribe((v) => {

  // subspace.trackEvent(RatingContract, 'Rating').pipe(map(x => parseInt(x.rating)), myscan, mymap).subscribe((v) => {
  // subspace.trackEvent(RatingContract, 'Rating', ((x) => true)).pipe(map(x => x.rating)).subscribe((v) => {

  subspace.trackEvent(RatingContract, 'Rating', ((x) => true)).pipe(map(x => parseInt(x.rating)), myscan, mymap).subscribe((v) => {
    console.dir("value is ")
    console.dir(v)
  });

  var max = scan((acc, curr) => {
    if (curr > acc) return curr;
    return acc;
  }, [])

  // subspace.trackEvent(RatingContract, 'Rating', ((x) => true)).pipe(map(x => parseInt(x.rating)), max, distinctUntilChanged()).subscribe((v) => {
  // subspace.trackEvent(RatingContract, 'Rating', ((x) => true)).pipe(map(x => parseInt(x.rating)), last()).subscribe((v) => {

  subspace.trackEvent(RatingContract, 'Rating').pipe(map(x => parseInt(x.rating)), max, distinctUntilChanged()).subscribe((v) => {
    console.dir("max known rating is")
    console.dir(v)
  });


  // await RatingContract.methods.doRating(1, 5).send({from: accounts[0]})
  // await RatingContract.methods.doRating(1, 3).send({from: accounts[0]})
  // await RatingContract.methods.doRating(1, 1).send({from: accounts[0]})
  // await RatingContract.methods.doRating(1, 5).send({from: accounts[0]})
}

run()