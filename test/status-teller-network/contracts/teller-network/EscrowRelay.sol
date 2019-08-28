/* solium-disable security/no-block-members */
/* solium-disable security/no-inline-assembly */
/* solium-disable no-empty-blocks */

pragma solidity >=0.5.0 <0.6.0;

import "./IEscrow.sol";
import "./MetadataStore.sol";
import "../common/Ownable.sol";
import "tabookey-gasless/contracts/RelayRecipient.sol";

/**
 * @title Escrow Relay (Gas Station Network)
 */
contract EscrowRelay is RelayRecipient, Ownable {

  MetadataStore public metadataStore;
  IEscrow public escrow;
  address public snt;

  mapping(address => uint) public lastActivity;

  bytes4 constant CREATE_SIGNATURE = bytes4(keccak256("createEscrow(uint256,uint256,uint256,bytes32,bytes32,string,string,uint256,bytes)"));
  bytes4 constant PAY_SIGNATURE = bytes4(keccak256("pay(uint256)"));
  bytes4 constant CANCEL_SIGNATURE = bytes4(keccak256("cancel(uint256)"));
  bytes4 constant OPEN_CASE_SIGNATURE = bytes4(keccak256("openCase(uint256,string)"));

  uint256 constant OK = 0;
  uint256 constant ERROR_ENOUGH_BALANCE = 11;
  uint256 constant ERROR_INVALID_ASSET = 12;
  uint256 constant ERROR_TRX_TOO_SOON = 13;
  uint256 constant ERROR_INVALID_BUYER = 14;
  uint256 constant ERROR_GAS_PRICE = 15;
  uint256 constant ERROR = 99;

  /**
   * @param _metadataStore Metadata Store Address
   * @param _escrow IEscrow Instance Address
   * @param _snt SNT address
   */
  constructor(address _metadataStore, address _escrow, address _snt) public {
    metadataStore = MetadataStore(_metadataStore);
    escrow = IEscrow(_escrow);
    snt = _snt;
  }

  /**
   * @notice Set metadata store address
   * @dev Only contract owner can execute this function
   * @param _metadataStore New metadata store address
   */
  function setMetadataStore(address _metadataStore) external onlyOwner {
    metadataStore = MetadataStore(_metadataStore);
  }

  /**
   * @notice Set escrow address
   * @dev Only contract owner can execute this function
   * @param _escrow New escrow address
   */
  function setEscrow(address _escrow) external onlyOwner {
    escrow = IEscrow(_escrow);
  }

  /**
   * @notice Set gas station network hub address
   * @dev Only contract owner can execute this function
   * @param _relayHub New relay hub address
   */
  function setRelayHubAddress(address _relayHub) external onlyOwner {
    setRelayHub(IRelayHub(_relayHub));
  }

  /**
   * @notice Determine if the timeout for relaying a create/cancel transaction has passed
   * @param _account Account to verify
   * @return bool
   */
  function canCreateOrCancel(address _account) external view returns(bool) {
    return (lastActivity[_account] + 15 minutes) < block.timestamp;
  }

  /**
   * @notice Create a new escrow
   * @param _offerId Offer
   * @param _tokenAmount Amount buyer is willing to trade
   * @param _assetPrice Indicates the price of the asset in the FIAT of choice
   * @param _pubkeyA First coordinate of Status Whisper Public Key
   * @param _pubkeyB Second coordinate of Status Whisper Public Key
   * @param _location The location on earth
   * @param _username The username of the user
   * @param _nonce buyer's nonce
   * @param _signature buyer's signature
   */
  function createEscrow(
    uint _offerId,
    uint _tokenAmount,
    uint _assetPrice,
    bytes32 _pubkeyA,
    bytes32 _pubkeyB,
    string memory _location,
    string memory _username,
    uint _nonce,
    bytes memory _signature
  ) public returns (uint escrowId) {
    lastActivity[getSender()] = block.timestamp;
    escrowId = escrow.createEscrow(
         _offerId,
         _tokenAmount,
         _assetPrice,
         _pubkeyA,
         _pubkeyB,
         _location,
         _username,
         _nonce,
         _signature
    );
  }

  /**
   * @notice Mark transaction as paid
   * @param _escrowId Escrow to mark as paid
   */
  function pay(uint _escrowId) external {
    address sender = getSender();
    escrow.pay_relayed(sender, _escrowId);
  }

  /**
   * @notice Cancel an escrow
   * @param _escrowId Escrow to cancel
   */
  function cancel(uint _escrowId) external {
    address sender = getSender();
    lastActivity[sender] = block.timestamp;
    escrow.cancel_relayed(sender, _escrowId);
  }

  /**
   * @notice Open a dispute
   * @param _escrowId Escrow to open a dispute
   * @param _motive Motive a dispute is being opened
   */
  function openCase(uint _escrowId, string memory _motive) public {
    address sender = getSender();
    escrow.openCase_relayed(sender, _escrowId, _motive);
  }

  // =======================1=================================================
  // Gas station network

  /**
   * @notice Function returning if we accept or not the relayed call (do we pay or not for the gas)
   * @param from Address of the buyer getting a free transaction
   * @param encodedFunction Function that will be called on the Escrow contract
   * @param gasPrice Gas price
   * @dev relay and transaction_fee are useless in our relay workflow
   */
  function acceptRelayedCall(
    address /* relay */,
    address from,
    bytes calldata encodedFunction,
    uint256 /* transactionFee */,
    uint256 gasPrice,
    uint256 /* gasLimit */,
    uint256 /* nonce */,
    bytes calldata /* approvalData */,
    uint256 /* maxPossibleCharge */
  ) external view returns (uint256, bytes memory)
  {
    bytes memory abiEncodedFunc = encodedFunction; // Call data elements cannot be accessed directly
    bytes4 fSign;
    uint dataValue;

    assembly {
      fSign := mload(add(abiEncodedFunc, add(0x20, 0)))
      dataValue := mload(add(abiEncodedFunc, 36))
    }

    return (_evaluateConditionsToRelay(from, gasPrice, fSign, dataValue), "");
  }

  /**
   * @dev Evaluates if the sender conditions are valid for relaying a escrow transaction
   * @param from Sender
   * @param gasPrice Gas Price
   * @param functionSignature Function Signature
   * @param dataValue Represents the escrowId or offerId depending on the function being called
   */
  function _evaluateConditionsToRelay(address from, uint gasPrice, bytes4 functionSignature, uint dataValue) internal view returns (uint256) {
    address token;

    if(from.balance > 600000 * gasPrice) return ERROR_ENOUGH_BALANCE;

    if(gasPrice > 20000000000) return ERROR_GAS_PRICE; // 20Gwei

    if(functionSignature == PAY_SIGNATURE || functionSignature == CANCEL_SIGNATURE || functionSignature == OPEN_CASE_SIGNATURE){
      address payable buyer;
      
      (buyer, , token, ) = escrow.getBasicTradeData(dataValue);

      if(buyer != from) return ERROR_INVALID_BUYER;
      if(token != snt && token != address(0)) return ERROR_INVALID_ASSET;

      if(functionSignature == CANCEL_SIGNATURE){ // Allow activity after 15min have passed
        if((lastActivity[from] + 15 minutes) > block.timestamp) return ERROR_TRX_TOO_SOON;
      }

      return OK;
    } else if(functionSignature == CREATE_SIGNATURE) {
      token = metadataStore.getAsset(dataValue);

      if(token != snt && token != address(0)) return ERROR_INVALID_ASSET;

      // Allow activity after 15 min have passed
      if((lastActivity[from] + 15 minutes) > block.timestamp) return ERROR_TRX_TOO_SOON;

      return OK;
    }

    return ERROR;
  }

  /**
   * @notice Function executed before the relay. Unused by us
   */
  function preRelayedCall(bytes calldata) external returns (bytes32){
    // nothing to be done pre-call.
    // still, we must implement this method.
  }

  /**
   * @notice Function executed after the relay. Unused by us
   */
    function postRelayedCall(
      bytes calldata /*context*/, 
      bool /*success*/, 
      uint /*actualCharge*/, 
      bytes32 /*preRetVal*/) external {
    // nothing to be done post-call.
    // still, we must implement this method.
  }
}
