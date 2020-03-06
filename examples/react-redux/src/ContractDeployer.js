const abi = [
	{
		"constant": false,
		"inputs": [],
		"name": "myFunction",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"name": "someValue",
				"type": "uint256"
			},
			{
				"indexed": false,
				"name": "anotherValue",
				"type": "bytes32"
			}
		],
		"name": "MyEvent",
		"type": "event"
	}
];

const data = "0x6080604052348015600f57600080fd5b5060f38061001e6000396000f3fe6080604052600436106039576000357c010000000000000000000000000000000000000000000000000000000090048063c3780a3a14603e575b600080fd5b348015604957600080fd5b5060506052565b005b60004342029050600081604051602001808281526020019150506040516020818303038152906040528051906020012090507fc3d6130248b5b68a864c047b2f68d895d420924130388d02d64b648005fe9ac78282604051808381526020018281526020019250505060405180910390a1505056fea165627a7a72305820613e35c5d1e8684ef5b31a7d993a139f1b5bbb409039d92db0fe78ed571d2ce20029";

const getInstance = async web3 => {
	if(!web3.eth.defaultAccount){
		const accounts = await web3.eth.getAccounts();
		web3.eth.defaultAccount = accounts[0];
	}

	const MyContract = new web3.eth.Contract(abi, {data, gas: "470000"});
	return MyContract.deploy().send({from: web3.eth.defaultAccount});
}


export default getInstance;
