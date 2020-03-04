import React, {useContext} from "react";
import SubspaceContext from "./subspaceContext";

const useSubspace = () => {
  const subspace = useContext(SubspaceContext);

  if (!subspace) {
    throw new Error(
      "could not find subspace context value; please ensure the component is wrapped in a <SubspaceProvider>"
    );
  }

  return subspace;
};

export default useSubspace;
