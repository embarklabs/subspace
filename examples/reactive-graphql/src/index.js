const Subspace = require('phoenix');
const web3 = require('./web3');
const MyContract = require('./MyContract');
const { pluck } = require('rxjs/operators');
const { makeExecutableSchema } = require("graphql-tools");
const gql = require("graphql-tag");
const { graphql } = require("reactive-graphql");

const run = (async ()  => {
  const eventSyncer = new Subspace(web3.currentProvider);
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
