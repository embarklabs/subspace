import React, {useState, useEffect} from "react";
import {SubspaceProvider, useSubspace} from "@embarklabs/subspace-react";
import Web3 from "web3";
import {connect} from "react-redux";
import {myAction} from "./actions";
import getInstance from "./ContractDeployer";

const FormComponent = ({data, myAction}) => {
  const subspace = useSubspace();
  const [MyContractInstance, setContractInstance] = useState();

  useEffect(() => {
    getInstance(subspace.web3).then(instance => {
      setContractInstance(subspace.contract(instance));
    });
  }, [subspace]);

  useEffect(() => {
    if (!MyContractInstance) return;
    const subscription = MyContractInstance.events.MyEvent.track({filter: {}, fromBlock: 1}).subscribe(myAction);

    return () => {
      // Clean up the subscription
      subscription.unsubscribe();
    };
  }, [subspace, MyContractInstance, myAction]);

  const createTrx = () => {
    if (!MyContractInstance) return;
    MyContractInstance.methods.myFunction().send({from: subspace.web3.eth.defaultAccount});
  };

  return (
    <div>
      <button onClick={createTrx} disabled={!MyContractInstance}>
        Create a Transaction
      </button>
      <ul>
        <li>
          <b>someValue: </b> {data.someValue}
        </li>
        <li>
          <b>anotherValue: </b> {data.anotherValue}
        </li>
      </ul>
    </div>
  );
};

const Form = connect(({data}) => ({data}), {myAction})(FormComponent);

const App = () => {
  const web3 = new Web3("ws://localhost:8545");
  return (
    <SubspaceProvider web3={web3}>
      <Form />
    </SubspaceProvider>
  );
};

export default App;
