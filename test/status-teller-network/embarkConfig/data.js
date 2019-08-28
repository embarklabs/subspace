module.exports = async (licensePrice, arbitrationLicensePrice, feeMilliPercent, burnAddress, deps) => {
  try {
    const addresses = await deps.web3.eth.getAccounts();
    const main = addresses[0];

    {
      console.log('Setting the initial SellerLicense "template", and calling the init() function');

      const abiEncode = deps.contracts.SellerLicense.methods.init(
        deps.contracts.SNT.options.address,
        licensePrice,
        burnAddress
      ).encodeABI();

      const receipt = await deps.contracts.SellerLicenseProxy.methods.upgradeToAndCall(deps.contracts.SellerLicense.options.address, abiEncode).send({from: main, gas: 1000000});

      console.log(`Setting done and was a ${(receipt.status === true || receipt.status === 1) ? 'success' : 'failure'}`);
    }


    {
      console.log('Setting the initial ArbitrationLicense "template", and calling the init() function');

      const abiEncode = deps.contracts.ArbitrationLicense.methods.init(
        deps.contracts.SNT.options.address,
        arbitrationLicensePrice,
        burnAddress
      ).encodeABI();

      const receipt = await deps.contracts.ArbitrationLicenseProxy.methods.upgradeToAndCall(deps.contracts.ArbitrationLicense.options.address, abiEncode).send({from: main, gas: 1000000});

      console.log(`Setting done and was a ${(receipt.status === true || receipt.status === 1) ? 'success' : 'failure'}`);
    }

    {
      console.log('Setting the initial MetadataStore "template", and calling the init() function');

      const abiEncode = deps.contracts.MetadataStore.methods.init(
        deps.contracts.SellerLicenseProxy.options.address,
        deps.contracts.ArbitrationLicenseProxy.options.address
      ).encodeABI();

      const receipt = await deps.contracts.MetadataStoreProxy.methods.upgradeToAndCall(deps.contracts.MetadataStore.options.address, abiEncode).send({from: main, gas: 1000000});

      console.log(`Setting done and was a ${(receipt.status === true || receipt.status === 1) ? 'success' : 'failure'}`);
    }

    {
      console.log('Setting the initial Escrow "template", and calling the init() function');

      const abiEncode = deps.contracts.Escrow.methods.init(
        deps.contracts.EscrowRelay.options.address,
        deps.contracts.SellerLicenseProxy.options.address,
        deps.contracts.ArbitrationLicenseProxy.options.address,
        deps.contracts.MetadataStoreProxy.options.address,
        burnAddress, // TODO: replace with StakingPool address
        feeMilliPercent
      ).encodeABI();

      // Here we are setting the initial "template", and calling the init() function
      const receipt = await deps.contracts.EscrowProxy.methods.upgradeToAndCall(deps.contracts.Escrow.options.address, abiEncode).send({from: main, gas: 1000000});

      console.log(`Setting done and was a ${(receipt.status === true || receipt.status === 1) ? 'success' : 'failure'}`);
    }

    deps.contracts.Escrow.options.address = deps.contracts.EscrowProxy.options.address;
    deps.contracts.SellerLicense.options.address = deps.contracts.SellerLicenseProxy.options.address;
    deps.contracts.ArbitrationLicense.options.address = deps.contracts.ArbitrationLicenseProxy.options.address;
    deps.contracts.MetadataStore.options.address = deps.contracts.MetadataStoreProxy.options.address;

    const arbitrator = addresses[9];

    const sntToken = 10000000;
    const balance = await deps.contracts.SNT.methods.balanceOf(main).call();
    if (balance !== '0') {
      return;
    }

    console.log("Seeding data...");

    console.log('Send ETH...');
    const value = 100 * Math.pow(10, 18);
    await Promise.all(addresses.slice(1, 10).map(async (address) => {
      return deps.web3.eth.sendTransaction({
        to: address,
        from: main,
        value: value.toString()
      });
    }));

    console.log('Generate SNT...');
    await Promise.all(addresses.map(async (address) => {
      const generateToken = deps.contracts.SNT.methods.generateTokens(address, sntToken + '000000000000000000');
      const gas = await generateToken.estimateGas({from: main});
      return generateToken.send({from: main, gas});
    }));

    console.log('Generate Standard Tokens');
    const weiToken = "5000000000000";
    await Promise.all(addresses.slice(0, 9).map(async (address) => {
      const generateToken = deps.contracts.StandardToken.methods.mint(address, weiToken.toString());
      const gas = await generateToken.estimateGas({from: main});
      return generateToken.send({from: main, gas});
    }));

    console.log("Buy arbitration licenses");
    {
      const buyLicense = deps.contracts.ArbitrationLicense.methods.buy().encodeABI();
      let toSend = deps.contracts.SNT.methods.approveAndCall(deps.contracts.ArbitrationLicense._address, arbitrationLicensePrice, buyLicense);
      let gas = await toSend.estimateGas({from: arbitrator});
      await toSend.send({from: arbitrator, gas});

      toSend = deps.contracts.SNT.methods.approveAndCall(deps.contracts.ArbitrationLicense._address, arbitrationLicensePrice, buyLicense);
      gas = await toSend.estimateGas({from: addresses[8]});
      await toSend.send({from: addresses[8], gas});


      // Accepting everyone
      toSend = deps.contracts.ArbitrationLicense.methods.changeAcceptAny(true);
      gas = await toSend.estimateGas({from: arbitrator});
      await toSend.send({from: arbitrator, gas});

    }

    console.log('Buy Licenses...');
    await Promise.all(addresses.slice(1, 7).map(async (address) => {
      const buyLicense = deps.contracts.SellerLicense.methods.buy().encodeABI();
      const toSend = deps.contracts.SNT.methods.approveAndCall(deps.contracts.SellerLicense._address, licensePrice, buyLicense);

      const gas = await toSend.estimateGas({from: address});
      return toSend.send({from: address, gas});
    }));

    console.log('Generating Offers...');
    const tokens = [deps.contracts.SNT._address, '0x0000000000000000000000000000000000000000'];
    const paymentMethods = [1, 2, 3];
    const usernames = ['Jonathan', 'Iuri', 'Anthony', 'Barry', 'Richard', 'Ricardo'];
    const locations = ['London', 'Montreal', 'Paris', 'Berlin'];
    const currencies = ['USD', 'EUR'];
    const offerStartIndex = 1;

    const offerReceipts = await Promise.all(addresses.slice(offerStartIndex, offerStartIndex + 5).map(async (address) => {
      const addOffer = deps.contracts.MetadataStore.methods.addOffer(
        tokens[1],
        // TODO un hardcode token and add `approve` in the escrow creation below
        // tokens[Math.floor(Math.random() * tokens.length)],
        address,
        address,
        locations[Math.floor(Math.random() * locations.length)],
        currencies[Math.floor(Math.random() * currencies.length)],
        usernames[Math.floor(Math.random() * usernames.length)],
        [paymentMethods[Math.floor(Math.random() * paymentMethods.length)]],
        0,
        0,
        Math.floor(Math.random() * 100),
        arbitrator
      );

      const gas = await addOffer.estimateGas({from: address});
      return addOffer.send({from: address, gas});
    }));

    console.log('Creating escrows and rating them...');
    const val = 1000;
    const feeAmount = Math.round(val * (feeMilliPercent / (100 * 1000)));

    const buyerAddress = addresses[offerStartIndex];
    const escrowStartIndex = offerStartIndex + 1;
    let receipt, hash, signature, nonce, created, escrowId;
    const PUBKEY_A = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const PUBKEY_B = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";

    console.log('START', escrowStartIndex);
    console.log('RECiptys', offerReceipts.length);
    await Promise.all(addresses.slice(escrowStartIndex, escrowStartIndex + 1).map(async (creatorAddress, idx) => {
      console.log('Index = ', idx - offerStartIndex + escrowStartIndex);
      console.log('Address used:; ', creatorAddress);
      console.log('OWNER', offerReceipts[idx - offerStartIndex + escrowStartIndex].events.OfferAdded.returnValues.owner);
      const ethOfferId = offerReceipts[idx - offerStartIndex + escrowStartIndex].events.OfferAdded.returnValues.offerId;
      // TODO when we re-enable creating tokens too, use this to know
      // const token = offerReceipts[idx - offerStartIndex + escrowStartIndex].events.OfferAdded.returnValues.asset;

      let gas;

      // Create
      hash = await deps.contracts.MetadataStore.methods.getDataHash(usernames[offerStartIndex], PUBKEY_A, PUBKEY_B).call({from: buyerAddress});
      signature = await deps.web3.eth.sign(hash, buyerAddress);
      nonce = await deps.contracts.MetadataStore.methods.user_nonce(buyerAddress).call();

      const creation = deps.contracts.Escrow.methods.createEscrow(ethOfferId, val, 140, PUBKEY_A, PUBKEY_B, locations[offerStartIndex], usernames[offerStartIndex], nonce, signature);
      gas = await creation.estimateGas({from: creatorAddress});
      receipt = await creation.send({from: creatorAddress, gas: gas + 1000});

      created = receipt.events.Created;
      escrowId = created.returnValues.escrowId;

      // Fund
      const fund = deps.contracts.Escrow.methods.fund(escrowId);
      gas = await fund.estimateGas({from: creatorAddress, value: val + feeAmount});
      receipt = await fund.send({from: creatorAddress, gas: gas + 1000, value: val + feeAmount});

      // Release
      const release = deps.contracts.Escrow.methods.release(escrowId);
      gas = await release.estimateGas({from: creatorAddress});
      receipt = await release.send({from: creatorAddress, gas: gas + 1000});

      // Rate
      const rating = Math.floor(Math.random() * 5) + 1;
      const rate = deps.contracts.Escrow.methods.rateTransaction(escrowId, rating);
      gas = await rate.estimateGas({from: buyerAddress});
      await rate.send({from: buyerAddress, gas: gas + 1000});
    }));

    /*
    console.log('Creating arbitrations');


    await Promise.all(addresses.slice(escrowStartIndex, 5).map(async (creatorAddress, idx) => {
      const ethOfferId = offerReceipts[idx - offerStartIndex + escrowStartIndex].events.OfferAdded.returnValues.offerId;
      let gas, receipt;

      const creation = deps.contracts.Escrow.methods.create_and_fund(buyerAddress, ethOfferId, val, expirationTime, FIAT, 13555);
      gas = await creation.estimateGas({from: creatorAddress, value: val + feeAmount});
      receipt = await creation.send({from: creatorAddress, value: val + feeAmount, gas: gas + 1000});
      const created = receipt.events.Created;
      const escrowId = created.returnValues.escrowId;

      const pay = deps.contracts.Escrow.methods.pay(escrowId);
      gas = await pay.estimateGas({from: buyerAddress});
      receipt = await pay.send({from: buyerAddress, gas: gas + 1000});

      const openCase = deps.contracts.Escrow.methods.openCase(escrowId, 'My Motive is...');
      gas = await openCase.estimateGas({from: buyerAddress});
      receipt = await openCase.send({from: buyerAddress, gas: gas + 1000});
    }));
*/
    const accounts = await Promise.all(addresses.map(async(address) => {
      const ethBalance = await deps.web3.eth.getBalance(address);
      const sntBalance = await deps.contracts.SNT.methods.balanceOf(address).call();
      const isLicenseOwner = await deps.contracts.SellerLicense.methods.isLicenseOwner(address).call();
      let user = {};
      let offers = [];
      const isUser = await deps.contracts.MetadataStore.methods.users(address).call();
      if (isUser) {
        user = await deps.contracts.MetadataStore.methods.users(address).call();
        const offerIds = await deps.contracts.MetadataStore.methods.getOfferIds(address).call();
        offers = await Promise.all(offerIds.map(async(offerId) => (
          deps.contracts.MetadataStore.methods.offer(offerId).call()
        )));
      }
      return {
        address,
        isLicenseOwner,
        isUser,
        user,
        offers,
        ethBalance: deps.web3.utils.fromWei(ethBalance),
        sntBalance: deps.web3.utils.fromWei(sntBalance)
      };
    }));

    console.log('Summary:');
    console.log('######################');
    accounts.forEach((account) => {
      console.log(`Address: ${account.address}:`);
      console.log(`License Owner: ${account.isLicenseOwner} ETH: ${account.ethBalance} SNT: ${account.sntBalance}`);
      console.log(`Is User: ${account.isUser} Username: ${account.user.username || 'N/A'} Offers: ${account.offers.length}`);
      console.log('');
    });
  } catch (e) {
    console.log("------- data seeding error ------- ");
    console.dir(e);
  }
};
