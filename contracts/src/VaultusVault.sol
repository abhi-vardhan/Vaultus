// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {INeverlandPool} from "./interfaces/INeverlandPool.sol";
import {ITownSquarePool} from "./interfaces/ITownSquarePool.sol";

contract VaultusVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============= Constants =============
    uint256 private constant SHARE_PRECISION = 1e18;

    // ============= State Variables =============
    IERC20 public asset;
    INeverlandPool public poolNeverland;
    ITownSquarePool public poolTownSquare;

    uint256 public totalShares;
    mapping(address => uint256) public userShares;

    uint256 public allocationNeverland;
    uint256 public allocationTownSquare;

    uint256 public rebalanceThreshold; // in basis points (e.g., 100 = 1%)
    uint256 public minRebalanceInterval; // in seconds
    uint256 public lastRebalance;

    bool public paused;

    // ============= Events =============
    event Deposit(address indexed user, uint256 amount, uint256 shares);
    event Withdraw(address indexed user, uint256 amount, uint256 shares);
    event Rebalanced(uint256 apyNeverland, uint256 apyTownSquare, uint256 timestamp);
    event AllocationUpdated(address indexed pool, uint256 newAllocation);
    event EmergencyWithdraw(uint256 amountNeverland, uint256 amountTownSquare);
    event Paused(bool state);

    // ============= Errors =============
    error VaultusVault__ZeroAddress();
    error VaultusVault__ZeroAmount();
    error VaultusVault__InsufficientBalance();
    error VaultusVault__Paused();
    error VaultusVault__RebalanceTooSoon();
    error VaultusVault__NoFundsToRebalance();
    error VaultusVault__ThresholdNotMet();

    // ============= Constructor =============
    constructor(
        address _asset,
        address _poolNeverland,
        address _poolTownSquare,
        uint256 _rebalanceThreshold,
        uint256 _minRebalanceInterval
    ) Ownable(msg.sender) {
        if (_asset == address(0) || _poolNeverland == address(0) || _poolTownSquare == address(0)) {
            revert VaultusVault__ZeroAddress();
        }

        asset = IERC20(_asset);
        poolNeverland = INeverlandPool(_poolNeverland);
        poolTownSquare = ITownSquarePool(_poolTownSquare);

        rebalanceThreshold = _rebalanceThreshold;
        minRebalanceInterval = _minRebalanceInterval;
        lastRebalance = block.timestamp;

        // Approve pools to spend USDC
        asset.safeApprove(_poolNeverland, type(uint256).max);
        asset.safeApprove(_poolTownSquare, type(uint256).max);
    }

    // ============= Deposit/Withdraw =============
    function deposit(uint256 amount) external nonReentrant {
        if (paused) revert VaultusVault__Paused();
        if (amount == 0) revert VaultusVault__ZeroAmount();

        // Transfer USDC from user
        asset.safeTransferFrom(msg.sender, address(this), amount);

        // Calculate shares to mint
        uint256 sharesToMint;
        if (totalShares == 0) {
            sharesToMint = amount * SHARE_PRECISION;
        } else {
            sharesToMint = (amount * totalShares) / getTotalAssets();
        }

        // Update state
        userShares[msg.sender] += sharesToMint;
        totalShares += sharesToMint;

        // Deploy to higher APY pool
        _deployToHigherApyPool(amount);

        // Check and rebalance if needed
        _checkAndRebalanceIfNeeded();

        emit Deposit(msg.sender, amount, sharesToMint);
    }

    function withdraw(uint256 shares) external nonReentrant {
        if (paused) revert VaultusVault__Paused();
        if (shares == 0) revert VaultusVault__ZeroAmount();
        if (userShares[msg.sender] < shares) revert VaultusVault__InsufficientBalance();

        // Calculate USDC to return
        uint256 totalAssets = getTotalAssets();
        uint256 amount = (shares * totalAssets) / totalShares;

        // Update state
        userShares[msg.sender] -= shares;
        totalShares -= shares;

        // Withdraw from pools if needed
        _withdrawFromPools(amount);

        // Transfer USDC to user
        asset.safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, amount, shares);
    }

    // ============= Rebalancing =============
    function rebalance() external nonReentrant {
        if (block.timestamp < lastRebalance + minRebalanceInterval) {
            revert VaultusVault__RebalanceTooSoon();
        }

        (uint256 apyNeverland, uint256 apyTownSquare) = _fetchCurrentAPYs();

        uint256 diff = apyNeverland > apyTownSquare
            ? apyNeverland - apyTownSquare
            : apyTownSquare - apyNeverland;

        if (diff < rebalanceThreshold) {
            revert VaultusVault__ThresholdNotMet();
        }

        _executeRebalance(apyNeverland, apyTownSquare);

        emit Rebalanced(apyNeverland, apyTownSquare, block.timestamp);
    }

    function _checkAndRebalanceIfNeeded() internal {
        if (block.timestamp < lastRebalance + minRebalanceInterval) {
            return;
        }

        (uint256 apyNeverland, uint256 apyTownSquare) = _fetchCurrentAPYs();

        uint256 diff = apyNeverland > apyTownSquare
            ? apyNeverland - apyTownSquare
            : apyTownSquare - apyNeverland;

        if (diff >= rebalanceThreshold) {
            _executeRebalance(apyNeverland, apyTownSquare);
        }
    }

    function _deployToHigherApyPool(uint256 amount) internal {
        (uint256 apyNeverland, uint256 apyTownSquare) = _fetchCurrentAPYs();

        if (apyNeverland >= apyTownSquare) {
            // Deploy to Neverland
            poolNeverland.supply(address(asset), amount, address(this), 0);
            allocationNeverland += amount;
            emit AllocationUpdated(address(poolNeverland), allocationNeverland);
        } else {
            // Deploy to TownSquare
            poolTownSquare.deposit(amount);
            allocationTownSquare += amount;
            emit AllocationUpdated(address(poolTownSquare), allocationTownSquare);
        }
    }

    function _executeRebalance(uint256 apyNeverland, uint256 apyTownSquare) internal {
        if (allocationNeverland == 0 && allocationTownSquare == 0) {
            revert VaultusVault__NoFundsToRebalance();
        }

        if (apyNeverland > apyTownSquare) {
            // Move all to Neverland
            if (allocationTownSquare > 0) {
                poolTownSquare.withdraw(allocationTownSquare);
                allocationTownSquare = 0;
                emit AllocationUpdated(address(poolTownSquare), 0);
            }

            uint256 balance = asset.balanceOf(address(this));
            if (balance > 0) {
                poolNeverland.supply(address(asset), balance, address(this), 0);
                allocationNeverland += balance;
                emit AllocationUpdated(address(poolNeverland), allocationNeverland);
            }
        } else {
            // Move all to TownSquare
            if (allocationNeverland > 0) {
                poolNeverland.withdraw(address(asset), allocationNeverland, address(this));
                allocationNeverland = 0;
                emit AllocationUpdated(address(poolNeverland), 0);
            }

            uint256 balance = asset.balanceOf(address(this));
            if (balance > 0) {
                poolTownSquare.deposit(balance);
                allocationTownSquare += balance;
                emit AllocationUpdated(address(poolTownSquare), allocationTownSquare);
            }
        }

        lastRebalance = block.timestamp;
    }

    function _withdrawFromPools(uint256 amount) internal {
        uint256 balance = asset.balanceOf(address(this));

        if (balance >= amount) {
            return; // Already have enough in contract
        }

        uint256 needed = amount - balance;

        // First try Neverland
        if (allocationNeverland > 0 && needed > 0) {
            uint256 toWithdraw = needed > allocationNeverland ? allocationNeverland : needed;
            poolNeverland.withdraw(address(asset), toWithdraw, address(this));
            allocationNeverland -= toWithdraw;
            needed -= toWithdraw;
            emit AllocationUpdated(address(poolNeverland), allocationNeverland);
        }

        // Then TownSquare
        if (allocationTownSquare > 0 && needed > 0) {
            uint256 toWithdraw = needed > allocationTownSquare ? allocationTownSquare : needed;
            poolTownSquare.withdraw(toWithdraw);
            allocationTownSquare -= toWithdraw;
            emit AllocationUpdated(address(poolTownSquare), allocationTownSquare);
        }
    }

    // ============= Internal View Functions =============
    function _fetchCurrentAPYs() internal view returns (uint256 neverlandAPY, uint256 townSquareAPY) {
        // Get APY from both pools (in basis points)
        neverlandAPY = poolNeverland.getAPY(address(asset));
        townSquareAPY = poolTownSquare.getAPY();
    }

    // ============= Public View Functions =============
    function getTotalAssets() public view returns (uint256) {
        return asset.balanceOf(address(this)) + allocationNeverland + allocationTownSquare;
    }

    function getUserBalance(address user) public view returns (uint256) {
        if (totalShares == 0) return 0;
        return (userShares[user] * getTotalAssets()) / totalShares;
    }

    function getCurrentAPYs() external view returns (uint256 neverlandAPY, uint256 townSquareAPY) {
        return _fetchCurrentAPYs();
    }

    function getAllocation() external view returns (uint256 neverland, uint256 townSquare) {
        return (allocationNeverland, allocationTownSquare);
    }

    function getSharePrice() external view returns (uint256) {
        if (totalShares == 0) return 0;
        return getTotalAssets() / totalShares;
    }

    function sharesToAssets(uint256 shares) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares * getTotalAssets()) / totalShares;
    }

    function assetsToShares(uint256 assets) external view returns (uint256) {
        if (getTotalAssets() == 0) return assets * SHARE_PRECISION;
        return (assets * totalShares) / getTotalAssets();
    }

    // ============= Owner Functions =============
    function emergencyWithdrawAll() external onlyOwner nonReentrant {
        uint256 amountNeverland = 0;
        uint256 amountTownSquare = 0;

        if (allocationNeverland > 0) {
            poolNeverland.withdraw(address(asset), allocationNeverland, address(this));
            amountNeverland = allocationNeverland;
            allocationNeverland = 0;
        }

        if (allocationTownSquare > 0) {
            poolTownSquare.withdraw(allocationTownSquare);
            amountTownSquare = allocationTownSquare;
            allocationTownSquare = 0;
        }

        paused = true;

        emit EmergencyWithdraw(amountNeverland, amountTownSquare);
    }

    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }

    function setRebalanceThreshold(uint256 newThreshold) external onlyOwner {
        rebalanceThreshold = newThreshold;
    }

    function setMinRebalanceInterval(uint256 newInterval) external onlyOwner {
        minRebalanceInterval = newInterval;
    }
}
