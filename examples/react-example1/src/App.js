import React from "react";
import Subspace from "@status-im/subspace";
import { $average, $max, $min } from "@status-im/subspace";
import { map } from 'rxjs/operators';
import ProductComponent from "./ProductComponent";
import web3 from './web3';
import ProductContract from './MyContract';
import { subscribe } from "graphql";

let Product;

class App extends React.Component {
  state = {
    title: "",
    minRating: 0,
    maxRating: 0,
    averageRating: 0
  };

  async componentDidMount() {
    Product = await ProductContract.getInstance(); //

    const subspace = new Subspace(web3.currentProvider);
    await subspace.init();

    const rating$ = subspace.trackEvent(Product, "Rating").pipe(map(x => parseInt(x.rating)));

    subspace.trackProperty(Product, "products", [0]).pipe().subscribe(console.dir);

    this.setState({
      averageRating: rating$.pipe($average()),
      minRating: rating$.pipe($min()),
      maxRating: rating$.pipe($max())
    });
  }

  createTrx = async () => {
    const productId = 0;
    const rating = parseInt(this.state.rating)
    window.Product = Product
    await Product.methods.rateProduct(productId, rating).send();
  };

  render() {
    return (
      <div>
        <button onClick={this.createTrx}>Rate Product</button>
        <input type="number" value={this.state.rating} onChange={(evt) => this.setState({rating: evt.target.value}) } />

        <ProductComponent 
          title={this.state.title}
          maxRating={this.state.maxRating}
          minRating={this.state.minRating}
          averageRating={this.state.averageRating}
        />
      </div>
    );
  }
}

export default App;
