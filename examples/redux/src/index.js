import store from './store';
import web3 from './web3';
import Phoenix from 'phoenix';
import { myAction } from './actions';
import MyContract from './MyContract';

// Log the initial state
console.log(store.getState())

// Every time the state changes, log it
store.subscribe(() => console.log("=====\n", store.getState()))

const run = async () => {
  const MyContractInstance = await MyContract.getInstance(); //

  const eventSyncer = new Phoenix(web3.currentProvider);
  await eventSyncer.init();
    
  eventSyncer.trackEvent(MyContractInstance, "MyEvent", {filter: {}, fromBlock: 1 })
             .subscribe(eventData => {
                store.dispatch(myAction(eventData));
              });

  // Dispatch some actions
  MyContractInstance.methods.myFunction().send({from: web3.eth.defaultAccount});
  MyContractInstance.methods.myFunction().send({from: web3.eth.defaultAccount});
  MyContractInstance.methods.myFunction().send({from: web3.eth.defaultAccount});
}

run();