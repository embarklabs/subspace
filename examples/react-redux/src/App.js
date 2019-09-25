import React from "react";
import Subspace from "phoenix";
import web3 from './web3';
import MyContract from './MyContract';
import { connect } from "react-redux";
import { myAction } from './actions';
import PropTypes from 'prop-types';

let MyContractInstance;
let eventSubscription;

class App extends React.Component {
  async componentDidMount() {
    MyContractInstance = await MyContract.getInstance();

    const eventSyncer = new Subspace(web3.currentProvider);
    await eventSyncer.init();
    eventSubscription = eventSyncer.trackEvent(MyContractInstance, "MyEvent", { filter: {}, fromBlock: 1 })
                                   .subscribe(this.props.myAction);
  }

  componentWillUnmount(){
    eventSubscription.unsubscribe();
  }

  createTrx = () => {
    MyContractInstance.methods
      .myFunction()
      .send({ from: web3.eth.defaultAccount });
  };

  render() {
    const { data } = this.props;
    
    return (
      <div>
        <button onClick={this.createTrx}>Create a Transaction</button>
        <ul>
          <li><b>someValue: </b> {data.someValue}</li>
          <li><b>anotherValue: </b> {data.anotherValue}</li>
        </ul>
      </div>
    );
  }
}

App.propTypes = {
  data: PropTypes.object,
  myAction: PropTypes.func
};

export default connect(
  ({ data }) => ({ data }),
  { myAction }
)(App);
