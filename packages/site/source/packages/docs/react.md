# React
Subspace also provides a set of components that simplifies its usage within React projects through the `@embarklabs/subspace-react` package.

### Install
You can install it through npm or yarn:
```
npm install --save @embarklabs/subspace-react web3 rxjs # RxJS and Web3.js are needed peer-dependencies
```

### Usage

#### SubspaceProvider
To use most of the `subspace-react` components, you need to wrap your app with the `<SubspaceProvider web3={web3} />` component. This will make Subspace available to any nested components that accesses it via the `useSubspace` hook or has been wrapped in the `withSubspace` higher order component. Any React component might use Subspace so it makes sense to add the provider near the top level of your dApp. The `SubspaceProvider` requires a web3 object

```js
// index.js
import React from 'react'
import ReactDOM from 'react-dom'
import MyApp from './MyApp'
import { SubspaceProvider } from '@embarklabs/subspace-react';

const web3 = new Web3("ws://localhost:8545");

const rootElement = document.getElementById('root')
ReactDOM.render(
  <SubspaceProvider web3={web3}>
    <MyApp />
  </SubspaceProvider>,
  rootElement
);
```


#### useSubspace
Rather than relying on global variables or passing Subspace through props, The easiest way to access Subspace features is via the `useSubspace` hook. Be sure that your entire dApp is wrapped with a `<SubspaceProvider />` to have it available througout the component tree.
```js
// index.js
import React from 'react'
import { useSubspace } from '@embarklabs/subspace-react';

const MyComponent = () => {
  const subspace = useSubspace();

  // do something....
  // subspace.trackBalance(web3.eth.defaultAccount);

  return ...;
}

export default MyComponent
```


#### withSubspace
This higher order component is provided as an alternative to the `useSubspace` hook. This injects the `subspace` property with an already initialized Subspace instance. Just like with the hook, your entire dApp needs to be wrapped with a `<SubspaceProvider />`.

```js
// index.js
import React from 'react'
import { withSubspace } from '@embarklabs/subspace-react';

const MyComponent = (props) => {
  // do something....
  // props.subspace.trackBalance(web3.eth.defaultAccount);

  return ...;
}

export default withSubspace(MyComponent);
```


#### observe

Useful to make your component subscribe to any observable props it receives when the component is mounted and automatically unsubscribes when the component is unmounted. It can be used with any kind of observables.


```js
import { observe } from '@embarklabs/subspace-react';

const ObserverComponent = observe(WrappedComponent);
```

##### Example usage:
```js
const MyComponent = ({eventData}) =>  {
  // Handle initial state when no data is available
  if (!eventData) {
    return <p>No data</p>;
  }
  
  return <p>Value: {eventData.someReturnValue}</p>
};


const MyEnhancedComponent = observe(MyComponent);


const SomeOtherComponent = () => {
  const myObservable$ = MyContractInstance.events.MyEvent.track({fromBlock: 1});
  return <MyEnhancedComponent myProp={myObservable$} />;
}
```


<div class="c-notification c-notification--warning">
<h3>Handling Contract Objects</h3>
The variable <code>MyContractInstance</code> is a <code>web3.eth.Contract</code> object pointing to a deployed contract address that has been enhanced with <code>subspace.contract()</code>. You can use a DApp framework like <a href="https://embark.status.im/docs/contracts_javascript.html" />Embark</a> to easily import that contract instance: <code>import { MyContract } from './embarkArtifacts/contracts';</code>.
</div>


<div class="c-notification">
To learn more about how to use <code>subspace-react</code>, there are full working examples available in <a href="https://github.com/embark-framework/subspace/tree/master/examples/" target="_blank">Github</a> 
</div>
