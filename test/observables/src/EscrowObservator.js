import React from "react";
import observe from "./observe";

const Escrow = props => {
  const { escrow, myCustomProperty } = props;
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
