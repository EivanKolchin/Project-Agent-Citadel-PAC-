// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ReputationOracle {
    mapping(address => uint256) private _scores;
    address public taskEscrow;
    address public owner;

    modifier onlyEscrow() {
        require(msg.sender == taskEscrow, "Only TaskEscrow can call");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setTaskEscrow(address _taskEscrow) external {
        require(msg.sender == owner, "Only owner can set TaskEscrow proxy");
        taskEscrow = _taskEscrow;
    }

    function getScore(address agent) external view returns (uint256) {
        uint256 score = _scores[agent];
        return score == 0 ? 100 : score;
    }

    function incrementScore(address agent) external onlyEscrow {
        if (_scores[agent] == 0) _scores[agent] = 100;
        _scores[agent] += 10;
    }

    function decrementScore(address agent) external onlyEscrow {
        if (_scores[agent] == 0) _scores[agent] = 100;
        if (_scores[agent] > 10) {
            _scores[agent] -= 10;
        } else {
            _scores[agent] = 0;
        }
    }
}
