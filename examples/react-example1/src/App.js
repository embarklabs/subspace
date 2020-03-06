import React, {Component} from "react";
import {$average, $max, $min, $latest} from "@embarklabs/subspace";
import {map} from "rxjs/operators";
import ProductComponent from "./ProductComponent";
import ContractInstance from "./ContractDeployer";
import {abi, address} from "./contract.json";
import {withSubspace, SubspaceProvider} from "@embarklabs/subspace-react";
import Web3 from "web3";

let Product;

class FormComponent extends Component {
  state = {
    userTitle: "",
    userRating: 0,

    minRating: 0,
    maxRating: 0,
    averageRating: 0
  };

  async componentDidMount() {
    // Product = subspace.contract(ContractInstance()); // would also work
    Product = this.props.subspace.contract({abi, address});

    const rating$ = Product.events.Rating.track()
      .map("rating")
      .pipe(map(x => parseInt(x)));

    this.setState({
      title: Product.methods
        .products(0)
        .track()
        .map("title"), 
      averageRating: rating$.pipe($average()),
      minRating: rating$.pipe($min()),
      maxRating: rating$.pipe($max()),
      last5Ratings: rating$.pipe($latest(5)),
      balance: Product.trackBalance()
    });
  }

  rateProduct = async () => {
    let accounts = await this.props.subspace.web3.eth.getAccounts();
    await Product.methods.rateProduct(0, this.state.userRating).send({from: accounts[0]});
  };

  updateTitle = async () => {
    let accounts = await this.props.subspace.web3.eth.getAccounts();
    await Product.methods.editProduct(0, this.state.userTitle).send({from: accounts[0]});
  };

  sendFunds = async () => {
    let accounts = await this.props.subspace.web3.eth.getAccounts();
    await this.props.subspace.web3.eth.sendTransaction({
      value: this.state.contractFunds,
      to: Product.options.address,
      from: accounts[0]
    });
  };

  render() {
    return (
      <div>
        <button onClick={this.rateProduct}>Rate Product</button>
        <input
          type="number"
          value={this.state.userRating}
          onChange={evt => this.setState({userRating: parseInt(evt.target.value)})}
        />

        <button onClick={this.updateTitle}>Update Title</button>
        <input
          type="string"
          value={this.state.userTitle}
          onChange={evt => this.setState({userTitle: evt.target.value})}
        />

        <button onClick={this.sendFunds}>Send Funds</button>
        <input
          type="string"
          value={this.state.contractFunds}
          onChange={evt => this.setState({contractFunds: parseInt(evt.target.value)})}
        />

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

const Form = withSubspace(FormComponent);

const App = () => {
  const web3 = new Web3("ws://localhost:8545");
  return (
    <SubspaceProvider web3={web3}>
      <Form />
    </SubspaceProvider>
  );
};

export default App;
