import React, {useState, useEffect} from "react";
import Web3 from "web3";
import { SubspaceProvider, useSubspace } from "@embarklabs/subspace-react";
import MyComponentObserver from "./MyComponentObserver";
import getInstance from "./ContractDeployer";

const Form = () => {
  const subspace = useSubspace();
  const [MyContractInstance, setContractInstance] = useState();
  const [myObservable$, setObservable] = useState();

  useEffect(() => {
    getInstance(subspace.web3).then(instance => {
      setContractInstance(subspace.contract(instance));
    });
  }, [subspace]);

  useEffect(() => {
    if (!MyContractInstance) return;
    const observable = MyContractInstance.events.MyEvent.track({filter: {}, fromBlock: 1});

    // If you want to return all the events in an array, you can pipe the scan operator to the observable
    // const observable = MyContractInstance.events.MyEvent.track({filter: {}, fromBlock: 1})
    //                                                     .pipe(scan((accum, val) => [...accum, val], []));
    //                                      
    // Your observable component would receive the eventData as an array instead of an object

    setObservable(observable);
  }, [subspace, MyContractInstance]);

  const createTrx = () => {
    if(!MyContractInstance) return;
      MyContractInstance.methods.myFunction().send({from: subspace.web3.eth.defaultAccount});
  };
  
  return (
    <div>
      <button onClick={createTrx} disabled={!MyContractInstance}>Create a Transaction</button>
      <MyComponentObserver eventData={myObservable$} />
    </div>
  );
}


const App = () => {
  const web3 = new Web3("ws://localhost:8545");
  return (
    <SubspaceProvider web3={web3}>
      <Form />
    </SubspaceProvider>
  );
};

export default App;
