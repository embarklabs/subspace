
async function deployEscrowContract(eth) {
    let accounts = await eth.getAccounts();
  
    // pragma solidity >=0.4.22 <0.6.0;
    // contract Escrow {
    //     event Created(uint indexed escrowId, address buyer, address seller);
    //     function createEscrow(uint escrowId, address buyer, address seller) external {
    //         emit Created(escrowId, buyer, seller);
    //     }
    // }
  
    let abi = [
      {
        "constant": false,
        "inputs": [
          {
            "name": "escrowId",
            "type": "uint256"
          },
          {
            "name": "buyer",
            "type": "address"
          },
          {
            "name": "seller",
            "type": "address"
          }
        ],
        "name": "createEscrow",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "escrowId",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "buyer",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "seller",
            "type": "address"
          }
        ],
        "name": "Created",
        "type": "event"
      }
    ]
  
    var contract = new eth.Contract(abi)
    let instance = await contract.deploy({
      data: '0x608060405234801561001057600080fd5b50610184806100206000396000f3fe60806040526004361061003b576000357c01000000000000000000000000000000000000000000000000000000009004806378015cf414610040575b600080fd5b34801561004c57600080fd5b506100b96004803603606081101561006357600080fd5b8101908080359060200190929190803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff1690602001909291905050506100bb565b005b827fcbd6f84bfed2ee8cc01ea152b5d9f7126a72c410dbc5ab04c486a5800627b1908383604051808373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020018273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019250505060405180910390a250505056fea165627a7a72305820cc868ec126578f5508ee248fb823cd9f1ac6deb0562091cdf31843840b2a56410029',
      arguments: []
    }).send({
      from: accounts[0],
      gas: '4700000'
    })
    return instance
  }


async function deployRatingContract(eth) {
  let accounts = await eth.getAccounts();

  // pragma solidity >=0.4.22 <0.6.0;
  // contract Transaction {
  //     event Rating(uint indexed escrowId, uint rating);
  //     function doRating(uint escrowId, uint rating) external {
  //         emit Rating(escrowId, rating);
  //     }
  // }

  let abi = [
    {
      "constant": false,
      "inputs": [
        {
          "name": "escrowId",
          "type": "uint256"
        },
        {
          "name": "rating",
          "type": "uint256"
        }
      ],
      "name": "doRating",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "name": "escrowId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "name": "rating",
          "type": "uint256"
        }
      ],
      "name": "Rating",
      "type": "event"
    }
  ]

  var contract = new eth.Contract(abi);

  contract.options.address = "0x80bc8c15741b89df78a3553a02412c26cf601d23";
  return contract; 

  let instance = await contract.deploy({
    data: '0x608060405234801561001057600080fd5b5060e78061001f6000396000f3fe6080604052600436106039576000357c010000000000000000000000000000000000000000000000000000000090048063f60781a914603e575b600080fd5b348015604957600080fd5b50607d60048036036040811015605e57600080fd5b810190808035906020019092919080359060200190929190505050607f565b005b817ffdefdf8d82459f7b1eb157e5c44cbe6ee73d8ddd387511fe3622a3ee663b4697826040518082815260200191505060405180910390a2505056fea165627a7a7230582067833697a0e2bccb8bd624c0b06b2183641addb24f7931d8ec3979982bb663790029',
    arguments: []
  }).send({
    from: accounts[0],
    gas: '4700000'
  })
  return instance
}


const mine = (web3) => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_mine',
      id: new Date().getTime()
    }, (err, result) => {
      if (err) { return reject(err) }
      return resolve(result)
    })
  })
}
  
  module.exports = {
      deployEscrowContract,
      deployRatingContract,
      mine
  };
  