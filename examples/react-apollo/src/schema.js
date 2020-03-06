import {makeExecutableSchema} from "graphql-tools";

const getSchema = MyContractInstance => {
  const typeDefs = `
  type MyEvent {
    someValue: String
    anotherValue: String
  }
  type Query {
    myEvents: MyEvent!
  }
`;

  const resolvers = {
    Query: {
      myEvents: () => MyContractInstance.events.MyEvent.track({filter: {}, fromBlock: 1})
    }
  };

  return makeExecutableSchema({typeDefs, resolvers});
};

export default getSchema;
