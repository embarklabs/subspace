const { map, scan, last, distinctUntilChanged } = require('rxjs/operators');
const Web3Eth = require('web3-eth');

let eth = new Web3Eth("ws://localhost:8545");

let myscan = scan((acc, curr) => {
  acc.push(curr);
  return acc;
}, [])

let mymap = map(arr => arr.reduce((acc, current) => acc + current, 0) / arr.length)

async function deployContract() {
  let accounts = await eth.getAccounts();

  // pragma solidity ^0.5.0;
  // contract SimpleStorage {
  //   uint public storedData;
  //   event Test(uint indexed value);
  //   constructor(uint initialValue) public {
  //     storedData = initialValue;
  //   }
  //   function set(uint x) public {
  //     storedData = x;
  //   }
  //   function set2(uint x) public {
  //     storedData = x;
  //     emit Test(x);
  //   }
  //   function get() public view returns (uint retVal) {
  //     return storedData;
  //   }
  // }

  let abi = [
    {
      "constant": true,
      "inputs": [],
      "name": "storedData",
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "x",
          "type": "uint256"
        }
      ],
      "name": "set",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "get",
      "outputs": [
        {
          "name": "retVal",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "x",
          "type": "uint256"
        }
      ],
      "name": "set2",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "initialValue",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Test",
      "type": "event"
    }
  ]

  var contract = new eth.Contract(abi)
  let instance = await contract.deploy({
    data: '0x608060405234801561001057600080fd5b506040516020806102018339810180604052602081101561003057600080fd5b810190808051906020019092919050505080600081905550506101a9806100586000396000f3fe60806040526004361061005c576000357c0100000000000000000000000000000000000000000000000000000000900480632a1afcd91461006157806360fe47b11461008c5780636d4ce63c146100c7578063ce01e1ec146100f2575b600080fd5b34801561006d57600080fd5b5061007661012d565b6040518082815260200191505060405180910390f35b34801561009857600080fd5b506100c5600480360360208110156100af57600080fd5b8101908080359060200190929190505050610133565b005b3480156100d357600080fd5b506100dc61013d565b6040518082815260200191505060405180910390f35b3480156100fe57600080fd5b5061012b6004803603602081101561011557600080fd5b8101908080359060200190929190505050610146565b005b60005481565b8060008190555050565b60008054905090565b80600081905550807f63a242a632efe33c0e210e04e4173612a17efa4f16aa4890bc7e46caece80de060405160405180910390a25056fea165627a7a7230582063160eb16dc361092a85ced1a773eed0b63738b83bea1e1c51cf066fa90e135d0029',
    arguments: [100]
  }).send({
    from: accounts[0],
    gas: '4700000'
  })
  return instance
}

async function run() {
  let accounts = await eth.getAccounts();
  var SimpleStorageContract = await deployContract()
  console.dir(SimpleStorageContract)
  console.dir(SimpleStorageContract.options.address)

  // var subscription = web3.eth.subscribe('logs', {
  //   address: SimpleStorageContract.options.address
  //   // topics: ['0x12345...']
  // }, function (error, result) {
  //   console.dir("----------")
  //   console.dir(error)
  //   console.dir(result)
  // });

  // subscription.on('data', console.log)
  // subscription.on('changed', console.log)

  setTimeout(async () => {
    console.dir("set 100")
    await SimpleStorageContract.methods.set(100).send({ from: accounts[0], gas: 4700000 })
    console.dir("set 200")
    await SimpleStorageContract.methods.set2(200).send({ from: accounts[0] })
    console.dir("set 200")
    await SimpleStorageContract.methods.set2(200).send({ from: accounts[0] })
    console.dir("set 300")
    await SimpleStorageContract.methods.set(300).send({ from: accounts[0] })
    console.dir("set 300")
    await SimpleStorageContract.methods.set(300).send({ from: accounts[0] })
    console.dir("set 300")
    await SimpleStorageContract.methods.set(300).send({ from: accounts[0] })

    let value = await SimpleStorageContract.methods.get().call()
    console.dir(value)
  }, 3000)

  // EscrowContract.events.getPastEvents('Rating', {fromBlock: 1})
  // EscrowContract.events.Created({fromBlock: 1}, (err, event) => {
    // console.dir("new event")
    // console.dir(event)
  // })

  const EventSyncer = require('../src/eventSyncer.js')
  const eventSyncer = new EventSyncer(eth.currentProvider);

  await eventSyncer.init();

  // eventSyncer.trackEvent(EscrowContract, 'Created', ((x) => true)).pipe().subscribe((v) => {
  // eventSyncer.trackEvent(EscrowContract, 'Created', {filter: {buyer: accounts[0]}, fromBlock: 1}).pipe().subscribe((v) => {
  // eventSyncer.trackEvent(EscrowContract, 'Rating', ((x) => true)).pipe(map(x => x.rating)).subscribe((v) => {
  // console.dir("value is ")
  // console.dir(v)
  // });

  eventSyncer.trackProperty(SimpleStorageContract, 'get', ((x) => true)).pipe().subscribe((v) => {
    console.dir("value is ")
    console.dir(v)
  })

}

run()
