import React from "react";
import { observe } from "@status-im/subspace/react";

const ProductComponent = ({ maxRating, minRating, averageRating, title, balance }) => {
  // Handle initial state when no data is available
  if (!maxRating && !minRating && !averageRating) {
    return <p>No data</p>;
  }

  return <ul>
    <li><b>title: </b> {title}</li>
    <li><b>minimum rating: </b> {minRating}</li>
    <li><b>maximum rating: </b> {maxRating}</li>
    <li><b>average rating: </b> {averageRating}</li>
    <li><b>balance in contract:</b> {balance}</li>
  </ul>;
};

// MyComponent will now observe any observable prop it receives
// and update its state whenever the observable emits an event
export default observe(ProductComponent);
