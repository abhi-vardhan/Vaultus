// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ITownSquarePool} from "../../src/interfaces/ITownSquarePool.sol";

/**
 * @title MockTownSquarePool
 * @notice Mock TownSquare Pool with auto-oscillating APY for demo
 * @dev APY alternates every 10 seconds between highApy and lowApy
 *      Oscillation is OPPOSITE to Neverland — when Neverland is high, TownSquare is low
 */
contract MockTownSquarePool is ITownSquarePool {
    using SafeERC20 for IERC20;

    IERC20 public asset;
    uint256 public highApy;  // APY when this pool is "hot" (basis points)
    uint256 public lowApy;   // APY when this pool is "cold" (basis points)
    uint256 public oscillateInterval; // seconds per phase
    uint256 public deployedAt;

    mapping(address => uint256) public balances;
    uint256 public totalLiquidity_;

    event MockDeposit(address indexed user, uint256 amount);
    event MockWithdraw(address indexed user, uint256 amount);

    constructor(address _asset, uint256 _highApy, uint256 _lowApy, uint256 _interval) {
        asset = IERC20(_asset);
        highApy = _highApy;
        lowApy = _lowApy;
        oscillateInterval = _interval;
        deployedAt = block.timestamp;
    }

    /// @notice Override APY for testing
    function setAPY(uint256 _newApy) external {
        highApy = _newApy;
        lowApy = _newApy;
    }

    /**
     * @notice Get current APY — oscillates OPPOSITE to Neverland
     * @dev When phase is 0 (Neverland high), TownSquare returns lowApy and vice versa
     */
    function _currentApy() internal view returns (uint256) {
        uint256 phase = ((block.timestamp - deployedAt) / oscillateInterval) % 2;
        // Opposite phase: when Neverland is high (phase 0), TownSquare is low
        return phase == 0 ? lowApy : highApy;
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
     * @notice Get the current APY of the pool — auto-oscillates
     * @return The APY in basis points
     */
    function getAPY() external view override returns (uint256) {
        return _currentApy();
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
