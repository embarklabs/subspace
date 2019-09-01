import { createStore, applyMiddleware } from "redux";
import { reducer } from "./reducer";
import Web3 from "web3";
import Phoenix from "phoenix";
import { created, init } from "./actions";
import { ofType } from "redux-observable";
import { createEpicMiddleware } from "redux-observable";
import { mergeMap, map } from "rxjs/operators";

const web3 = new Web3("ws://localhost:8545");

let EscrowContract;
let eventSyncer;

web3.eth.getAccounts().then(async accounts => {
  web3.eth.defaultAccount = accounts[0];

  EscrowContract = await deployContract();
  await EscrowContract.methods
    .createEscrow(1, accounts[0], accounts[1])
    .send({ from: web3.eth.defaultAccount });
  await EscrowContract.methods
    .createEscrow(2, accounts[0], accounts[2])
    .send({ from: web3.eth.defaultAccount });
  await EscrowContract.methods
    .createEscrow(3, accounts[0], accounts[0])
    .send({ from: web3.eth.defaultAccount });
  await EscrowContract.methods
    .createEscrow(4, accounts[0], accounts[2])
    .send({ from: accounts[0] });

  eventSyncer = new Phoenix(web3.currentProvider);
  await eventSyncer.init();
  
  store.dispatch(init());
});

const rootEpic = action$ =>
  action$.pipe(
    ofType("INIT"),
    mergeMap(action =>
      eventSyncer
        .trackEvent(EscrowContract, "Created", {
          filter: { buyer: web3.eth.defaultAccount },
          fromBlock: 1
        })
        .pipe(map(eventData => created(eventData)))
    )
  );

const epicMiddleware = createEpicMiddleware();

const store = createStore(reducer, applyMiddleware(epicMiddleware));

epicMiddleware.run(rootEpic);

async function deployContract() {
  // pragma solidity >=0.4.22 <0.6.0;
  // contract Escrow {
  //     event Created(uint indexed escrowId, address buyer, address seller);
  //     function createEscrow(uint escrowId, address buyer, address seller) external {
  //         emit Created(escrowId, buyer, seller);
  //     }
  // }

  let abi = [
    {
      constant: false,
      inputs: [
        {
          name: "escrowId",
          type: "uint256"
        },
        {
          name: "buyer",
          type: "address"
        },
        {
          name: "seller",
          type: "address"
        }
      ],
      name: "createEscrow",
      outputs: [],
      payable: false,
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          name: "escrowId",
          type: "uint256"
        },
        {
          indexed: false,
          name: "buyer",
          type: "address"
        },
        {
          indexed: false,
          name: "seller",
          type: "address"
        }
      ],
      name: "Created",
      type: "event"
    }
  ];

  var contract = new web3.eth.Contract(abi);
  let instance = await contract
    .deploy({
      data:
        "0x608060405234801561001057600080fd5b50610184806100206000396000f3fe60806040526004361061003b576000357c01000000000000000000000000000000000000000000000000000000009004806378015cf414610040575b600080fd5b34801561004c57600080fd5b506100b96004803603606081101561006357600080fd5b8101908080359060200190929190803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff1690602001909291905050506100bb565b005b827fcbd6f84bfed2ee8cc01ea152b5d9f7126a72c410dbc5ab04c486a5800627b1908383604051808373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020018273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019250505060405180910390a250505056fea165627a7a72305820cc868ec126578f5508ee248fb823cd9f1ac6deb0562091cdf31843840b2a56410029",
      arguments: []
    })
    .send({
      from: web3.eth.defaultAccount,
      gas: "4700000"
    });
  return instance;
}


export default store;
