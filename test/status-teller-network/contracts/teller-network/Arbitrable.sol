/* solium-disable security/no-block-members */
pragma solidity >=0.5.0 <0.6.0;

import "./ArbitrationLicense.sol";

/**
 * Arbitrable
 * @dev Utils for management of disputes
 */
contract Arbitrable {

    enum ArbitrationResult {UNSOLVED, BUYER, SELLER}

    ArbitrationLicense public arbitratorLicenses;

    mapping(uint => ArbitrationCase) public arbitrationCases;

    struct ArbitrationCase {
        bool open;
        address openBy;
        address arbitrator;
        ArbitrationResult result;
        string motive;
    }

    event ArbitratorChanged(address arbitrator);
    event ArbitrationCanceled(uint escrowId);
    event ArbitrationRequired(uint escrowId);
    event ArbitrationResolved(uint escrowId, ArbitrationResult result, address arbitrator);

    /**
     * @param _arbitratorLicenses Address of the Arbitrator Licenses contract
     */
    constructor(address _arbitratorLicenses) public {
        arbitratorLicenses = ArbitrationLicense(_arbitratorLicenses);
    }

    /**
     * @param _escrowId Id of the escrow with an open dispute
     * @param _releaseFunds Release funds to the buyer
     * @param _arbitrator Address of the arbitrator solving the dispute
     * @dev Abstract contract used to perform actions after a dispute has been settled
     */
    function _solveDispute(uint _escrowId, bool _releaseFunds, address _arbitrator) internal;

    /**
     * @notice Get arbitrator of an escrow
     * @return address Arbitrator address
     */
    function _getArbitrator(uint _escrowId) internal view returns(address);

    /**
     * @notice Determine if a dispute exists/existed for an escrow
     * @param _escrowId Escrow to verify
     * @return bool result
     */
    function isDisputed(uint _escrowId) public view returns (bool) {
        return _isDisputed(_escrowId);
    }

    function _isDisputed(uint _escrowId) internal view returns (bool) {
        return arbitrationCases[_escrowId].open || arbitrationCases[_escrowId].result != ArbitrationResult.UNSOLVED;
    }

    /**
     * @notice Determine if a dispute existed for an escrow
     * @param _escrowId Escrow to verify
     * @return bool result
     */
    function hadDispute(uint _escrowId) public view returns (bool) {
        return arbitrationCases[_escrowId].result != ArbitrationResult.UNSOLVED;
    }

    /**
     * @notice Cancel arbitration
     * @param _escrowId Escrow to cancel
     */
    function cancelArbitration(uint _escrowId) external {
        require(arbitrationCases[_escrowId].openBy == msg.sender, "Arbitration can only be canceled by the opener");
        require(arbitrationCases[_escrowId].result == ArbitrationResult.UNSOLVED && arbitrationCases[_escrowId].open,
                "Arbitration already solved or not open");

        delete arbitrationCases[_escrowId];

        emit ArbitrationCanceled(_escrowId);
    }

    /**
     * @notice Opens a dispute between a seller and a buyer
     * @param _escrowId Id of the Escrow that is being disputed
     * @param _openBy Address of the person opening the dispute (buyer or seller)
     * @param motive Description of the problem
     */
    function _openDispute(uint _escrowId, address _openBy, string memory motive) internal {
        require(arbitrationCases[_escrowId].result == ArbitrationResult.UNSOLVED && !arbitrationCases[_escrowId].open,
                "Arbitration already solved or has been opened before");

        address arbitratorAddress = _getArbitrator(_escrowId);

        require(arbitratorAddress != address(0), "Arbitrator is required");

        arbitrationCases[_escrowId] = ArbitrationCase({
            open: true,
            openBy: _openBy,
            arbitrator: arbitratorAddress,
            result: ArbitrationResult.UNSOLVED,
            motive: motive
        });

        emit ArbitrationRequired(_escrowId);
    }

    /**
     * @notice Set arbitration result in favour of the buyer or seller and transfer funds accordingly
     * @param _escrowId Id of the escrow
     * @param _result Result of the arbitration
     */
    function setArbitrationResult(uint _escrowId, ArbitrationResult _result) external {
        require(arbitrationCases[_escrowId].open && arbitrationCases[_escrowId].result == ArbitrationResult.UNSOLVED,
                "Case must be open and unsolved");
        require(_result != ArbitrationResult.UNSOLVED, "Arbitration does not have result");
        require(arbitratorLicenses.isLicenseOwner(msg.sender), "Only arbitrators can invoke this function");
        require(arbitrationCases[_escrowId].arbitrator == msg.sender, "Invalid escrow arbitrator");

        arbitrationCases[_escrowId].open = false;
        arbitrationCases[_escrowId].result = _result;

        emit ArbitrationResolved(_escrowId, _result, msg.sender);

        if(_result == ArbitrationResult.BUYER){
            _solveDispute(_escrowId, true, msg.sender);
        } else {
            _solveDispute(_escrowId, false, msg.sender);
        }
    }
}
