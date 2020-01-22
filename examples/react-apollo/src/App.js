import React from "react";
import Subspace from "@embarklabs/subspace";
import { graphql } from "reactive-graphql";
import gql from "graphql-tag";
import { makeExecutableSchema } from "graphql-tools";
import { ApolloClient } from "apollo-client";
import { ApolloProvider, Query } from "react-apollo";
import { InMemoryCache } from "apollo-cache-inmemory";
import { ApolloLink } from "apollo-link";
import { rxjs } from "apollo-link-rxjs";
import web3 from './web3';
import MyContract from './MyContract';

const MY_QUERY = gql`
  query {
    myEvents {
      someValue,
      anotherValue
    }
  }
`;

const typeDefs = `
  type MyEvent {
    someValue: Int
    anotherValue: String
  }
  type Query {
    myEvents: MyEvent!
  }
`;

let MyContractInstance;

class App extends React.Component {
  state = {
    client: null
  };

  async componentDidMount() {
    const subspace = new Subspace(web3.currentProvider);
    await subspace.init();

    MyContractInstance = await MyContract.getInstance();

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
              rxjs({}),
              new ApolloLink(operation => graphql(schema, operation.query))
            ])
    });

    this.setState({ client });
  }

  createTrx = () => {
    MyContractInstance.methods
      .myFunction()
      .send({ from: web3.eth.defaultAccount });
  };

  render() {
    if (!this.state.client) return <h1>Loading</h1>;

    return (
      <ApolloProvider client={this.state.client}>
        <button onClick={this.createTrx}>Create a Transaction</button>
        <Query query={MY_QUERY}>
          {({ loading, error, data }) => {
            if (loading) return <div>Loading...</div>;
            if (error) {
              console.error(error);
              return <div>Error :(</div>;
            }
            return (
              <p>The data returned by the query: {JSON.stringify(data)}</p>
            );
          }}
        </Query>
      </ApolloProvider>
    );
  }
}

export default App;
