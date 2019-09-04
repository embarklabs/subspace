import React from "react";
import {observe} from "phoenix/react";

const MyComponent = props => {
  const { escrow, myCustomProperty } = props;
  if(!escrow) return <p>Loading...</p>;
  return (
    <ul>
      <li>
        {escrow.buyer} {escrow.seller} - <b>EscrowID:{escrow.escrowId}</b>{" "}
        <small>{myCustomProperty}</small>
      </li>
    </ul>
  );
};

export default observe(MyComponent);
