const Web3 = require('web3');
const Subspace = require('../dist/index.js').default;

let web3 = new Web3("ws://localhost:8545");

async function deployContract() {
  let accounts = await web3.eth.getAccounts();

  // pragma solidity ^0.5.0;
  // contract ERC20Token {
  //     function balanceOf(address _owner)
  //         external
  //         view
  //         returns (uint256 balance)
  //     {
  //         return block.number;
  //     }
  // }

  let abi = [
    {
      "constant": true,
      "inputs": [
        {
          "name": "_owner",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "name": "balance",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    }
  ];

  var contract = new web3.eth.Contract(abi)
  let instance = await contract.deploy({
    data: '0x608060405234801561001057600080fd5b5060d58061001f6000396000f3fe6080604052600436106039576000357c01000000000000000000000000000000000000000000000000000000009004806370a0823114603e575b600080fd5b348015604957600080fd5b50608960048036036020811015605e57600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190505050609f565b6040518082815260200191505060405180910390f35b600043905091905056fea165627a7a72305820267fb09927dce2942fe73ac7487c4f1565dae60b08aa5434a22cb1f71366bd090029',
    arguments: []
  }).send({
    from: accounts[0],
    gas: '4700000'
  })
  return instance
}

async function run() {
  let accounts = await web3.eth.getAccounts();
  var DummyERC20Token = await deployContract()
  console.dir(DummyERC20Token.options.address)


  const subspace = new Subspace(web3);
  await subspace.init();

  subspace.trackBalance(accounts[0], DummyERC20Token.options.address).pipe().subscribe((balance) => {
    console.log("balance is ", balance)
  });
}

run()
