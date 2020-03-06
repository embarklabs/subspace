import React from "react";
import {useQuery} from "@apollo/react-hooks";
import {MY_QUERY} from "./queries";

const MyEvent = () => {
  const {loading, error, data} = useQuery(MY_QUERY);
  if (loading) return <div>No data available...</div>;
  if (error) {
    console.error(error);
    return <div>Error :(</div>;
  }
  return (
    <div>
      <p>The data returned by the query:</p>
      <ul>
        <li>someValue: {data.myEvents.someValue}</li>
        <li>anotherValue: {data.myEvents.anotherValue}</li>
      </ul>
    </div>
  );
};

export default MyEvent;
