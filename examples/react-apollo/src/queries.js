import gql from "graphql-tag";

export const MY_QUERY = gql`
  query @live {
    myEvents {
      someValue
      anotherValue
    }
  }
`;
