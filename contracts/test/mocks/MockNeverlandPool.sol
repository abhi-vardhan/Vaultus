// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {INeverlandPool} from "../interfaces/INeverlandPool.sol";

/**
 * @title MockNeverlandPool
 * @notice Mock implementation of Neverland Pool for testing
 */
contract MockNeverlandPool is INeverlandPool {
    using SafeERC20 for IERC20;

    IERC20 public asset;
    uint256 public apy; // in basis points (e.g., 500 = 5%)

    mapping(address => uint256) public balances;
    uint256 public totalSupplied;

    event MockSupply(address indexed user, address indexed asset, uint256 amount);
    event MockWithdraw(address indexed user, address indexed asset, uint256 amount);

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
     * @notice Get current APY
     * @return Current APY in basis points
     */
    function getAPY() external view returns (uint256) {
        return apy;
    }

    /**
     * @notice Get APY for an asset (basis points)
     */
    function getAPY(address _asset) external view override returns (uint256) {
        require(_asset == address(asset), "Invalid asset");
        return apy;
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

        // Convert APY (in BPS) to ray rate (in 1e27)
        // APY in BPS / 10000 / 365 days = daily rate
        // For simplicity, approximate annual rate as apy / 10000 in ray
        currentLiquidityRate = uint128((apy * 1e23) / 10000); // Simplified conversion

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
        return (apy * 1e23) / 10000;
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
