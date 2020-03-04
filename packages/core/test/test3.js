const { map, scan, last, distinctUntilChanged } = require('rxjs/operators');
const Web3Eth = require('web3-eth');
const Subspace = require('../dist/index.js').default;

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
  //   mapping(uint => uint) storeMap;
  //   event Test(uint indexed value);
  //   constructor() public {
  //   }
    
  //   function set(uint x, uint y) public {
  //     storeMap[x] = y;
  //   }

  //   function get(uint x) public view returns (uint, address) {
  //     return (storeMap[x], msg.sender);
  //   }
  // }

  let abi = [
    {
      "constant": false,
      "inputs": [
        {
          "name": "x",
          "type": "uint256"
        },
        {
          "name": "y",
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
      "inputs": [
        {
          "name": "x",
          "type": "uint256"
        }
      ],
      "name": "get",
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        },
        {
          "name": "",
          "type": "address"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
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
    data: '0x608060405234801561001057600080fd5b5061017c806100206000396000f3fe608060405260043610610046576000357c0100000000000000000000000000000000000000000000000000000000900480631ab06ee51461004b5780639507d39a14610090575b600080fd5b34801561005757600080fd5b5061008e6004803603604081101561006e57600080fd5b810190808035906020019092919080359060200190929190505050610112565b005b34801561009c57600080fd5b506100c9600480360360208110156100b357600080fd5b810190808035906020019092919050505061012d565b604051808381526020018273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019250505060405180910390f35b80600080848152602001908152602001600020819055505050565b60008060008084815260200190815260200160002054338090509150915091509156fea165627a7a7230582054f962728d2f5acbfde67516616e1b90e3aca5df27a213cbbabc16387d9af7d90029',
    arguments: []
  }).send({
    from: accounts[0],
    gas: '4700000'
  })
  return instance
}

async function run() {
  let accounts = await eth.getAccounts();
  var SimpleStorageContract = await deployContract()
  console.dir(SimpleStorageContract.options.address)

  console.log("F")
  const subspace = new Subspace(eth.currentProvider);
console.log("B")
  await subspace.init();
console.log("C")
  await SimpleStorageContract.methods.set(2, 500).send({ from: accounts[0], gas: 4700000 })
console.log("A")
  subspace.trackProperty(SimpleStorageContract, 'get', [2], {from: "0x0000000000000000000000000000000000000012"} ).map("1").subscribe((v) => {
    console.dir("value is ")
    console.dir(v)
  })

  setTimeout(async () => {
    await SimpleStorageContract.methods.set(2, 200).send({ from: accounts[0] })
    await SimpleStorageContract.methods.set(1, 200).send({ from: accounts[0] })
    await SimpleStorageContract.methods.set(0, 300).send({ from: accounts[0] })
    await SimpleStorageContract.methods.set(2, 300).send({ from: accounts[0] })
    await SimpleStorageContract.methods.set(0, 300).send({ from: accounts[0] })
  }, 2000);

}

run()
