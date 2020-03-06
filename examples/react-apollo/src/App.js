import {ApolloProvider} from "@apollo/react-hooks";
import {SubspaceProvider, useSubspace} from "@embarklabs/subspace-react";
import {InMemoryCache} from "apollo-cache-inmemory";
import ApolloClient from "apollo-client";
import {ReactiveSchemaLink} from "apollo-link-reactive-schema";
import React, {useEffect, useState} from "react";
import Web3 from "web3";
import getInstance from "./ContractDeployer";
import getSchema from "./schema";
import MyEvent from "./MyEvent";

const Main = () => {
  const subspace = useSubspace();
  const [MyContractInstance, setContractInstance] = useState();
  const [client, setClient] = useState();

  useEffect(() => {
    getInstance(subspace.web3).then(instance => {
      setContractInstance(subspace.contract(instance));
    });
  }, [subspace]);

  useEffect(() => {
    if (!MyContractInstance) return;

    const c = new ApolloClient({
      cache: new InMemoryCache(),
      link: new ReactiveSchemaLink({schema: getSchema(MyContractInstance)})
    });

    setClient(c);
  }, [subspace, MyContractInstance]);

  const createTrx = () => {
    if (!MyContractInstance) return;
    MyContractInstance.methods.myFunction().send({from: subspace.web3.eth.defaultAccount});
  };

  if (!client) return <div>Loading...</div>;

  return (
    <ApolloProvider client={client}>
      <button onClick={createTrx}>Create a Transaction</button>
      <MyEvent />
    </ApolloProvider>
  );
};

const App = () => {
  const web3 = new Web3("ws://localhost:8545");
  return (
    <SubspaceProvider web3={web3}>
      <Main />
    </SubspaceProvider>
  );
};

export default App;
