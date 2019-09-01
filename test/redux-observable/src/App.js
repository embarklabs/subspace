import React from "react";
import { connect } from "react-redux";

const App = ({ data }) => (
  <div>
    <h1>Event Data: {JSON.stringify(data)}</h1>
  </div>
);

export default connect(({ data }) => ({ data }))(App);
