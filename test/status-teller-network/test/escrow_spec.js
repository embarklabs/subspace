/*global contract, config, it, assert, embark, web3, before, describe, beforeEach*/
const TestUtils = require("../utils/testUtils");

const SellerLicense = embark.require('Embark/contracts/SellerLicense');
const ArbitrationLicense = embark.require('Embark/contracts/ArbitrationLicense');
const MetadataStore = embark.require('Embark/contracts/MetadataStore');
const Escrow = embark.require('Embark/contracts/Escrow');
const StandardToken = embark.require('Embark/contracts/StandardToken');
const SNT = embark.require('Embark/contracts/SNT');

const BURN_ADDRESS = "0x0000000000000000000000000000000000000002";

const PUBKEY_A = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const PUBKEY_B = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";

const ESCROW_CREATED = 0;
const ESCROW_FUNDED = 1;
const _ESCROW_PAID = 2;
const ESCROW_RELEASED = 3;
const ESCROW_CANCELED = 4;

let accounts;
let arbitrator, arbitrator2;
let _deltaTime = 0; // TODO: this can be fixed with ganache-cli v7, and evm_revert/snapshot to reset state between tests

const feePercent = 1;

config({
  deployment: {
    // The order here corresponds to the order of `web3.eth.getAccounts`, so the first one is the `defaultAccount`
    accounts: [
      {
        mnemonic: "foster gesture flock merge beach plate dish view friend leave drink valley shield list enemy",
        balance: "5 ether",
        numAddresses: "10"
      }
    ]
  },
  contracts: {
    "MiniMeToken": { "deploy": false },
    "MiniMeTokenFactory": {

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
    License: {
      deploy: false
    },
    SellerLicense: {
      instanceOf: "License",
      args: ["$SNT", 10, BURN_ADDRESS]
    },
    ArbitrationLicense: {
      args: ["$SNT", 10, BURN_ADDRESS]
    },

    /*
    StakingPool: {
      file: 'staking-pool/contracts/StakingPool.sol',
      args: ["$SNT"]
    },
    */

    MetadataStore: {
      args: ["$SellerLicense", "$ArbitrationLicense"]
    },
    Escrow: {
      args: ["0x0000000000000000000000000000000000000000", "$SellerLicense", "$ArbitrationLicense", "$MetadataStore", BURN_ADDRESS, feePercent * 1000]
    },
    StandardToken: {
    }
  }
}, (_err, web3_accounts) => {
  accounts = web3_accounts;
  arbitrator = accounts[8];
  arbitrator2 = accounts[9];
});

contract("Escrow", function() {

  const {toBN} = web3.utils;

  const tradeAmount = 1000000;
  const feeAmount = Math.round(tradeAmount * (feePercent / 100));

  // util
  let expirationTime = parseInt((new Date()).getTime() / 1000, 10) + (5 * 86400);
  const expireTransaction = async() => {
    const addTime = 5 * 86400;
    await TestUtils.increaseTime(addTime + 1);
    expirationTime += addTime;
  };

  let receipt, escrowId, escrowTokenId, _offerId, sntOfferId, ethOfferId, tokenOfferId, noArbiterOfferId, hash, signature, nonce;
  let created;

  this.timeout(0);

  before(async () => {
    await SNT.methods.generateTokens(accounts[0], 1000).send();
    const encodedCall = SellerLicense.methods.buy().encodeABI();
    await SNT.methods.approveAndCall(SellerLicense.options.address, 10, encodedCall).send({from: accounts[0]});

    // Register arbitrators
    await SNT.methods.generateTokens(arbitrator, 1000).send();
    await SNT.methods.generateTokens(arbitrator2, 1000).send();

    const encodedCall2 = ArbitrationLicense.methods.buy().encodeABI();
    await SNT.methods.approveAndCall(ArbitrationLicense.options.address, 10, encodedCall2).send({from: arbitrator});
    await SNT.methods.approveAndCall(ArbitrationLicense.options.address, 10, encodedCall2).send({from: arbitrator2});

    await ArbitrationLicense.methods.changeAcceptAny(true).send({from: arbitrator});
    await ArbitrationLicense.methods.changeAcceptAny(true).send({from: arbitrator2});

    receipt  = await MetadataStore.methods.addOffer(TestUtils.zeroAddress, PUBKEY_A, PUBKEY_B, "London", "USD", "Iuri", [0], 0, 0, 1, arbitrator).send({from: accounts[0]});
    ethOfferId = receipt.events.OfferAdded.returnValues.offerId;
    receipt  = await MetadataStore.methods.addOffer(StandardToken.options.address, PUBKEY_A, PUBKEY_B, "London", "USD", "Iuri", [0], 0, 0, 1, arbitrator).send({from: accounts[0]});
    tokenOfferId = receipt.events.OfferAdded.returnValues.offerId;
    receipt  = await MetadataStore.methods.addOffer(SNT.options.address, PUBKEY_A, PUBKEY_B, "London", "USD", "Iuri", [0], 0, 0, 1, arbitrator).send({from: accounts[0]});
    sntOfferId = receipt.events.OfferAdded.returnValues.offerId;
  });

  describe("Creating a new escrow", async () => {

    it("Buyer can create escrow", async () => {
      hash = await MetadataStore.methods.getDataHash("Username", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();

      receipt = await Escrow.methods.createEscrow(ethOfferId, 123, 140, PUBKEY_A, PUBKEY_B, "L", "Username", nonce, signature).send({from: accounts[1]});
     
      const created = receipt.events.Created;
      assert(!!created, "Created() not triggered");
      assert.equal(created.returnValues.offerId, ethOfferId, "Invalid offerId");
      assert.equal(created.returnValues.buyer, accounts[1], "Invalid buyer");
    });

    it("Seller should be able to create escrows", async () => {
      hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();

      receipt = await Escrow.methods.createEscrow(ethOfferId, 123, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: accounts[0]});

      const created = receipt.events.Created;
      assert(!!created, "Created() not triggered");

      assert.equal(created.returnValues.offerId, ethOfferId, "Invalid offerId");
      assert.equal(created.returnValues.buyer, accounts[1], "Invalid buyer");
      escrowId = created.returnValues.escrowId;
    });

    it("Created escrow should contain valid data", async () => {
      const escrow = await Escrow.methods.transactions(escrowId).call();

      assert.equal(escrow.offerId, ethOfferId, "Invalid offerId");
      assert.equal(escrow.buyer, accounts[1], "Invalid buyer");
      assert.equal(escrow.tokenAmount, 123, "Invalid trade amount");
      assert.equal(escrow.status, ESCROW_CREATED, "Invalid status");
    });

    it("Seller should be able to fund escrow", async () => {
      hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();

      receipt = await Escrow.methods.createEscrow(ethOfferId, tradeAmount, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: accounts[0]});
      escrowId = receipt.events.Created.returnValues.escrowId;

      receipt = await Escrow.methods.fund(escrowId).send({from: accounts[0], value: tradeAmount + feeAmount});
      const funded = receipt.events.Funded;
      assert(!!funded, "Funded() not triggered");
    });

    it("Funded escrow should contain valid data", async () => {
      const ethFeeBalance = await Escrow.methods.feeTokenBalances(TestUtils.zeroAddress).call();
      assert.strictEqual(parseInt(ethFeeBalance, 10), feeAmount, 'Invalid fee balance');
      const contractBalance = await web3.eth.getBalance(Escrow.options.address);
      assert.equal(contractBalance, feeAmount + tradeAmount, "Invalid contract balance");
      const escrow = await Escrow.methods.transactions(escrowId).call();
      assert.equal(escrow.tokenAmount, tradeAmount, "Invalid amount");
      assert.equal(escrow.status, ESCROW_FUNDED, "Invalid status");
    });

    it("Escrows can be created with ERC20 tokens", async () => {
      await StandardToken.methods.mint(accounts[0], tradeAmount + feeAmount).send();

      const balanceBeforeCreation = await StandardToken.methods.balanceOf(accounts[0]).call();

      await StandardToken.methods.approve(Escrow.options.address, tradeAmount + feeAmount).send({from: accounts[0]});
      const allowance = await StandardToken.methods.allowance(accounts[0], Escrow.options.address).call();
      assert(allowance >= tradeAmount + feeAmount, "Allowance needs to be equal or higher to the amount plus the fee");

      hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();

      receipt = await Escrow.methods.createEscrow(tokenOfferId, tradeAmount, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: accounts[0]});
      const created = receipt.events.Created;
      assert(!!created, "Created() not triggered");
      escrowTokenId = receipt.events.Created.returnValues.escrowId;

      receipt = await Escrow.methods.fund(escrowTokenId).send({from: accounts[0]});
      const funded = receipt.events.Funded;
      assert(!!funded, "Funded() not triggered");

      const balanceAfterCreation = await StandardToken.methods.balanceOf(accounts[0]).call();

      assert(toBN(balanceAfterCreation), toBN(balanceBeforeCreation).sub(toBN(tradeAmount)), "Token value wasn't deducted");

      const contractBalance = await StandardToken.methods.balanceOf(Escrow.options.address).call();

      assert(toBN(contractBalance), toBN(tradeAmount), "Contract token balance is incorrect");

      const escrow = await Escrow.methods.transactions(escrowTokenId).call();

      assert.equal(escrow.tokenAmount, tradeAmount, "Invalid amount");
    });

    it("Can fund an SNT escrow with approveAndCall", async () => {
      await SNT.methods.approve(Escrow.options.address, 0).send({from: accounts[0]});

      await SNT.methods.generateTokens(accounts[0], tradeAmount + feeAmount).send();

      hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();

      let receipt = await Escrow.methods.createEscrow(sntOfferId, tradeAmount, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: accounts[0]});
      const created = receipt.events.Created;
      escrowTokenId = receipt.events.Created.returnValues.escrowId;


      SNT.options.jsonInterface.push(Escrow.options.jsonInterface.find(x => x.name === 'Funded'));
      const encodedCall = Escrow.methods.fund(escrowTokenId).encodeABI();
      receipt = await SNT.methods.approveAndCall(Escrow.options.address, tradeAmount + feeAmount, encodedCall).send({from: accounts[0]});

      const funded = receipt.events.Funded;
      assert(!!funded, "Funded() not triggered");

    });
  });


  describe("Canceling an escrow", async () => {
    it("A seller cannot cancel an unexpired funded escrow", async () => {
      // Create and Fund
      hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();
      receipt = await Escrow.methods.createAndFund(ethOfferId, tradeAmount, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: accounts[0], value: tradeAmount + feeAmount});
      created = receipt.events.Created;
      escrowId = created.returnValues.escrowId;

      try {
        receipt = await Escrow.methods.cancel(escrowId).send({from: accounts[0]});
        assert.fail('should have reverted before');
      } catch (error) {
        assert.strictEqual(error.message, "VM Exception while processing transaction: revert Can only be canceled after expiration");
      }
    });

    it("A seller can cancel their ETH escrows", async () => {
      // Create
      hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();
      receipt = await Escrow.methods.createEscrow(ethOfferId, tradeAmount, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: accounts[1]});
      created = receipt.events.Created;
      escrowId = created.returnValues.escrowId;
      // Fund
      receipt = await Escrow.methods.fund(escrowId).send({from: accounts[0], value: tradeAmount + feeAmount});

      await expireTransaction();

      receipt = await Escrow.methods.cancel(escrowId).send({from: accounts[0]});

      let Canceled = receipt.events.Canceled;
      assert(!!Canceled, "Canceled() not triggered");

      let escrow = await Escrow.methods.transactions(escrowId).call();
      assert.equal(escrow.status, ESCROW_CANCELED, "Should have been canceled");
    });

    it("A seller can cancel their expired token escrows and gets back the fee", async () => {
      await StandardToken.methods.mint(accounts[0], tradeAmount + feeAmount).send();
      await StandardToken.methods.approve(Escrow.options.address, tradeAmount + feeAmount).send({from: accounts[0]});

      const balanceBeforeCreation = await StandardToken.methods.balanceOf(accounts[0]).call();
      const contractBalanceBeforeCreation = await StandardToken.methods.balanceOf(Escrow.options.address).call();

      // Create
      hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();
      receipt = await Escrow.methods.createEscrow(tokenOfferId, tradeAmount, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: accounts[1]});
      created = receipt.events.Created;
      escrowTokenId = created.returnValues.escrowId;
      // Fund
      receipt = await Escrow.methods.fund(escrowTokenId).send({from: accounts[0]});

      await expireTransaction();

      await Escrow.methods.cancel(escrowTokenId).send({from: accounts[0]});

      const balanceAfterCancelation = await StandardToken.methods.balanceOf(accounts[0]).call();
      const contractBalanceAfterCancelation = await StandardToken.methods.balanceOf(Escrow.options.address).call();

      let escrow = await Escrow.methods.transactions(escrowTokenId).call();

      assert.equal(escrow.status, ESCROW_CANCELED, "Should have been canceled");
      assert.equal(balanceBeforeCreation, balanceAfterCancelation, "Invalid seller balance");
      assert.equal(contractBalanceBeforeCreation, contractBalanceAfterCancelation, "Invalid contract balance");
    });

    it("A buyer can cancel an escrow that hasn't been funded yet", async () => {
      // Create
      hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();
      receipt = await Escrow.methods.createEscrow(ethOfferId, tradeAmount, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: accounts[1]});
      created = receipt.events.Created;
      escrowId = created.returnValues.escrowId;
      // Fund
      receipt = await Escrow.methods.fund(escrowId).send({from: accounts[0], value: tradeAmount + feeAmount});

      receipt = await Escrow.methods.cancel(escrowId).send({from: accounts[1]});
      let Canceled = receipt.events.Canceled;
      assert(!!Canceled, "Canceled() not triggered");
    });

    it("A buyer can cancel an escrow that has been funded", async () => {
      // Create
      hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();
      receipt = await Escrow.methods.createEscrow(ethOfferId, tradeAmount, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: accounts[1]});
      created = receipt.events.Created;
      escrowId = created.returnValues.escrowId;
      // Fund
      receipt = await Escrow.methods.fund(escrowId).send({from: accounts[0], value: tradeAmount + feeAmount});

      receipt = await Escrow.methods.cancel(escrowId).send({from: accounts[1]});
      let Canceled = receipt.events.Canceled;
      assert(!!Canceled, "Canceled() not triggered");
    });

    it("An escrow can only be canceled once", async () => {
      // Create
      hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();
      receipt = await Escrow.methods.createEscrow(ethOfferId, tradeAmount, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: accounts[1]});
      created = receipt.events.Created;
      escrowId = created.returnValues.escrowId;
      // Fund
      receipt = await Escrow.methods.fund(escrowId).send({from: accounts[0], value: tradeAmount + feeAmount});

      await expireTransaction();
      receipt = await Escrow.methods.cancel(escrowId).send({from: accounts[0]});

      try {
        receipt = await Escrow.methods.cancel(escrowId).send({from: accounts[0]});
        assert.fail('should have reverted before');
      } catch (error) {
        assert.strictEqual(error.message, "VM Exception while processing transaction: revert Only transactions in created or funded state can be canceled");
      }
    });

    it("Accounts different from the escrow owner cannot cancel escrows", async() => {
      // Create
      hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();
      receipt = await Escrow.methods.createEscrow(ethOfferId, tradeAmount, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: accounts[1]});
      created = receipt.events.Created;
      escrowId = created.returnValues.escrowId;
      // Fund
      receipt = await Escrow.methods.fund(escrowId).send({from: accounts[0], value: tradeAmount + feeAmount});

      try {
        receipt = await Escrow.methods.cancel(escrowId).send({from: accounts[2]});
        assert.fail('should have reverted before');
      } catch (error) {
        assert.strictEqual(error.message, "VM Exception while processing transaction: revert Only participants can invoke this function");
      }
    });

    it("A seller cannot cancel an escrow marked as paid", async () => {
      // Create
      hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();
      receipt = await Escrow.methods.createEscrow(ethOfferId, tradeAmount, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: accounts[1]});
      created = receipt.events.Created;
      escrowId = created.returnValues.escrowId;
      // Fund
      receipt = await Escrow.methods.fund(escrowId).send({from: accounts[0], value: tradeAmount + feeAmount});

      receipt = await Escrow.methods.pay(escrowId).send({from: accounts[1]});

      try {
        receipt = await Escrow.methods.cancel(escrowId).send({from: accounts[0]});
        assert.fail('should have reverted before');
      } catch (error) {
        assert.strictEqual(error.message, "VM Exception while processing transaction: revert Only transactions in created or funded state can be canceled");
      }
    });
  });


  describe("Releasing escrows", async () => {
    beforeEach(async() => {
      await StandardToken.methods.mint(accounts[0], tradeAmount + feeAmount).send();

      // Create
      hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();
      receipt = await Escrow.methods.createEscrow(ethOfferId, tradeAmount, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: accounts[1]});
      created = receipt.events.Created;
      escrowId = created.returnValues.escrowId;
      // Fund
      receipt = await Escrow.methods.fund(escrowId).send({from: accounts[0], value: tradeAmount + feeAmount});
    });

    it("An invalid escrow cannot be released", async() => {
      try {
        await Escrow.methods.release(999).send({from: accounts[0]}); // Invalid escrow
        assert.fail('should have reverted before');
      } catch (error) {
        TestUtils.assertJump(error);
      }
    });

    it("Accounts different from the seller cannot release an escrow", async () => {
      try {
        await Escrow.methods.release(escrowId).send({from: accounts[1]}); // Buyer tries to release
        assert.fail('should have reverted before');
      } catch (error) {
        assert.strictEqual(error.message, "VM Exception while processing transaction: revert Only the seller can invoke this function");
      }
    });

    it("Escrow owner can release his funds to the buyer", async () => {
      const buyerBalanceBeforeEscrow = await web3.eth.getBalance(accounts[1]);
      receipt = await Escrow.methods.release(escrowId).send({from: accounts[0]});
      const buyerBalanceAfterEscrow = await web3.eth.getBalance(accounts[1]);

      const released = receipt.events.Released;
      assert(!!released, "Released() not triggered");

      const escrow = await Escrow.methods.transactions(escrowId).call();
      assert.equal(escrow.status, ESCROW_RELEASED, "Should have been released");
      assert.equal(toBN(escrow.tokenAmount).add(toBN(buyerBalanceBeforeEscrow)), buyerBalanceAfterEscrow, "Invalid buyer balance");
    });

    it("Escrow owner can release token funds to the buyer", async () => {
      await StandardToken.methods.approve(Escrow.options.address, tradeAmount + feeAmount).send({from: accounts[0]});

      // Create
      hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();
      receipt = await Escrow.methods.createEscrow(tokenOfferId, tradeAmount, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: accounts[1]});
      created = receipt.events.Created;
      escrowTokenId = created.returnValues.escrowId;
      // Fund
      receipt = await Escrow.methods.fund(escrowTokenId).send({from: accounts[0]});

      const buyerBalanceBeforeEscrow = await StandardToken.methods.balanceOf(accounts[1]).call();
      const contractBalanceBeforeEscrow = await StandardToken.methods.balanceOf(Escrow.options.address).call();

      const escrow = await Escrow.methods.transactions(escrowTokenId).call();

      receipt = await Escrow.methods.release(escrowTokenId).send({from: accounts[0]});
      const buyerBalanceAfterEscrow = await StandardToken.methods.balanceOf(accounts[1]).call();
      const contractBalanceAfterEscrow = await StandardToken.methods.balanceOf(Escrow.options.address).call();

      assert.equal(toBN(escrow.tokenAmount).add(toBN(buyerBalanceBeforeEscrow)), buyerBalanceAfterEscrow, "Invalid buyer balance");
      const after = toBN(contractBalanceBeforeEscrow).sub(toBN(tradeAmount).add(toBN(feeAmount)));
      assert.equal(contractBalanceAfterEscrow, after, "Invalid contract balance");
    });

    it("Released escrow cannot be released again", async() => {
      await Escrow.methods.release(escrowId).send({from: accounts[0]});

      try {
        receipt = await Escrow.methods.release(escrowId).send({from: accounts[0]});
        assert.fail('should have reverted before');
      } catch (error) {
        assert.strictEqual(error.message, "VM Exception while processing transaction: revert Invalid transaction status");
      }
    });

    it("Released escrow cannot be canceled", async() => {
      await Escrow.methods.release(escrowId).send({from: accounts[0]});

      try {
        receipt = await Escrow.methods.cancel(escrowId).send({from: accounts[0]});
        assert.fail('should have reverted before');
      } catch (error) {
        assert.strictEqual(error.message, "VM Exception while processing transaction: revert Only transactions in created or funded state can be canceled");
      }
    });

    it("Canceled escrow cannot be released", async() => {
      await expireTransaction();

      await Escrow.methods.cancel(escrowId).send({from: accounts[0]});

      try {
        receipt = await Escrow.methods.release(escrowId).send({from: accounts[0]});
        assert.fail('should have reverted before');
      } catch (error) {
        assert.strictEqual(error.message, "VM Exception while processing transaction: revert Invalid transaction status");
      }
    });
  });


  describe("Buyer notifies payment of escrow", async () => {
    beforeEach(async() => {
      // Create
      hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();
      receipt = await Escrow.methods.createEscrow(ethOfferId, tradeAmount, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: accounts[1]});
      created = receipt.events.Created;
      escrowId = created.returnValues.escrowId;
      // Fund
      receipt = await Escrow.methods.fund(escrowId).send({from: accounts[0], value: tradeAmount + feeAmount});
    });

    it("A random account should not be able to mark a transaction as paid", async () => {
      try {
        receipt = await Escrow.methods.pay(escrowId).send({from: accounts[7]});
        assert.fail('should have reverted before');
      } catch (error) {
        assert.strictEqual(error.message, "VM Exception while processing transaction: revert Only the buyer can invoke this function");
      }
    });

    it("A buyer should be able to mark an escrow transaction as paid", async () => {
      receipt = await Escrow.methods.pay(escrowId).send({from: accounts[1]});
      const paid = receipt.events.Paid;
      assert(!!paid, "Paid() not triggered");
      assert.equal(paid.returnValues.escrowId, escrowId, "Invalid escrow id");
    });

    it("Anyone should be able to mark an escrow transaction as paid on behalf of the buyer", async () => {
      // Create
      hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();
      receipt = await Escrow.methods.createEscrow(ethOfferId, tradeAmount, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: accounts[1]});
      escrowId = receipt.events.Created.returnValues.escrowId;

      // Fund
      receipt = await Escrow.methods.fund(escrowId).send({from: accounts[0], value: tradeAmount + feeAmount});

      const messageToSign = await Escrow.methods.paySignHash(escrowId).call();
      signature = await web3.eth.sign(messageToSign, accounts[1]);

      receipt = await Escrow.methods['pay(uint256,bytes)'](escrowId, signature).send({from: accounts[9]});

      const paid = receipt.events.Paid;
      assert(!!paid, "Paid() not triggered");
      assert.equal(paid.returnValues.escrowId, escrowId, "Invalid escrowId");
    });

    it("A seller cannot cancel paid escrows", async () => {
      receipt = await Escrow.methods.pay(escrowId).send({from: accounts[1]});

      await expireTransaction();

      try {
        receipt = await Escrow.methods.cancel(escrowId).send({from: accounts[0]});
        assert.fail('should have reverted before');
      } catch (error) {
        assert.strictEqual(error.message, "VM Exception while processing transaction: revert Only transactions in created or funded state can be canceled");
      }
    });
  });

  describe("Rating a released Transaction", async() => {
    beforeEach(async() => {
      // Create
      hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();
      receipt = await Escrow.methods.createEscrow(ethOfferId, tradeAmount, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: accounts[1]});
      created = receipt.events.Created;
      escrowId = created.returnValues.escrowId;
      // Fund
      receipt = await Escrow.methods.fund(escrowId).send({from: accounts[0], value: tradeAmount + feeAmount});

      await Escrow.methods.release(escrowId).send({from: accounts[0]});
    });

    it("should not allow a score that's less than 1", async() => {
      try {
        await Escrow.methods.rateTransaction(escrowId, 0).send({from: accounts[1]});
        assert.fail('should have reverted: should not allow a score last less than 1');
      } catch(error) {
        TestUtils.assertJump(error);
        assert.ok(error.message.indexOf('Rating needs to be at least 1') >= 0);
      }
    });

    it("should not allow a score to be more than 5", async() => {
      try {
        await Escrow.methods.rateTransaction(escrowId, 6).send({from: accounts[1]});
        assert.fail('should have reverted: should not allow a score to be more than 5');
      } catch(error) {
        TestUtils.assertJump(error);
        assert.ok(error.message.indexOf('Rating needs to be at less than or equal to 5'));
      }
    });

    for(let i=1; i<=5; i++) {
      it("should allow a score of " + i, async() => {
        await Escrow.methods.rateTransaction(escrowId, i).send({from: accounts[1]});
        const transaction = await Escrow.methods.transactions(escrowId).call();
        assert.equal(transaction.rating, i.toString());
      });
    }

    it("should only allow rating once", async() => {
      await Escrow.methods.rateTransaction(escrowId, 3).send({from: accounts[1]});
      let transaction = await Escrow.methods.transactions(escrowId).call();
      assert.equal(transaction.rating, "3");

      try {
        await Escrow.methods.rateTransaction(escrowId, 2).send({from: accounts[1]});
      } catch(error) {
        TestUtils.assertJump(error);
        assert.ok(error.message.indexOf('Transaction already rated') >= 0);
      }
    });

    it("should only allow the buyer to rate the transaction", async() => {
      try {
        receipt = await Escrow.methods.rateTransaction(escrowId, 4).send({from: accounts[0]});
        assert.fail('should have reverted: should only allow the buyer to rate the transaction');
      } catch(error) {
        TestUtils.assertJump(error);
        assert.ok(error.message.indexOf('Only the buyer can invoke this function') >= 0);
      }
    });
  });


  describe("Rating an unreleased Transaction", async() => {
    let receipt, created, escrowId;

    beforeEach(async() => {
      // Create
      hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();
      receipt = await Escrow.methods.createEscrow(ethOfferId, tradeAmount, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: accounts[1]});
      created = receipt.events.Created;
      escrowId = created.returnValues.escrowId;
      // Fund
      receipt = await Escrow.methods.fund(escrowId).send({from: accounts[0], value: tradeAmount + feeAmount});
    });

    it("should not allow rating an unreleased transaction", async() => {
      try {
        await Escrow.methods.rateTransaction(escrowId, 4).send({from: accounts[0]});
        assert.fail('should have reverted: should not allow a score last less than 1');
      } catch(error) {
        TestUtils.assertJump(error);
        assert.ok(error.message.indexOf('Transaction not completed yet') >= 0);
      }
    });
  });

  describe("Getting a user rating", async() => {
    let receipt, created, escrowId, seller;

    beforeEach(async() => {
      seller = accounts[0];
      for (let i = 1; i <= 5; i++) {
        let buyer = accounts[i];
        let rating = i;
        const isPaused = await Escrow.methods.paused().call();
        if (isPaused) {
          receipt = await Escrow.methods.unpause().send({from: seller});
        }

        // Create
        hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: buyer});
        signature = await web3.eth.sign(hash, buyer);
        nonce = await MetadataStore.methods.user_nonce(buyer).call();
        receipt = await Escrow.methods.createEscrow(ethOfferId, tradeAmount, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: buyer});
        created = receipt.events.Created;
        escrowId = created.returnValues.escrowId;
        // Fund
        receipt = await Escrow.methods.fund(escrowId).send({from: seller, value: tradeAmount + feeAmount});

        await Escrow.methods.release(escrowId).send({from: seller});
        await Escrow.methods.rateTransaction(escrowId, rating).send({from: buyer});
      }
    });

    it("should calculate the user rating", async() => {
      const arrAvg = arr => arr.reduce((a,b) => a + b, 0) / arr.length;
      const events = await Escrow.getPastEvents('Rating', {fromBlock: 1, filter: {seller}});

      let ratings = events.slice(events.length - 5).map((e) => parseInt(e.returnValues.rating, 10));
      assert.equal(arrAvg(ratings), 3, "The seller rating is not correct");
    });
  });

   describe("Escrow fees", async() => {
    it("fee balance should increase with escrow funding", async() => {
      const ethFeeBalanceBefore = await Escrow.methods.feeTokenBalances(TestUtils.zeroAddress).call();
      const totalEthBefore = await web3.eth.getBalance(Escrow.options.address);

      // Create
      hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();
      receipt = await Escrow.methods.createEscrow(ethOfferId, tradeAmount, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: accounts[1]});
      created = receipt.events.Created;
      escrowId = created.returnValues.escrowId;
      // Fund
      receipt = await Escrow.methods.fund(escrowId).send({from: accounts[0], value: tradeAmount + feeAmount});

      const ethFeeBalance = await Escrow.methods.feeTokenBalances(TestUtils.zeroAddress).call();
      const totalEthAfter = await web3.eth.getBalance(Escrow.options.address);

      assert.strictEqual(parseInt(ethFeeBalance, 10), parseInt(ethFeeBalanceBefore, 10) + feeAmount, "Fee balance did not increase");
      assert.strictEqual(parseInt(totalEthAfter, 10), parseInt(totalEthBefore, 10) + feeAmount + tradeAmount, "Total balance did not increase");
    });
  });

  describe("Other operations", async () => {
    it("Paused contract allows withdrawal by owner only on active escrows", async () => {
      // Create
      hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();
      receipt = await Escrow.methods.createEscrow(ethOfferId, tradeAmount, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: accounts[1]});
      created = receipt.events.Created;

      const releasedEscrowId = created.returnValues.escrowId;
      // Fund
      receipt = await Escrow.methods.fund(releasedEscrowId).send({from: accounts[0], value: tradeAmount + feeAmount});

      await Escrow.methods.release(releasedEscrowId).send({from: accounts[0]});

      // Create
      hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();
      receipt = await Escrow.methods.createEscrow(ethOfferId, tradeAmount, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: accounts[1]});
      created = receipt.events.Created;
      escrowId = created.returnValues.escrowId;
      // Fund
      receipt = await Escrow.methods.fund(escrowId).send({from: accounts[0], value: tradeAmount + feeAmount});

      await StandardToken.methods.mint(accounts[0], tradeAmount + feeAmount).send();

      const balanceBeforeCreation = await StandardToken.methods.balanceOf(accounts[0]).call();
      const contractBalanceBeforeCancelation = await StandardToken.methods.balanceOf(Escrow.options.address).call();

      await StandardToken.methods.approve(Escrow.options.address, tradeAmount + feeAmount).send({from: accounts[0]});


      // Create
      hash = await MetadataStore.methods.getDataHash("U", PUBKEY_A, PUBKEY_B).call({from: accounts[1]});
      signature = await web3.eth.sign(hash, accounts[1]);
      nonce = await MetadataStore.methods.user_nonce(accounts[1]).call();
      receipt = await Escrow.methods.createEscrow(tokenOfferId, tradeAmount, 140, PUBKEY_A, PUBKEY_B, "L", "U", nonce, signature).send({from: accounts[1]});
      created = receipt.events.Created;
      escrowTokenId = created.returnValues.escrowId;
      // Fund
      receipt = await Escrow.methods.fund(escrowTokenId).send({from: accounts[0]});

      try {
        receipt = await Escrow.methods.withdraw_emergency(escrowTokenId).send({from: accounts[0]});
        assert.fail('should have reverted before');
      } catch (error) {
        assert.strictEqual(error.message, "VM Exception while processing transaction: revert Contract must be paused");
      }

      receipt = await Escrow.methods.pause().send({from: accounts[0]});

      const paused = receipt.events.Paused;

      assert(!!paused, "Paused() not triggered");

      try {
        receipt = await Escrow.methods.withdraw_emergency(releasedEscrowId).send({from: accounts[0]});
        assert.fail('should have reverted before');
      } catch (error) {
        assert.strictEqual(error.message, "VM Exception while processing transaction: revert Cannot withdraw from escrow in a stage different from FUNDED. Open a case");
      }

      await Escrow.methods.withdraw_emergency(escrowId).send({from: accounts[0]});

      let escrow = await Escrow.methods.transactions(escrowId).call();

      assert.equal(escrow.status, ESCROW_CANCELED, "Should be canceled");

      await Escrow.methods.withdraw_emergency(escrowTokenId).send({from: accounts[0]});

      const balanceAfterCancelation = await StandardToken.methods.balanceOf(accounts[0]).call();
      const contractBalanceAfterCancelation = await StandardToken.methods.balanceOf(Escrow.options.address).call();

      assert.equal(contractBalanceAfterCancelation, contractBalanceBeforeCancelation, "Invalid contract balance");
      assert.equal(balanceBeforeCreation, balanceAfterCancelation, "Invalid seller balance");
    });

  });

});
