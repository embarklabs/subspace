# apollo-client
To use **Subspace** with `apollo-client`, a `ReactiveSchemaLink` from `apollo-link-reactive-schema` must be used with a custom schema.

```js
import {InMemoryCache} from "apollo-cache-inmemory";
import ApolloClient from "apollo-client";
import {ReactiveSchemaLink} from "apollo-link-reactive-schema";

const schema = makeExecutableSchema({typeDefs, resolvers});
const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: new ReactiveSchemaLink({schema)})
});

```

### Example

```js{35-45}
import { ApolloClient } from "apollo-client";
import { InMemoryCache } from "apollo-cache-inmemory";
import {ReactiveSchemaLink} from "apollo-link-reactive-schema";
import Subspace from "@embarklabs/subspace";

// ...

// Initialize Subspace
const subspace = new Subspace(web3);
await subspace.init();

const MyContractInstance = ...; // TODO: obtain a web3.eth.Contract instance

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
    myEvents: () => subspace.trackEvent(MyContractInstance, 'MyEvent', {filter: {}, fromBlock: 1})
  }
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: new ReactiveSchemaLink({schema)})
});
```


<div class="c-notification">
<h3>Using Apollo with Subspace</h3>
A practical example can also be found in <code>examples/react-apollo</code>.
</div>