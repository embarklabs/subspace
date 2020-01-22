import React from "react";
import { observe } from "@embarklabs/subspace/react";

const MyComponent = ({ eventData }) => {
  // Handle initial state when no data is available
  if (!eventData) {
    return <p>No data</p>;
  }

  console.log("Data received", eventData);

  return <ul>
    <li><b>someValue: </b> {eventData.someValue}</li>
    <li><b>anotherValue: </b> {eventData.anotherValue}</li>
  </ul>;
};

// MyComponent will now observe any observable prop it receives
// and update its state whenever the observable emits an event
export default observe(MyComponent);
