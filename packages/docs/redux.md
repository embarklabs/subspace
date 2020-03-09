# redux 

**Subspace** can be used with [redux](https://redux.js.org/). **Subspace** returns [`Observables`](https://rxjs-dev.firebaseapp.com/guide/observable), which you can subscribe to, and if this subscription has access to the redux store, it will be able to dispatch actions when the observable emits an event.

### Example
Here's a simple example on how to setup **Subspace** to work with `redux`:

::: tip 
This example is available in [Github](https://github.com/embarklabs/subspace/tree/master/examples/redux)
:::

#### index.js
```js
import store from './store';
import web3 from './web3';
import Subspace from '@embarklabs/subspace';
import { myAction } from './actions';

const run = async () => {
  const MyContractInstance = ...; // TODO: obtain a web3.eth.contract instance

  const subspace = new Subspace("ws://localhost:8545"); // Use a valid provider (geth, parity, infura...)
  await subspace.init();
    
  subspace.trackEvent(MyContractInstance, "MyEvent", {filter: {}, fromBlock: 1 })
             .subscribe(eventData => {
               store.dispatch(myAction(eventData));
             });
}

run();
```
::: warning Handling Contract Objects
The variable `MyContractInstance` is a `web3.eth.Contract` object pointing to a deployed contract address. You can use a DApp framework like [Embark](https://embark.status.im/docs/contracts_javascript.html) to easily import that contract instance: `import { MyContract } from './embarkArtifacts/contracts';`, or use web3.js directly (just like in the example [source code](https://github.com/embarklabs/subspace/blob/master/examples/redux/src/MyContract.js#L36-L42))
:::

#### store.js
```js
import { createStore } from 'redux';
import {myReducer} from './reducer';

export default store = createStore(myReducer);
```

#### reducer.js
```js
import { MY_ACTION } from "./constants";

const initialState = { 
  data: {}
};

export const myReducer = (state = initialState, action) => {
  switch (action.type) {
    case MY_ACTION:
      return { data: action.eventData };
    default:
      return state;
  }
};
```

#### constants.js
```js
export const MY_ACTION = 'MY_ACTION';
```

#### actions.js
```js
import {MY_ACTION} from './constants.js';

export const myAction = eventData => ({type: MY_ACTION, eventData});
```

::: tip Using React and Redux
A practical example can also be found in `examples/react-redux`.
:::