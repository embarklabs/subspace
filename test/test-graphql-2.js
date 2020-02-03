const { makeExecutableSchema } = require("graphql-tools");
const gql  = require( "graphql-tag");
const graphql  = require( "reactive-graphql").graphql;
const Subspace = require('../dist/index.js').default;


const Web3Eth = require('web3-eth');
const {deployEscrowContract} = require('./utils-web3');

let eth = new Web3Eth("ws://localhost:8545");


async function run() {
  let accounts = await eth.getAccounts();
  var EscrowContract = await deployEscrowContract(eth)

  await EscrowContract.methods.createEscrow(1, accounts[0], accounts[1]).send({from: accounts[0]})
  await EscrowContract.methods.createEscrow(1, accounts[1], accounts[2]).send({from: accounts[0]})
  await EscrowContract.methods.createEscrow(1, accounts[1], accounts[0]).send({from: accounts[0]})
  await EscrowContract.methods.createEscrow(1, accounts[0], accounts[2]).send({from: accounts[0]})

  const subspace = new Subspace(eth.currentProvider);

  await subspace.init()

  setInterval(async () => {
    await EscrowContract.methods.createEscrow(1, accounts[0], accounts[1]).send({from: accounts[0]})
  }, 1 * 1000)


  const typeDefs = `
  type Escrow {
    buyer: String!
    seller: String!
  }
  type Query {
    escrows: Escrow!
  }
`;

const resolvers = {
  Query: {
    escrows: () => {
      return subspace.trackEvent(EscrowContract, 'Created', { filter: { buyer: accounts[0] }, fromBlock: 1 })
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
    }
  }
`;

const stream = graphql(schema, query);
// stream is an Observable
stream.subscribe(res => console.log(res));

  // .
}

run()

