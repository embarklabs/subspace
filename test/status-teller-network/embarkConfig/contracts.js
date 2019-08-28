const LICENSE_PRICE = "10000000000000000000"; // 10 * Math.pow(10, 18)
const ARB_LICENSE_PRICE = "10000000000000000000"; // 10 * Math.pow(10, 18)
const FEE_MILLI_PERCENT = "1000"; // 1 percent
const BURN_ADDRESS = "0x0000000000000000000000000000000000000002";

const dataMigration = require('./data.js');

let secret = {};
try {
  secret = require('../.secret.json');
} catch(err) {
  console.dir("warning: .secret.json file not found; this is only needed to deploy to testnet or livenet etc..");
}

module.exports = {
  // default applies to all environments
  default: {
    // Blockchain node to deploy the contracts
    deployment: {
      host: "localhost", // Host of the blockchain node
      port: 8546, // Port of the blockchain node
      type: "ws" // Type of connection (ws or rpc),
      // Accounts to use instead of the default account to populate your wallet
      // The order here corresponds to the order of `web3.eth.getAccounts`, so the first one is the `defaultAccount`
      /*,accounts: [
        {
          privateKey: "your_private_key",
          balance: "5 ether"  // You can set the balance of the account in the dev environment
                              // Balances are in Wei, but you can specify the unit with its name
        },
        {
          privateKeyFile: "path/to/file", // Either a keystore or a list of keys, separated by , or ;
          password: "passwordForTheKeystore" // Needed to decrypt the keystore file
        },
        {
          mnemonic: "12 word mnemonic",
          addressIndex: "0", // Optionnal. The index to start getting the address
          numAddresses: "1", // Optionnal. The number of addresses to get
          hdpath: "m/44'/60'/0'/0/" // Optionnal. HD derivation path
        },
        {
          "nodeAccounts": true // Uses the Ethereum node's accounts
        }
      ]*/
    },
    // order of connections the dapp should connect to
    dappConnection: [
      "$WEB3",  // uses pre existing web3 object if available (e.g in Mist)
      "ws://localhost:8546",
      "http://localhost:8545"
    ],

    // Automatically call `ethereum.enable` if true.
    // If false, the following code must run before sending any transaction: `await EmbarkJS.enableEthereum();`
    // Default value is true.
    // dappAutoEnable: true,

    gas: "auto",

    // Strategy for the deployment of the contracts:
    // - implicit will try to deploy all the contracts located inside the contracts directory
    //            or the directory configured for the location of the contracts. This is default one
    //            when not specified
    // - explicit will only attempt to deploy the contracts that are explicity specified inside the
    //            contracts section.
    strategy: 'explicit',

    contracts: {
      OwnedUpgradeabilityProxy: {
        deploy: false
      },
      License: {
        deploy: false
      },
      SellerLicense: {
        instanceOf: "License",
        args: [
          "$SNT",
          LICENSE_PRICE,
          BURN_ADDRESS  // TODO: replace with "$StakingPool"
        ]
      },
      SellerLicenseProxy: {
        instanceOf: "OwnedUpgradeabilityProxy"
      },
      ArbitrationLicense: {
        args: [
          "$SNT",
          ARB_LICENSE_PRICE,
          BURN_ADDRESS  // TODO: replace with "$StakingPool"
        ]
      },
      ArbitrationLicenseProxy: {
        instanceOf: "OwnedUpgradeabilityProxy"
      },
      "MetadataStore": {
        args: ["$SellerLicense", "$ArbitrationLicense"]
      },
      MetadataStoreProxy: {
        instanceOf: "OwnedUpgradeabilityProxy"
      },
      "RLPReader": {
        file: 'tabookey-gasless/contracts/RLPReader.sol'
      },
      "RelayHub": {
        file: 'tabookey-gasless/contracts/RelayHub.sol'
      },
      EscrowRelay: {
        args: ["$MetadataStoreProxy", "$EscrowProxy", "$SNT"],
        deps: ['RelayHub'],
        onDeploy: [
          "EscrowRelay.methods.setRelayHubAddress('$RelayHub').send()",
          "RelayHub.methods.depositFor('$EscrowRelay').send({value: 1000000000000000000})"
        ]
      },
      Escrow: {
        args: ["0x0000000000000000000000000000000000000000", "$SellerLicense", "$ArbitrationLicense", "$MetadataStore", "$KyberFeeBurner", FEE_MILLI_PERCENT]
      },
      EscrowProxy: {
        instanceOf: "OwnedUpgradeabilityProxy"
      },
      "MiniMeToken": { "deploy": false },
      "MiniMeTokenFactory": { },
      "Fees": {
        "deploy": false
      },
      "SNT": {
        "instanceOf": "MiniMeToken",
        "args": [
          "$MiniMeTokenFactory",
          "0x0000000000000000000000000000000000000000",
          0,
          "TestMiniMeToken",
          18,
          "STT",
          true
        ]
      },

      /*
      "StakingPool": {
        file: 'staking-pool/contracts/StakingPool.sol',
        args: [
          "$SNT"
        ]
      },
      */
     
      KyberNetworkProxy: {
      },
      KyberFeeBurner: { // TODO: replace BURN_ADDRESS with "$StakingPool"
        args: ["$SNT", BURN_ADDRESS, "$KyberNetworkProxy", "0x0000000000000000000000000000000000000000"]
      }
    }
  },

  // default environment, merges with the settings in default
  // assumed to be the intended environment by `embark run`
  development: {
    contracts: {
      StandardToken: { },
      DAI: { instanceOf: "StandardToken", onDeploy: ["DAI.methods.mint('$accounts[0]', '20000000000000000000').send()"] },
      MKR: { instanceOf: "StandardToken", onDeploy: ["MKR.methods.mint('$accounts[0]', '20000000000000000000').send()"] }
    },
    deployment: {
      // The order here corresponds to the order of `web3.eth.getAccounts`, so the first one is the `defaultAccount`
      accounts: [
        {
          nodeAccounts: true
        },
        {
          mnemonic: "foster gesture flock merge beach plate dish view friend leave drink valley shield list enemy",
          balance: "5 ether",
          numAddresses: "10"
        }
      ]
    },
    afterDeploy: dataMigration.bind(null, LICENSE_PRICE, ARB_LICENSE_PRICE, FEE_MILLI_PERCENT, BURN_ADDRESS)
  },

  // merges with the settings in default
  // used with "embark run privatenet"
  privatenet: {
  },

  // merges with the settings in default
  // used with "embark run testnet"
  testnet: {
    tracking: 'shared.rinkeby.json',
    deployment: {
      accounts: [
        {
          mnemonic: secret.mnemonic,
          hdpath: secret.hdpath || "m/44'/60'/0'/0/",
          numAddresses: "10"
        }
      ],
      host: `rinkeby.infura.io/${secret.infuraKey}`,
      port: false,
      protocol: 'https',
      type: "rpc"
    },
    afterDeploy: dataMigration.bind(null, LICENSE_PRICE, ARB_LICENSE_PRICE, FEE_MILLI_PERCENT, BURN_ADDRESS),
    dappConnection: ["$WEB3"],
    contracts: {
      StandardToken: { },
      DAI: { instanceOf: "StandardToken", onDeploy: ["DAI.methods.mint('$accounts[0]', '20000000000000000000').send()"] },
      MKR: { instanceOf: "StandardToken", onDeploy: ["MKR.methods.mint('$accounts[0]', '20000000000000000000').send()"] },
      KyberNetworkProxy: {
        // https://developer.kyber.network/docs/Environments-Rinkeby/
        address: "0xF77eC7Ed5f5B9a5aee4cfa6FFCaC6A4C315BaC76"
      },
      RelayHub: {
        address: '0xd216153c06e857cd7f72665e0af1d7d82172f494'
      },
      EscrowRelay: {
        args: ["$MetadataStoreProxy", "$EscrowProxy", "$SNT"],
        deps: ['RelayHub'],
        onDeploy: [
          "EscrowRelay.methods.setRelayHubAddress('$RelayHub').send()",
          "RelayHub.methods.depositFor('$EscrowRelay').send({value: 10000000000000000})"
        ]
      }
    }
  },

  ropsten: {
    gasPrice: "10000000000",
    tracking: 'shared.ropsten.json',
    contracts: {
      EscrowRelay: {
        args: ["$MetadataStoreProxy", "$EscrowProxy", "$SNT"],
        deps: ['RelayHub'],
        onDeploy: [
          "EscrowRelay.methods.setRelayHubAddress('$RelayHub').send({gasPrice: 20000000000, gas: 1000000})",
          "RelayHub.methods.depositFor('$EscrowRelay').send({gasPrice: 20000000000, value: 100000000000000000, gas: 1000000})"
        ]
      },
      Escrow: {
        args: ["0x0000000000000000000000000000000000000000", "$SellerLicenseProxy", "$ArbitrationLicenseProxy", "$MetadataStoreProxy", BURN_ADDRESS, FEE_MILLI_PERCENT]
      },
      SNT: {
        address: "0xc55cf4b03948d7ebc8b9e8bad92643703811d162"
      },
      "RLPReader": {
        deploy: false
      },
      "RelayHub": {
        address: "0x1349584869A1C7b8dc8AE0e93D8c15F5BB3B4B87"
      },
      "MiniMeTokenFactory": {
        deploy: false
      },
      KyberNetworkProxy: {
        // https://developer.kyber.network/docs/Environments-Ropsten/
        address: "0x818E6FECD516Ecc3849DAf6845e3EC868087B755"
      }
    },
    deployment: {
      accounts: [
        {
          mnemonic: secret.mnemonic,
          hdpath: secret.hdpath || "m/44'/60'/0'/0/",
          numAddresses: "10"
        }
      ],
      host: `ropsten.infura.io/${secret.infuraKey}`,
      port: false,
      protocol: 'https',
      type: "rpc"
    },
    afterDeploy: dataMigration.bind(null, LICENSE_PRICE, ARB_LICENSE_PRICE, FEE_MILLI_PERCENT, BURN_ADDRESS),
    dappConnection: ["$WEB3"]
  },

  // merges with the settings in default
  // used with "embark run livenet"
  livenet: {
    contracts: {
      KyberNetworkProxy: {
        // https://developer.kyber.network/docs/Environments-Mainnet/
        address: "0x818E6FECD516Ecc3849DAf6845e3EC868087B755"
      }
    }
  }

  // you can name an environment with specific settings and then specify with
  // "embark run custom_name" or "embark blockchain custom_name"
  //custom_name: {
  //}
};
