import store from './store';
import web3 from './web3';
import { deployContract } from './actions';

web3.eth.net.isListening().then(result => {
  if(!result){
    console.error("Error connecting to provider");
    return;
  }

  // Deploy contract as soon as web3 is available
  store.dispatch(deployContract());
});


// Log the initial state
console.log(store.getState())

// Every time the state changes, log it
store.subscribe(() => console.log("=====\n", store.getState()))
