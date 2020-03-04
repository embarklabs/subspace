const { makeExecutableSchema } = require("graphql-tools");
const gql  = require( "graphql-tag");
const { timer }  = require( "rxjs");
const graphql  = require( "reactive-graphql").graphql;

const typeDefs = `
  type Query {
    time: Int!
  }
`;

const resolvers = {
  Query: {
    // resolvers can return an Observable
    time: () => {
      // Observable that emits increasing numbers every 1 second
      return timer(1000, 1000);
    }
  }
};

const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

const query = gql`
  query {
    time
  }
`;

const stream = graphql(schema, query);
// stream is an Observable
stream.subscribe(res => console.log(res));