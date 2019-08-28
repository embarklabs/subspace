/* solium-disable security/no-inline-assembly */

pragma solidity >=0.5.0 <0.6.0;

// Adapted from
// https://github.com/zeppelinos/labs/tree/master/upgradeability_using_unstructured_storage

import './Proxy.sol';

/**
 * @title UpgradeabilityProxy
 * @dev This contract represents a proxy where the implementation address to which it will delegate can be upgraded
 */
contract UpgradeabilityProxy is Proxy {

   /**
    * @dev This event will be emitted every time the implementation gets upgraded
    * @param implementation representing the address of the upgraded implementation
    */
    event Upgraded(address indexed implementation);

    // Storage position of the address of the current implementation
    bytes32 private constant implementationPosition = keccak256("im.status.proxy.implementation");

    /**
     * @dev Tells the address of the current implementation
     * @return address of the current implementation
     */
    function implementation() public view returns (address impl) {
        bytes32 position = implementationPosition;
        assembly {
            impl := sload(position)
        }
    }

    /**
     * @dev Sets the address of the current implementation
     * @param _implementation address representing the new implementation to be set
     */
    function _setImplementation(address _implementation) internal {
        bytes32 position = implementationPosition;
        assembly {
            sstore(position, _implementation)
        }
    }

    /**
     * @dev Upgrades the implementation address
     * @param _implementation representing the address of the new implementation to be set
     */
    function _upgradeTo(address _implementation) internal {
        require(implementation() != _implementation, "Current and new implementation should be different");
        _setImplementation(_implementation);
        emit Upgraded(_implementation);
    }

    /**
     * @dev EIP897 proxy type
     * @return 2 to indicate upgradable proxy
     */
    function proxyType() public pure returns (uint256) {
        return 2;
    }
}