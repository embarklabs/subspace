/* solium-disable security/no-block-members */
/* solium-disable security/no-inline-assembly */

pragma solidity >=0.5.0 <0.6.0;

// Adapted from
// https://github.com/zeppelinos/labs/tree/master/upgradeability_using_unstructured_storage

/**
 * @title Proxy
 * @dev Basic EIP897 proxy functionality
 */
contract Proxy {

    /**
     * @dev Tells the address of the implementation where every call will be delegated.
     * @return address of the implementation to which it will be delegated
     */
    function implementation() public view returns (address);

    /**
     * @dev Fallback function allowing to perform a delegatecall to the given implementation.
     * This function will return whatever the implementation call returns
     */
    function () external payable {
        address _impl = implementation();
        require(_impl != address(0), "No implementation available");

        assembly {
            let ptr := mload(0x40)
            calldatacopy(ptr, 0, calldatasize)
            let result := delegatecall(gas, _impl, ptr, calldatasize, 0, 0)
            let size := returndatasize
            returndatacopy(ptr, 0, size)

            switch result
            case 0 { revert(ptr, size) }
            default { return(ptr, size) }
        }
    }

    /**
     * @dev EIP897 proxy type
     * @return 1 to indicate not upgradable proxy
     */
    function proxyType() public pure returns (uint256) {
        return 1;
    }
}