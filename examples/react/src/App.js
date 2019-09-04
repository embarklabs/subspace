import React from "react";
import Phoenix from "phoenix";
import { web3, MyContract, onWeb3Available } from "./ethService";
import { scan } from 'rxjs/operators';

import MyComponentObserver from "./MyComponentObserver";

let MyContractInstance;

class App extends React.Component {
  state = {
    myEventObservable$: null
  };

  componentDidMount() {
    // Verify if web3 connection is available
    onWeb3Available(async () => {
      MyContractInstance = await MyContract.deploy().send({ from: web3.eth.defaultAccount });

      const eventSyncer = new Phoenix(web3.currentProvider);
      eventSyncer.init().then(() => {
        const myEventObservable$ = eventSyncer.trackEvent(MyContractInstance, "MyEvent", {filter: {}, fromBlock: 1 });

        // If you want to return all the events in an array, you can pipe the scan operator to the observable
        // const myEventObservable$ = eventSyncer.trackEvent(MyContractInstance, "MyEvent", {filter: {}, fromBlock: 1 })
        //                                      .pipe(scan((accum, val) => [...accum, val], []));
        // Your observable component would receive the eventData as an array instead of an object

        this.setState({ myEventObservable$ });
      });
    });
  }

  createTrx = () => {
    MyContractInstance.methods
      .myFunction()
      .send({ from: web3.eth.defaultAccount });
  };

  render() {
    return (
      <div>
        <button onClick={this.createTrx}>Create a Transaction</button>
        <MyComponentObserver eventData={this.state.myEventObservable$} />
      </div>
    );
  }
}

export default App;
