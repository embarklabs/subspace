import React from 'react';
import Phoenix from 'phoenix';
import { pluck } from 'rxjs/operators';
import Web3 from 'web3';
import withObservables from '@nozbe/with-observables'
import { makeExecutableSchema } from "graphql-tools";
import gql from "graphql-tag";
import {graphql} from "reactive-graphql";
const web3 = new Web3("ws://localhost:8545");

const Escrow = ({escrow}) => {
  console.log("Received new escrow property", escrow);
  return <ul><li>{escrow.buyer} {escrow.seller} - <b>EscrowID:{escrow.escrowId}</b></li></ul>;
  //return <ul>{props.escrows.map((el, i) => <li key={i}>{el.buyer} {el.seller} {el.escrowId}</li>)}</ul>
};

const enhance = withObservables(['escrow'], ({ escrow }) => ({ escrow }));

const EnhancedEscrow = enhance(Escrow)

class App extends React.Component {

  state = {
    escrow: null
  }

  constructor(props){
    super(props);
    this.EscrowContract = null;
  }

  componentDidMount(){
    (async ()  => {
      let accounts = await web3.eth.getAccounts();
      this.EscrowContract = await deployContract();

      await this.EscrowContract.methods.createEscrow(1, accounts[0], accounts[1]).send({from: accounts[0]})
      await this.EscrowContract.methods.createEscrow(1, accounts[1], accounts[2]).send({from: accounts[0]})
      await this.EscrowContract.methods.createEscrow(1, accounts[1], accounts[0]).send({from: accounts[0]})
      await this.EscrowContract.methods.createEscrow(1, accounts[0], accounts[2]).send({from: accounts[0]})

      const eventSyncer = new Phoenix(web3.currentProvider);

      await eventSyncer.init();
      const replayObj = eventSyncer.trackEvent(this.EscrowContract, 'Created', {filter: {buyer: accounts[0]}, fromBlock: 1});
  





      const typeDefs = `
        type Escrow {
          buyer: String!
          seller: String!
          escrowId: Int!
        }
        type Query {
          escrows: Escrow!
        }
      `;

      const resolvers = {
        Query: {
          escrows: () => {
            return eventSyncer.trackEvent(this.EscrowContract, 'Created', { filter: { buyer: accounts[0] }, fromBlock: 1 })
          }
        }
      };

      
      
const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

const query = gql`
  query {
    escrows {
      buyer
      seller
      escrowId
    }
  }
`;

const stream = graphql(schema, query).pipe(pluck("data", "escrows"));
this.setState({
  escrow: stream
});






    })();
  }

  createTrx = async () => {
    let accounts = await web3.eth.getAccounts();
    await this.EscrowContract.methods.createEscrow(Date.now(), accounts[0], accounts[1]).send({from: accounts[0]})

  }

  render(){
    if(!this.state.escrow) return null;

    return <div>
      <button onClick={this.createTrx}>Create Trx</button>
      {this.state.escrow && <EnhancedEscrow escrow={this.state.escrow} /> }
    </div>;
  }
}

export default App;













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
