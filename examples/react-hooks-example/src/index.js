import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { SubspaceProvider } from '@embarklabs/subspace-react';
import Web3 from 'web3';

const web3 = new Web3("https://cloudflare-eth.com");

const rootElement = document.getElementById('root')
ReactDOM.render(
  <SubspaceProvider web3={web3}>
    <App />
  </SubspaceProvider>,
  rootElement
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
