import React from "react";
import { observe } from "phoenix/react";

const RankItem = ({ items, onUpvote, onDownvote }) => {
  if (!items) return null;

  return items.map((item, i) => (
    <div key={i} className="item">
      <b>{i + 1}</b> - {item.addr}
      <br />
      Upvotes: {item.upvotes} - Downvotes: {item.downvotes}
      <br />
      <button onClick={onUpvote(item.addr)}>Upvote</button> |{" "}
      <button onClick={onDownvote(item.addr)}>Downvote</button>
    </div>
  ));
};

export default observe(RankItem);
