// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ITownSquarePool} from "../interfaces/ITownSquarePool.sol";

/**
 * @title MockTownSquarePool
 * @notice Mock implementation of TownSquare Pool for testing
 */
contract MockTownSquarePool is ITownSquarePool {
    using SafeERC20 for IERC20;

    IERC20 public asset;
    uint256 public apy; // in basis points (e.g., 1000 = 10%)

    mapping(address => uint256) public balances;
    uint256 public totalLiquidity_;

    event MockDeposit(address indexed user, uint256 amount);
    event MockWithdraw(address indexed user, uint256 amount);

    constructor(address _asset, uint256 _initialApy) {
        asset = IERC20(_asset);
        apy = _initialApy;
    }

    /**
     * @notice Set the APY for this pool
     * @param _newApy New APY in basis points
     */
    function setAPY(uint256 _newApy) external {
        apy = _newApy;
    }

    /**
     * @notice Deposit assets into the mock pool
     */
    function deposit(uint256 amount) external override {
        require(amount > 0, "Amount must be > 0");

        // Transfer USDC from caller to this contract
        asset.safeTransferFrom(msg.sender, address(this), amount);

        // Track balance
        balances[msg.sender] += amount;
        totalLiquidity_ += amount;

        emit MockDeposit(msg.sender, amount);
    }

    /**
     * @notice Withdraw assets from the mock pool
     */
    function withdraw(uint256 amount) external override {
        require(amount > 0, "Amount must be > 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");

        // Update balance
        balances[msg.sender] -= amount;
        totalLiquidity_ -= amount;

        // Transfer USDC back to user
        asset.safeTransfer(msg.sender, amount);

        emit MockWithdraw(msg.sender, amount);
    }

    /**
     * @notice Get the current APY of the pool
     * @return The APY in basis points
     */
    function getAPY() external view override returns (uint256) {
        return apy;
    }

    /**
     * @notice Get the balance of a user in the pool
     */
    function balanceOf(address user) external view override returns (uint256) {
        return balances[user];
    }

    /**
     * @notice Get the total liquidity in the pool
     */
    function totalLiquidity() external view override returns (uint256) {
        return totalLiquidity_;
    }
}
