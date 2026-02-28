// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {INeverlandPool} from "../../src/interfaces/INeverlandPool.sol";

/**
 * @title MockNeverlandPool
 * @notice Mock Neverland Pool with auto-oscillating APY for demo
 * @dev APY alternates every 10 seconds between highApy and lowApy
 */
contract MockNeverlandPool is INeverlandPool {
    using SafeERC20 for IERC20;

    IERC20 public asset;
    uint256 public highApy;  // APY when this pool is "hot" (basis points)
    uint256 public lowApy;   // APY when this pool is "cold" (basis points)
    uint256 public oscillateInterval; // seconds per phase
    uint256 public deployedAt;

    mapping(address => uint256) public balances;
    uint256 public totalSupplied;

    event MockSupply(address indexed user, address indexed asset, uint256 amount);
    event MockWithdraw(address indexed user, address indexed asset, uint256 amount);

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
     * @notice Get current APY — oscillates automatically based on time
     * @return Current APY in basis points
     */
    function _currentApy() internal view returns (uint256) {
        uint256 phase = ((block.timestamp - deployedAt) / oscillateInterval) % 2;
        return phase == 0 ? highApy : lowApy;
    }

    function getAPY() external view returns (uint256) {
        return _currentApy();
    }

    function getAPY(address _asset) external view override returns (uint256) {
        require(_asset == address(asset), "Invalid asset");
        return _currentApy();
    }

    /**
     * @notice Supply assets to the mock pool
     */
    function supply(
        address _asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external override {
        require(_asset == address(asset), "Invalid asset");
        require(amount > 0, "Amount must be > 0");

        // Transfer USDC from caller to this contract
        asset.safeTransferFrom(msg.sender, address(this), amount);

        // Track balance (in a real pool, this would mint aTokens)
        balances[onBehalfOf] += amount;
        totalSupplied += amount;

        emit MockSupply(onBehalfOf, _asset, amount);
    }

    /**
     * @notice Withdraw assets from the mock pool
     */
    function withdraw(
        address _asset,
        uint256 amount,
        address to
    ) external override returns (uint256) {
        require(_asset == address(asset), "Invalid asset");
        require(amount > 0, "Amount must be > 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");

        // Update balance
        balances[msg.sender] -= amount;
        totalSupplied -= amount;

        // Transfer USDC back to user
        asset.safeTransfer(to, amount);

        emit MockWithdraw(msg.sender, _asset, amount);

        return amount;
    }

    /**
     * @notice Get user account data (mock implementation)
     */
    function getUserAccountData(address user)
        external
        view
        override
        returns (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            uint256 availableBorrowsBase,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        )
    {
        totalCollateralBase = balances[user];
        totalDebtBase = 0;
        availableBorrowsBase = balances[user];
        currentLiquidationThreshold = 8000; // 80%
        ltv = 8000; // 80%
        healthFactor = 10e18; // Very healthy
    }

    /**
     * @notice Get reserve data (mock implementation)
     */
    function getReserveData(address _asset)
        external
        view
        override
        returns (
            uint256 configuration,
            uint128 liquidityIndex,
            uint128 variableBorrowIndex,
            uint128 currentLiquidityRate,
            uint128 currentVariableBorrowRate,
            uint128 currentStableBorrowRate,
            uint40 lastUpdateTimestamp,
            address aTokenAddress,
            address stableDebtTokenAddress,
            address variableDebtTokenAddress,
            address interestRateStrategyAddress,
            uint8 id
        )
    {
        require(_asset == address(asset), "Invalid asset");

        uint256 currentApy = _currentApy();
        currentLiquidityRate = uint128((currentApy * 1e23) / 10000);

        liquidityIndex = 1e27;
        variableBorrowIndex = 1e27;
        currentVariableBorrowRate = 0;
        currentStableBorrowRate = 0;
        lastUpdateTimestamp = uint40(block.timestamp);
        aTokenAddress = address(this);
        stableDebtTokenAddress = address(0);
        variableDebtTokenAddress = address(0);
        interestRateStrategyAddress = address(0);
        id = 0;
    }

    /**
     * @notice Get current liquidity rate
     */
    function getCurrentLiquidityRate(address _asset) external view override returns (uint256) {
        require(_asset == address(asset), "Invalid asset");
        return (_currentApy() * 1e23) / 10000;
    }

    /**
     * @notice Get balance of a user
     */
    function balanceOf(address user) external view returns (uint256) {
        return balances[user];
    }

    /**
     * @notice Get total supplied
     */
    function getTotalSupplied() external view returns (uint256) {
        return totalSupplied;
    }
}
