/* solium-disable security/no-low-level-calls */
/* solium-disable security/no-inline-assembly */

pragma solidity >=0.5.0 <0.6.0;

// Adapted from
// https://github.com/zeppelinos/labs/tree/master/upgradeability_using_unstructured_storage

import './UpgradeabilityProxy.sol';

/**
 * @title OwnedUpgradeabilityProxy
 * @dev This contract combines an upgradeability proxy with basic authorization control functionalities
 */
contract OwnedUpgradeabilityProxy is UpgradeabilityProxy {
 
    /**
     * @dev Event to show ownership has been transferred
     * @param previousOwner representing the address of the previous owner
     * @param newOwner representing the address of the new owner
     */
    event ProxyOwnershipTransferred(address previousOwner, address newOwner);

    // Storage position of the owner of the contract
    bytes32 private constant proxyOwnerPosition = keccak256("im.status.proxy.owner");

    /**
     * @dev the constructor sets the original owner of the contract to the sender account.
     */
    constructor() public {
        setUpgradeabilityOwner(msg.sender);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyProxyOwner() {
        require(msg.sender == proxyOwner(), "Only the proxy owner can invoke this function");
        _;
    }

    /**
     * @dev Tells the address of the owner
     * @return the address of the owner
     */
    function proxyOwner() public view returns (address owner) {
        bytes32 position = proxyOwnerPosition;
        assembly {
            owner := sload(position)
        }
    }

    /**
     * @dev Sets the address of the owner
     * @param _newProxyOwner New proxy owner address
     */
    function setUpgradeabilityOwner(address _newProxyOwner) internal {
        bytes32 position = proxyOwnerPosition;
        assembly {
            sstore(position, _newProxyOwner)
        }
    }

    /**
     * @dev Allows the current owner to transfer control of the contract to a new Owner.
     * @param _newProxyOwner The address to transfer ownership to.
    */
    function transferProxyOwnership(address _newProxyOwner) external onlyProxyOwner {
        require(_newProxyOwner != address(0), "Invalid new owner");
        emit ProxyOwnershipTransferred(proxyOwner(), _newProxyOwner);
        setUpgradeabilityOwner(_newProxyOwner);
    }

    /**
     * @dev Allows the proxy owner to upgrade the current version of the proxy.
     * @param _implementation representing the address of the new implementation to be set.
     */
    function upgradeTo(address _implementation) external onlyProxyOwner {
        _upgradeTo(_implementation);
    }

    /**
     * @dev Allows the proxy owner to upgrade the current version of the proxy and call the new implementation
     *      to initialize whatever is needed through a low level call.
     * @param _implementation representing the address of the new implementation to be set.
     * @param _data represents the msg.data to bet sent in the low level call. This parameter may include the function
     *             signature of the implementation to be called with the needed payload
     */
    function upgradeToAndCall(address _implementation, bytes calldata _data) external payable onlyProxyOwner {
        _upgradeTo(_implementation);
        (bool success,) = _implementation.delegatecall(_data);
        require(success, "Upgrade failed");
    }
}