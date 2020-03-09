# reactive-graphql

Using `reactive-graphql` you can execute GraphQL queries against **Subspace** observables after you create your own type definitions and resolvers.

### Example


```js
const Subspace = require('@embarklabs/subspace');
const MyContract = require('./MyContract');
const { pluck } = require('rxjs/operators');
const { makeExecutableSchema } = require("graphql-tools");
const gql = require("graphql-tag");
const { graphql } = require("reactive-graphql");

const run = async () => {
  const subspace = new Subspace(web3);
  await subspace.init();

  const MyContractInstance = ...; // TODO: obtain a web3.eth.contract instance

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
      myEvents: () => subspace.trackEvent(MyContractInstance, 'MyEvent', { filter: {}, fromBlock: 1 })
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
  stream.subscribe(data => {
    console.log(data);
  })

}

run();
```

::: tip 
This example is available in [Github](https://github.com/embarklabs/subspace/tree/master/examples/reactive-graphql)
:::