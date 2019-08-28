import React from "react";
import observe from "./observe";

const Escrow = props => {
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

const EscrowObservator = observe(Escrow);

export default EscrowObservator;
