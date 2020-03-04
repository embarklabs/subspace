import React, {useState, useEffect} from "react";
import PropTypes from "prop-types";
import Subspace from "../index";
import SubspaceContext from "./subspaceContext";

const SubspaceProvider = ({children, provider}) => {
  const [subspace, setSubspace] = useState();

  useEffect(() => {
    const s = new Subspace(provider);
    s.init();

    setSubspace(s);
  }, [provider]);

  if (!subspace) return null;

  return <SubspaceContext.Provider value={subspace}>{children}</SubspaceContext.Provider>;
};

SubspaceProvider.defaultProps = {
  children: null
};

SubspaceProvider.propTypes = {
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
  provider: PropTypes.object.isRequired
};

export default SubspaceProvider;
