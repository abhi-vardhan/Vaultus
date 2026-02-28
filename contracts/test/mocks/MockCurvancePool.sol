// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ICurvancePool} from "../../src/interfaces/ICurvancePool.sol";

/**
 * @title MockCurvancePool
 * @notice Mock Curvance Pool with auto-oscillating APY for demo
 * @dev APY cycles through 3 phases (one per pool) so each pool
 *      takes turns being the highest-yield option.
 *      Phase 0: Neverland high  → Curvance mid  → TownSquare low
 *      Phase 1: TownSquare high → Neverland mid → Curvance low
 *      Phase 2: Curvance high   → TownSquare mid → Neverland low
 */
contract MockCurvancePool is ICurvancePool {
    using SafeERC20 for IERC20;

    IERC20 public asset;
    uint256 public highApy;  // APY when this pool is "hot" (basis points)
    uint256 public midApy;   // APY when this pool is "mid" (basis points)
    uint256 public lowApy;   // APY when this pool is "cold" (basis points)
    uint256 public oscillateInterval; // seconds per phase
    uint256 public deployedAt;

    mapping(address => uint256) public balances;
    uint256 public totalLiquidity_;
    bool public manualOverride;

    event MockDeposit(address indexed user, uint256 amount);
    event MockWithdraw(address indexed user, uint256 amount);

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
     * @notice Get current APY — auto-oscillates in 3-phase cycle
     * @dev Curvance is hot in phase 2
     */
    function _currentApy() internal view returns (uint256) {
        uint256 phase = ((block.timestamp - deployedAt) / oscillateInterval) % 3;
        uint256 base;
        if (phase == 2) base = highApy;       // Curvance is hot
        else if (phase == 0) base = midApy;   // Neverland is hot, Curvance mid
        else base = lowApy;                   // TownSquare is hot, Curvance low

        // Skip wobble if APY was manually set for testing
        if (manualOverride) return base;

        // Add pseudo-random wobble so APYs look varied
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp / 3, address(this))));
        uint256 wobble = seed % 170; // 0-169 basis points variation
        if ((seed / 170) % 2 == 0) {
            return base + wobble;
        } else {
            return base > wobble ? base - wobble : base;
        }
    }

    function deposit(uint256 amount) external override {
        require(amount > 0, "Amount must be > 0");
        asset.safeTransferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;
        totalLiquidity_ += amount;
        emit MockDeposit(msg.sender, amount);
    }

    function withdraw(uint256 amount) external override {
        require(amount > 0, "Amount must be > 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        totalLiquidity_ -= amount;
        asset.safeTransfer(msg.sender, amount);
        emit MockWithdraw(msg.sender, amount);
    }

    function getAPY() external view override returns (uint256) {
        return _currentApy();
    }

    function balanceOf(address user) external view override returns (uint256) {
        return balances[user];
    }

    function totalLiquidity() external view override returns (uint256) {
        return totalLiquidity_;
    }
}
