# redux 

**Subspace** can be used with [redux](https://redux.js.org/). **Subspace** returns [`Observables`](https://rxjs-dev.firebaseapp.com/guide/observable), which you can subscribe to, and if this subscription has access to the redux store, it will be able to dispatch actions when the observable emits an event.

### Example
Here's a simple example on how to setup **Subspace** to work with `redux`:

<div class="c-notification">
This example is available in <a href="https://github.com/embarklabs/subspace/tree/master/examples/redux" target="_blank">Github</a>
</div>

#### index.js
```js
import store from './store';
import web3 from './web3';
import Subspace from '@embarklabs/subspace';
import { myAction } from './actions';

const run = async () => {
  const MyContractInstance = ...; // TODO: obtain a web3.eth.contract instance

  const subspace = new Subspace(web3);
  await subspace.init();
    
  subspace.trackEvent(MyContractInstance, "MyEvent", {filter: {}, fromBlock: 1 })
             .subscribe(eventData => {
               store.dispatch(myAction(eventData));
             });
}

run();
```
<div class="c-notification c-notification--warning">
<h3>Handling Contract Objects</h3>
The variable <code>MyContractInstance</code> is a <code>web3.eth.Contract</code> object pointing to a deployed contract address. You can use a DApp framework like <a href="https://embark.status.im/docs/contracts_javascript.html">Embark</a> to easily import that contract instance: <code>import { MyContract } from './embarkArtifacts/contracts';</code>, or use web3.js directly (just like in the example <a href="https://github.com/embarklabs/subspace/blob/master/examples/redux/src/MyContract.js#L36-L42" target="_blank">source code</a>)
</div>

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

<div class="c-notification">
<h3>Using React and Redux</h3>
A practical example can also be found in <code>examples/react-redux</code>.
</div>