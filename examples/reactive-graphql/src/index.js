const Phoenix = require('phoenix');
const web3 = require('./web3');
const MyContract = require('./MyContract');
const { pluck } = require('rxjs/operators');
const { makeExecutableSchema } = require("graphql-tools");
const gql = require("graphql-tag");
const { graphql } = require("reactive-graphql");


const run = (async ()  => {
  const eventSyncer = new Phoenix(web3.currentProvider);
  await eventSyncer.init();

  const MyContractInstance = await MyContract.getInstance();

  // Creating some transactions
  await MyContractInstance.methods.myFunction().send({from: web3.eth.defaultAccount});
  await MyContractInstance.methods.myFunction().send({from: web3.eth.defaultAccount});
  await MyContractInstance.methods.myFunction().send({from: web3.eth.defaultAccount});
  await MyContractInstance.methods.myFunction().send({from: web3.eth.defaultAccount});

  const typeDefs = `
    type MyEvent {
      someValue: Int
      anotherValue: String
    }
    type Query {
      myEvents: MyEvent!
    }
  `;

  const resolvers = {
    Query: {
      myEvents: () => {
        return eventSyncer.trackEvent(MyContractInstance, 'MyEvent', {filter: {}, fromBlock: 1})
      }
    }
  };

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const query = gql`
    query {
      myEvents {
        someValue
        anotherValue
      }
    }
  `;

  const stream = graphql(schema, query).pipe(pluck('data', 'myEvents'));
  stream.subscribe(x => {
    console.log(x)
  });
  
});
 
run();



async function deployContract() {
  let accounts = await web3.eth.getAccounts();

  // pragma solidity >=0.4.22 <0.6.0;
  // contract Escrow {
  //     event Created(uint indexed escrowId, address buyer, address seller);
  //     function createEscrow(uint escrowId, address buyer, address seller) external {
  //         emit Created(escrowId, buyer, seller);
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
          "name": "buyer",
          "type": "address"
        },
        {
          "name": "seller",
          "type": "address"
        }
      ],
      "name": "createEscrow",
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
          "name": "buyer",
          "type": "address"
        },
        {
          "indexed": false,
          "name": "seller",
          "type": "address"
        }
      ],
      "name": "Created",
      "type": "event"
    }
  ]

  var contract = new web3.eth.Contract(abi)
  let instance = await contract.deploy({
    data: '0x608060405234801561001057600080fd5b50610184806100206000396000f3fe60806040526004361061003b576000357c01000000000000000000000000000000000000000000000000000000009004806378015cf414610040575b600080fd5b34801561004c57600080fd5b506100b96004803603606081101561006357600080fd5b8101908080359060200190929190803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff1690602001909291905050506100bb565b005b827fcbd6f84bfed2ee8cc01ea152b5d9f7126a72c410dbc5ab04c486a5800627b1908383604051808373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020018273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019250505060405180910390a250505056fea165627a7a72305820cc868ec126578f5508ee248fb823cd9f1ac6deb0562091cdf31843840b2a56410029',
    arguments: []
  }).send({
    from: accounts[0],
    gas: '4700000'
  })
  return instance
}
