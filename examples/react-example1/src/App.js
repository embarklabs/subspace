import React from "react";
import Subspace from "@status-im/subspace";
import { $average, $max, $min, $latest } from "@status-im/subspace";
import { map } from 'rxjs/operators';
import ProductComponent from "./ProductComponent";
import web3 from './web3';
import ProductContract from './MyContract';

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

    Product = await ProductContract.getInstance();
    const rating$ = subspace.trackEvent(Product, "Rating").pipe(map(x => parseInt(x.rating)));

    window.Product = Product;
    window.web3 = web3;

    this.setState({
      title: subspace.trackProperty(Product, "products", [0]).pipe(map(x => x.title)),
      averageRating: rating$.pipe($average()),
      minRating: rating$.pipe($min()),
      maxRating: rating$.pipe($max()),
      last5Ratings: rating$.pipe($latest(5)),
      balance: subspace.trackBalance(Product.options.address)
    });
  }

  rateProduct = async () => {
    await Product.methods.rateProduct(0, this.state.userRating).send();
  };

  updateTitle = async () => {
    await Product.methods.editProduct(0, this.state.userTitle).send();
  };

  sendFunds = async () => {
    await web3.eth.sendTransaction({value: this.state.contractFunds, to: Product.options.address});
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
