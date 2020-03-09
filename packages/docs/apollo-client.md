# apollo-client
To use **Subspace** with `apollo-client`, a composed `ApolloLink` must be defined using the `apollo-link-rxjs` and `reactive-graphl` npm packages. Notice that the `addTypename` option of `InMemoryCache` must be set `false`.

```js
import { ApolloClient } from "apollo-client";
import { InMemoryCache } from "apollo-cache-inmemory";
import { ApolloLink } from "apollo-link";
import { rxjs as rxJsLink } from "apollo-link-rxjs";
import { graphql } from "reactive-graphql";

const client = new ApolloClient({
  // If addTypename:true, the query will fail due to __typename
  // being added to the schema. reactive-graphql does not
  // support __typename at this moment.
  cache: new InMemoryCache({ addTypename: false }),
  link: ApolloLink.from([
          rxJsLink({}),
          new ApolloLink(operation => graphql(schema, operation.query))
        ])
});
```

### Example

```js{35-45}
import { ApolloClient } from "apollo-client";
import { InMemoryCache } from "apollo-cache-inmemory";
import { ApolloLink } from "apollo-link";
import { rxjs as rxJsLink } from "apollo-link-rxjs";
import { graphql } from "reactive-graphql";

// ...

// Initialize Subspace
const subspace = new Subspace(web3.currentProvider); // Use a valid provider (geth, parity, infura...)
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
    myEvents: () => {
      return subspace.trackEvent(MyContractInstance, 'MyEvent', {filter: {}, fromBlock: 1})
    }
  }
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

const client = new ApolloClient({
  // If addTypename:true, the query will fail due to __typename
  // being added to the schema. reactive-graphql does not
  // support __typename at this moment.
  cache: new InMemoryCache({ addTypename: false }),
  link: ApolloLink.from([
          rxJsLink({}),
          new ApolloLink(operation => graphql(schema, operation.query))
        ])
});
```


::: tip Using react-apollo
A practical example can also be found in `examples/react-apollo`.
:::