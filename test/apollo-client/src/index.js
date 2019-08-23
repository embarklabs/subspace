import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import * as serviceWorker from "./serviceWorker";
import gql from "graphql-tag";
import { ApolloLink } from "apollo-link";
import { ApolloClient } from "apollo-client";
import { ApolloProvider, Query } from "react-apollo";
import { InMemoryCache } from "apollo-cache-inmemory";
import Phoenix from "phoenix";
import Web3 from "web3";
import { makeExecutableSchema } from "graphql-tools";
import { rxjs } from "apollo-link-rxjs";
import { graphql } from "reactive-graphql";

const web3 = new Web3("ws://localhost:8545");

const MY_QUERY = gql`
  query {
    escrows {
      escrowId
    }
  }
`;

class App extends React.Component {
  state = {
    client: null
  };

  constructor(props) {
    super(props);
    this.EscrowContract = null;
  }

  componentDidMount() {
    (async () => {
      let accounts = await web3.eth.getAccounts();
      this.EscrowContract = await deployContract();

      // Generating data each two second
      setInterval(async () => {
        await this.EscrowContract.methods
          .createEscrow(Math.floor(Date.now() / 1000), accounts[0], accounts[1])
          .send({ from: accounts[0] });
      }, 1 * 1000);

      // ======================

      const eventSyncer = new Phoenix(web3.currentProvider);

      await eventSyncer.init();

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
            return eventSyncer.trackEvent(this.EscrowContract, "Created", {
              filter: { buyer: accounts[0] },
              fromBlock: 1
            });
          }
        }
      };

      const schema = makeExecutableSchema({
        typeDefs,
        resolvers
      });

      // TODO: extract to separate script

      const graphQLRXJSLink = new ApolloLink(operation => {
        return graphql(schema, operation.query); // TODO: test with variables in query
      });

      const rxjsLink = rxjs({}); // TODO: This supports onOperation and onResult. Read more about those in npm package README

      // Pass your GraphQL endpoint to uri
      const client = new ApolloClient({
        addTypename: false,
        cache: new InMemoryCache({ addTypename: false }), // TODO: If addTypename is true, the query will fail
        link: ApolloLink.from([rxjsLink, graphQLRXJSLink])
      });

      this.setState({ client });
    })();
  }

  render() {
    if (!this.state.client) return <h1>Loading</h1>;

    return (
      <ApolloProvider client={this.state.client}>
        <div>
          <button onClick={this.createTrx}>Create Trx</button>
        </div>
        <Query query={MY_QUERY}>
          {({ loading, error, data }) => {
            if (loading) return <div>Loading...</div>;
            if (error) return <div>Error :(</div>;
            return (
              <p>The data returned by the query: {JSON.stringify(data)}</p>
            );
          }}
        </Query>
      </ApolloProvider>
    );
  }
}

ReactDOM.render(<App />, document.getElementById("root"));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

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
      from: accounts[0],
      gas: "4700000"
    });
  return instance;
}
