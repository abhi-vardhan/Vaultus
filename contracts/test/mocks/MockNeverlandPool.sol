// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {INeverlandPool} from "../../src/interfaces/INeverlandPool.sol";

/**
 * @title MockNeverlandPool
 * @notice Mock Neverland Pool with auto-oscillating APY for demo
 * @dev 3-phase cycle: Phase 0 = hot, Phase 1 = mid, Phase 2 = low
 */
contract MockNeverlandPool is INeverlandPool {
    using SafeERC20 for IERC20;

    IERC20 public asset;
    uint256 public highApy;  // APY when this pool is "hot" (basis points)
    uint256 public midApy;   // APY when this pool is "mid" (basis points)
    uint256 public lowApy;   // APY when this pool is "cold" (basis points)
    uint256 public oscillateInterval; // seconds per phase
    uint256 public deployedAt;

    mapping(address => uint256) public balances;
    uint256 public totalSupplied;
    bool public manualOverride;

    event MockSupply(address indexed user, address indexed asset, uint256 amount);
    event MockWithdraw(address indexed user, address indexed asset, uint256 amount);

    constructor(address _asset, uint256 _highApy, uint256 _midApy, uint256 _lowApy, uint256 _interval) {
        asset = IERC20(_asset);
        highApy = _highApy;
        midApy = _midApy;
        lowApy = _lowApy;
        oscillateInterval = _interval;
        deployedAt = block.timestamp;
    }

    /// @notice Override APY for testing (disables wobble)
    function setAPY(uint256 _newApy) external {
        highApy = _newApy;
        midApy = _newApy;
        lowApy = _newApy;
        manualOverride = true;
    }

    /**
     * @notice Get current APY — 3-phase oscillation
     * @dev Neverland is hot in phase 0
     */
    function _currentApy() internal view returns (uint256) {
        uint256 phase = ((block.timestamp - deployedAt) / oscillateInterval) % 3;
        uint256 base;
        if (phase == 0) base = highApy;       // Neverland is hot
        else if (phase == 1) base = midApy;   // TownSquare is hot, Neverland mid
        else base = lowApy;                   // Curvance is hot, Neverland low

        // Skip wobble if APY was manually set for testing
        if (manualOverride) return base;

        // Add pseudo-random wobble so APYs look varied
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp / 3, address(this))));
        uint256 wobble = seed % 150; // 0-149 basis points variation
        if ((seed / 150) % 2 == 0) {
            return base + wobble;
        } else {
            return base > wobble ? base - wobble : base;
        }
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
