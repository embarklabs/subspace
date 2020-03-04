import React  from "react";
import SubspaceContext from "./subspaceContext";

/* eslint-disable react/display-name */
const withSubspace = WrappedComponent => props => (
  <SubspaceContext.Consumer>
    {subspace => <WrappedComponent subspace={subspace} {...props} />}
  </SubspaceContext.Consumer>
);

export default withSubspace;
