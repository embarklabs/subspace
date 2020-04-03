import React, {useState, useEffect} from "react";
import PropTypes from "prop-types";
import Subspace from "@embarklabs/subspace";
import SubspaceContext from "./subspaceContext";

function SubspaceProvider({children, web3, options}) {
  const [subspace, setSubspace] = useState();

  useEffect(() => {
    let s;
    (async () => {
      s = new Subspace(web3, options);
      await s.init();
      setSubspace(s);
    })();

    return () => {
      if(s) s.close();
    };
  }, [web3]);

  if (!subspace) return null;

  return <SubspaceContext.Provider value={subspace}>{children}</SubspaceContext.Provider>;
}

SubspaceProvider.defaultProps = {
  children: null,
  options: {}
};

SubspaceProvider.propTypes = {
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
  web3: PropTypes.object.isRequired
};

export default SubspaceProvider;
