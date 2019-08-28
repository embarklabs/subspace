/* solium-disable security/no-block-members */
/* solium-disable no-empty-blocks */

pragma solidity >=0.5.0 <0.6.0;

import "../teller-network/Escrow.sol";

/**
 * @title Test Escrow Upgrade contract
 */
contract TestEscrowUpgrade is Escrow {

    constructor (
        address _relayer,
        address _license,
        address _arbitrationLicense,
        address _metadataStore,
        address payable _feeDestination,
        uint _feeMilliPercent
      )
      Escrow(_relayer, _license, _arbitrationLicense, _metadataStore, _feeDestination, _feeMilliPercent)
      public {
    }

    uint private val;

    function getVal() public view returns (uint) {
        return val;
    }

    function setVal(uint _val) public {
      val = _val;
    }

}
