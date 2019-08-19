const { map, scan, last, distinctUntilChanged } = require('rxjs/operators');
const Web3 = require('web3');

let web3 = new Web3("ws://localhost:8545");

let myscan = scan((acc, curr) => {
  acc.push(curr);
  if (acc.length > 4) {
    acc.shift();
  }
  return acc;
}, [])

let mymap = map(arr => arr.reduce((acc, current) => acc + current, 0) / arr.length)

async function deployContract() {
  let accounts = await web3.eth.getAccounts();

  // pragma solidity >=0.4.22 <0.6.0;
  // contract Transaction {
  //     event Rating(uint indexed escrowId, uint rating);
  //     function doRating(uint escrowId, uint rating) external {
  //         emit Rating(escrowId, rating);
  //     }
  // }

  let abi = [
    {
      "constant": false,
      "inputs": [
        {
          "name": "escrowId",
          "type": "uint256"
        },
        {
          "name": "rating",
          "type": "uint256"
        }
      ],
      "name": "doRating",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "name": "escrowId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "name": "rating",
          "type": "uint256"
        }
      ],
      "name": "Rating",
      "type": "event"
    }
  ]

  var contract = new web3.eth.Contract(abi)
  let instance = await contract.deploy({
    data: '0x608060405234801561001057600080fd5b5060e78061001f6000396000f3fe6080604052600436106039576000357c010000000000000000000000000000000000000000000000000000000090048063f60781a914603e575b600080fd5b348015604957600080fd5b50607d60048036036040811015605e57600080fd5b810190808035906020019092919080359060200190929190505050607f565b005b817ffdefdf8d82459f7b1eb157e5c44cbe6ee73d8ddd387511fe3622a3ee663b4697826040518082815260200191505060405180910390a2505056fea165627a7a7230582067833697a0e2bccb8bd624c0b06b2183641addb24f7931d8ec3979982bb663790029',
    arguments: []
  }).send({
    from: accounts[0],
    gas: '4700000'
  })
  return instance
}

async function run() {
  let accounts = await web3.eth.getAccounts();
  var RatingContract = await deployContract()
  console.dir(RatingContract)

  await RatingContract.methods.doRating(1, 5).send({from: accounts[0]})
  await RatingContract.methods.doRating(1, 3).send({from: accounts[0]})
  await RatingContract.methods.doRating(1, 1).send({from: accounts[0]})
  await RatingContract.methods.doRating(1, 5).send({from: accounts[0]})

  // RatingContract.events.getPastEvents('Rating', {fromBlock: 1})
  RatingContract.events.Rating({fromBlock: 1}, (err, event) => {
    // console.dir("new event")
    // console.dir(event)
  })

  const EventSyncer = require('../src/eventSyncer.js')
  const eventSyncer = new EventSyncer(web3);

  eventSyncer.init(() => {

    // TODO: would be nice if trackEvent was smart enough to understand the type of returnValues and do the needed conversions
    // eventSyncer.trackEvent(RatingContract, 'Rating', ((x) => true)).pipe(map(x => parseInt(x.rating)), myscan, mymap).subscribe((v) => {
    // eventSyncer.trackEvent(RatingContract, 'Rating', ((x) => true)).pipe(map(x => x.rating)).subscribe((v) => {

    eventSyncer.trackEvent(RatingContract, 'Rating').pipe(map(x => parseInt(x.rating)), myscan, mymap).subscribe((v) => {
      console.dir("value is ")
      console.dir(v)
    });

    var max = scan((acc, curr) => {
      if (curr > acc) return curr;
      return acc;
    }, [])

    // eventSyncer.trackEvent(RatingContract, 'Rating', ((x) => true)).pipe(map(x => parseInt(x.rating)), max, distinctUntilChanged()).subscribe((v) => {
    // eventSyncer.trackEvent(RatingContract, 'Rating', ((x) => true)).pipe(map(x => parseInt(x.rating)), last()).subscribe((v) => {

    eventSyncer.trackEvent(RatingContract, 'Rating').pipe(map(x => parseInt(x.rating)), max, distinctUntilChanged()).subscribe((v) => {
      console.dir("max known rating is")
      console.dir(v)
    });

  });

  // await RatingContract.methods.doRating(1, 5).send({from: accounts[0]})
  // await RatingContract.methods.doRating(1, 3).send({from: accounts[0]})
  // await RatingContract.methods.doRating(1, 1).send({from: accounts[0]})
  // await RatingContract.methods.doRating(1, 5).send({from: accounts[0]})
}

run()