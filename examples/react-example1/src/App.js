import React from "react";
import Subspace from "@embarklabs/subspace";
import { $average, $max, $min, $latest } from "@embarklabs/subspace";
import { map } from 'rxjs/operators';
import ProductComponent from "./ProductComponent";
import web3 from './web3';

import {abi, address} from './contract.json'

let Product;

class App extends React.Component {
  state = {
    userTitle: "",
    userRating: 0,
    minRating: 0,
    maxRating: 0,
    averageRating: 0
  };

  async componentDidMount() {
    const subspace = new Subspace(web3.currentProvider);
    await subspace.init();

    // Product = subspace.contract(ContractInstance); // would also work
    Product = subspace.contract({abi, address});

    const rating$ = Product.events.Rating.track().map("rating").pipe(map(x => parseInt(x)));

    this.setState({
      title: Product.methods.products(0).track().map('title'),
      averageRating: rating$.pipe($average()),
      minRating: rating$.pipe($min()),
      maxRating: rating$.pipe($max()),
      last5Ratings: rating$.pipe($latest(5)),
      balance: Product.trackBalance()
    });
  }

  rateProduct = async () => {
    let accounts = await web3.eth.getAccounts();
    await Product.methods.rateProduct(0, this.state.userRating).send({from: accounts[0]});
  };

  updateTitle = async () => {
    let accounts = await web3.eth.getAccounts();
    await Product.methods.editProduct(0, this.state.userTitle).send({from: accounts[0]});
  };

  sendFunds = async () => {
    let accounts = await web3.eth.getAccounts();
    await web3.eth.sendTransaction({value: this.state.contractFunds, to: Product.options.address, from: accounts[0]});
  };

  render() {
    return (
      <div>
        <button onClick={this.rateProduct}>Rate Product</button>
        <input type="number" value={this.state.userRating} onChange={(evt) => this.setState({userRating: parseInt(evt.target.value)}) } />

        <button onClick={this.updateTitle}>Update Title</button>
        <input type="string" value={this.state.userTitle} onChange={(evt) => this.setState({userTitle: evt.target.value}) } />

        <button onClick={this.sendFunds}>Send Funds</button>
        <input type="string" value={this.state.contractFunds} onChange={(evt) => this.setState({contractFunds: parseInt(evt.target.value)}) } />

        <ProductComponent 
          title={this.state.title}
          maxRating={this.state.maxRating}
          minRating={this.state.minRating}
          averageRating={this.state.averageRating}
          balance={this.state.balance}
          last5Ratings={this.state.last5Ratings}
        />
      </div>
    );
  }
}

export default App;
