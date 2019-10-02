import web3 from './web3';
import {abi, address} from './contract.json'

const MyContract = new web3.eth.Contract(abi, {from: web3.eth.default,  gas: "800000"});
MyContract.options.address = address;

MyContract.getInstance = async () => {
  if (!web3.eth.defaultAccount) {
    const accounts = await web3.eth.getAccounts();
    web3.eth.defaultAccount = accounts[0];
  }
  MyContract.options.from = web3.eth.defaultAccount;
  return MyContract;
}

export default MyContract;
