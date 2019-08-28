import { ApolloLink } from "apollo-link";
import { rxjs } from "apollo-link-rxjs";
import { graphql } from "reactive-graphql";


const PhoenixRxLink = schema => {
  const graphqlLink = function(schema) {
    return new ApolloLink(operation => {
      return graphql(schema, operation.query); // TODO: test with variables in query
    });
  };
  
  const rxjsLink = rxjs({}); // TODO: This supports onOperation and onResult. Read more about those in npm package README
  
  return ApolloLink.from([rxjsLink, graphqlLink(schema)]);
}

export default PhoenixRxLink;

