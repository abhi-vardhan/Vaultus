// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {VaultusVault} from "../src/VaultusVault.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {MockNeverlandPool} from "./mocks/MockNeverlandPool.sol";
import {MockTownSquarePool} from "./mocks/MockTownSquarePool.sol";

contract VaultusVaultTest is Test {
    VaultusVault public vault;
    MockUSDC public usdc;
    MockNeverlandPool public neverlandPool;
    MockTownSquarePool public townSquarePool;

    // Re-declare events for vm.expectEmit
    event Rebalanced(uint256 apyNeverland, uint256 apyTownSquare, uint256 timestamp);

    address constant ALICE = address(0x1111);
    address constant BOB = address(0x2222);
    address constant CHARLIE = address(0x3333);

    uint256 constant INITIAL_USDC = 10000e6; // 10,000 USDC
    uint256 constant REBALANCE_THRESHOLD = 100; // 1% in basis points
    uint256 constant MIN_REBALANCE_INTERVAL = 3600; // 1 hour

    function setUp() public {
        // Deploy mock tokens and pools
        usdc = new MockUSDC();
        neverlandPool = new MockNeverlandPool(address(usdc), 500, 500, 1); // 5% APY static
        townSquarePool = new MockTownSquarePool(address(usdc), 400, 400, 1); // 4% APY static

        // Deploy vault
        vault = new VaultusVault(
            address(usdc),
            address(neverlandPool),
            address(townSquarePool),
            REBALANCE_THRESHOLD,
            MIN_REBALANCE_INTERVAL
        );

        // Mint USDC to test users
        usdc.mint(ALICE, INITIAL_USDC);
        usdc.mint(BOB, INITIAL_USDC);
        usdc.mint(CHARLIE, INITIAL_USDC);

        // Approve vault to spend USDC
        vm.startPrank(ALICE);
        usdc.approve(address(vault), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(BOB);
        usdc.approve(address(vault), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(CHARLIE);
        usdc.approve(address(vault), type(uint256).max);
        vm.stopPrank();
    }

    // ============= Deposit Tests =============

    function test_Deposit_FirstDeposit() public {
        uint256 depositAmount = 100e6; // 100 USDC
        uint256 aliceBalanceBefore = usdc.balanceOf(ALICE);

        vm.prank(ALICE);
        vault.deposit(depositAmount);

        // First depositor should get depositAmount * SHARE_PRECISION shares
        uint256 expectedShares = depositAmount * 1e18;
        assertEq(vault.userShares(ALICE), expectedShares);
        assertEq(vault.totalShares(), expectedShares);
        assertEq(usdc.balanceOf(ALICE), aliceBalanceBefore - depositAmount);
    }

    function test_Deposit_RoutesToHigherAPY() public {
        uint256 depositAmount = 100e6;

        vm.prank(ALICE);
        vault.deposit(depositAmount);

        // Neverland has 5% APY, TownSquare has 4% APY
        // So deposit should go to Neverland
        (uint256 neverland, uint256 townSquare) = vault.getAllocation();
        assertEq(neverland, depositAmount);
        assertEq(townSquare, 0);
    }

    function test_Deposit_MultipleDeposits() public {
        uint256 amount1 = 100e6;
        uint256 amount2 = 200e6;

        vm.prank(ALICE);
        vault.deposit(amount1);

        uint256 aliceSharesAfterFirst = vault.userShares(ALICE);

        vm.prank(BOB);
        vault.deposit(amount2);

        // Bob's shares should be calculated as (amount * totalShares) / getTotalAssets()
        uint256 expectedBobShares = (amount2 * aliceSharesAfterFirst) / amount1;
        assertEq(vault.userShares(BOB), expectedBobShares);
    }

    function test_Deposit_ZeroAmountReverts() public {
        vm.prank(ALICE);
        vm.expectRevert(VaultusVault.VaultusVault__ZeroAmount.selector);
        vault.deposit(0);
    }

    function test_Deposit_PausedReverts() public {
        vm.prank(vault.owner());
        vault.pause();

        vm.prank(ALICE);
        vm.expectRevert(VaultusVault.VaultusVault__Paused.selector);
        vault.deposit(100e6);
    }

    // ============= Withdraw Tests =============

    function test_Withdraw_FullWithdraw() public {
        uint256 depositAmount = 100e6;

        vm.prank(ALICE);
        vault.deposit(depositAmount);

        uint256 shares = vault.userShares(ALICE);
        uint256 usdcBefore = usdc.balanceOf(ALICE);

        vm.prank(ALICE);
        vault.withdraw(shares);

        assertEq(vault.userShares(ALICE), 0);
        assertEq(usdc.balanceOf(ALICE), usdcBefore + depositAmount);
    }

    function test_Withdraw_PartialWithdraw() public {
        uint256 depositAmount = 100e6;

        vm.prank(ALICE);
        vault.deposit(depositAmount);

        uint256 totalShares = vault.userShares(ALICE);
        uint256 sharesToWithdraw = totalShares / 2;

        vm.prank(ALICE);
        vault.withdraw(sharesToWithdraw);

        assertEq(vault.userShares(ALICE), totalShares - sharesToWithdraw);
    }

    function test_Withdraw_ZeroAmountReverts() public {
        vm.prank(ALICE);
        vm.expectRevert(VaultusVault.VaultusVault__ZeroAmount.selector);
        vault.withdraw(0);
    }

    function test_Withdraw_InsufficientBalanceReverts() public {
        uint256 depositAmount = 100e6;

        vm.prank(ALICE);
        vault.deposit(depositAmount);

        uint256 excessiveShares = vault.userShares(ALICE) + 1;

        vm.prank(ALICE);
        vm.expectRevert(VaultusVault.VaultusVault__InsufficientBalance.selector);
        vault.withdraw(excessiveShares);
    }

    function test_Withdraw_PausedReverts() public {
        vm.prank(ALICE);
        vault.deposit(100e6);

        vm.prank(vault.owner());
        vault.pause();

        vm.prank(ALICE);
        vm.expectRevert(VaultusVault.VaultusVault__Paused.selector);
        vault.withdraw(vault.userShares(ALICE));
    }

    // ============= Rebalancing Tests =============

    function test_Rebalance_InlineDuringDeposit() public {
        // Deposit to Neverland (5% APY > 4% APY)
        vm.prank(ALICE);
        vault.deposit(100e6);

        (uint256 neverland, uint256 townSquare) = vault.getAllocation();
        assertEq(neverland, 100e6);
        assertEq(townSquare, 0);

        // Change APYs: TownSquare now higher (6% > 5%)
        townSquarePool.setAPY(600);

        // Deposit should trigger rebalance (if cooldown elapsed)
        // For now, cooldown is still active, so no rebalance happens inline
        vm.warp(block.timestamp + MIN_REBALANCE_INTERVAL + 1);

        vm.prank(BOB);
        vault.deposit(100e6);

        // After deposit, rebalance should have moved funds to TownSquare
        (neverland, townSquare) = vault.getAllocation();
        // Both deposits should now be in TownSquare
        assertGt(townSquare, 0);
    }

    function test_Rebalance_PublicRebalance() public {
        // Deposit to Neverland
        vm.prank(ALICE);
        vault.deposit(100e6);

        // Change APYs so TownSquare is now better
        townSquarePool.setAPY(600); // 6% > 5%

        // Wait for cooldown
        vm.warp(block.timestamp + MIN_REBALANCE_INTERVAL + 1);

        // Call rebalance
        vault.rebalance();

        // Check that funds moved to TownSquare
        (uint256 neverland, uint256 townSquare) = vault.getAllocation();
        assertEq(neverland, 0);
        assertEq(townSquare, 100e6);
    }

    function test_Rebalance_CooldownEnforced() public {
        vm.prank(ALICE);
        vault.deposit(100e6);

        townSquarePool.setAPY(600);

        // Try to rebalance immediately (should fail)
        vm.expectRevert(VaultusVault.VaultusVault__RebalanceTooSoon.selector);
        vault.rebalance();
    }

    function test_Rebalance_ThresholdEnforced() public {
        vm.prank(ALICE);
        vault.deposit(100e6);

        // Set APY difference to only 50 BPS (below 100 BPS threshold)
        neverlandPool.setAPY(550); // 5.5%
        townSquarePool.setAPY(500); // 5%

        vm.warp(block.timestamp + MIN_REBALANCE_INTERVAL + 1);

        vm.expectRevert(VaultusVault.VaultusVault__ThresholdNotMet.selector);
        vault.rebalance();
    }

    function test_Rebalance_NoFundsReverts() public {
        // Try to rebalance without any funds
        vm.warp(block.timestamp + MIN_REBALANCE_INTERVAL + 1);

        vm.expectRevert(VaultusVault.VaultusVault__NoFundsToRebalance.selector);
        vault.rebalance();
    }

    function test_Rebalance_EmitsEvent() public {
        vm.prank(ALICE);
        vault.deposit(100e6);

        townSquarePool.setAPY(600);
        vm.warp(block.timestamp + MIN_REBALANCE_INTERVAL + 1);

        vm.expectEmit(true, true, true, true);
        emit Rebalanced(500, 600, block.timestamp);
        vault.rebalance();
    }

    // ============= Emergency Functions =============

    function test_EmergencyWithdrawAll() public {
        vm.prank(ALICE);
        vault.deposit(100e6);

        vm.prank(BOB);
        vault.deposit(50e6);

        // Emergency withdraw as owner
        vm.prank(vault.owner());
        vault.emergencyWithdrawAll();

        // All funds should be back in vault contract
        (uint256 neverland, uint256 townSquare) = vault.getAllocation();
        assertEq(neverland, 0);
        assertEq(townSquare, 0);

        // Vault should be paused
        assertEq(vault.paused(), true);

        // No more deposits allowed
        vm.prank(ALICE);
        vm.expectRevert(VaultusVault.VaultusVault__Paused.selector);
        vault.deposit(100e6);
    }

    function test_EmergencyWithdrawAll_OnlyOwner() public {
        vm.prank(ALICE);
        vault.deposit(100e6);

        vm.prank(BOB);
        vm.expectRevert();
        vault.emergencyWithdrawAll();
    }

    // ============= Pause/Unpause Tests =============

    function test_Pause_BlocksDeposit() public {
        vm.prank(vault.owner());
        vault.pause();

        vm.prank(ALICE);
        vm.expectRevert(VaultusVault.VaultusVault__Paused.selector);
        vault.deposit(100e6);
    }

    function test_Pause_BlocksWithdraw() public {
        vm.prank(ALICE);
        vault.deposit(100e6);

        vm.prank(vault.owner());
        vault.pause();

        vm.prank(ALICE);
        vm.expectRevert(VaultusVault.VaultusVault__Paused.selector);
        vault.withdraw(vault.userShares(ALICE));
    }

    function test_Unpause_AllowsOperations() public {
        vm.prank(vault.owner());
        vault.pause();

        vm.prank(vault.owner());
        vault.unpause();

        vm.prank(ALICE);
        vault.deposit(100e6);

        assertGt(vault.userShares(ALICE), 0);
    }

    // ============= Share Accounting Tests =============

    function test_ShareAccounting_MultipleUsers() public {
        // Alice deposits 100 USDC
        vm.prank(ALICE);
        vault.deposit(100e6);

        uint256 aliceShares = vault.userShares(ALICE);

        // Bob deposits 200 USDC (at same valuation)
        vm.prank(BOB);
        vault.deposit(200e6);

        uint256 bobShares = vault.userShares(BOB);

        // Bob should have 2x Alice's shares
        assertEq(bobShares, 2 * aliceShares);

        // Total assets should be 300
        assertEq(vault.getTotalAssets(), 300e6);

        // Get user balances
        uint256 aliceBalance = vault.getUserBalance(ALICE);
        uint256 bobBalance = vault.getUserBalance(BOB);

        assertEq(aliceBalance, 100e6);
        assertEq(bobBalance, 200e6);
    }

    function test_SharePrice_Increases() public {
        vm.prank(ALICE);
        vault.deposit(100e6);

        uint256 sharePriceBefore = vault.getSharePrice();

        // Simulate yield accrual by minting additional USDC to the vault
        usdc.mint(address(vault), 10e6); // 10% yield

        uint256 sharePriceAfter = vault.getSharePrice();

        assertGt(sharePriceAfter, sharePriceBefore);
    }

    // ============= Configuration Tests =============

    function test_SetRebalanceThreshold() public {
        assertEq(vault.rebalanceThreshold(), REBALANCE_THRESHOLD);

        vm.prank(vault.owner());
        vault.setRebalanceThreshold(200);

        assertEq(vault.rebalanceThreshold(), 200);
    }

    function test_SetMinRebalanceInterval() public {
        assertEq(vault.minRebalanceInterval(), MIN_REBALANCE_INTERVAL);

        vm.prank(vault.owner());
        vault.setMinRebalanceInterval(7200);

        assertEq(vault.minRebalanceInterval(), 7200);
    }

    // ============= View Functions Tests =============

    function test_GetTotalAssets() public {
        vm.prank(ALICE);
        vault.deposit(100e6);

        vm.prank(BOB);
        vault.deposit(200e6);

        assertEq(vault.getTotalAssets(), 300e6);
    }

    function test_GetCurrentAPYs() public {
        neverlandPool.setAPY(500);
        townSquarePool.setAPY(400);

        (uint256 neverlandAPY, uint256 townSquareAPY) = vault.getCurrentAPYs();

        assertEq(neverlandAPY, 500);
        assertEq(townSquareAPY, 400);
    }

    function test_SharestoAssets() public {
        vm.prank(ALICE);
        vault.deposit(100e6);

        uint256 shares = vault.userShares(ALICE);
        uint256 assets = vault.sharesToAssets(shares);

        assertEq(assets, 100e6);
    }

    function test_AssetsToShares() public {
        vm.prank(ALICE);
        vault.deposit(100e6);

        uint256 shares = vault.assetsToShares(100e6);

        assertEq(shares, vault.userShares(ALICE));
    }

    // ============= Complex Scenarios =============

    function test_Scenario_DepositWithdrawRebalance() public {
        // Alice deposits
        vm.prank(ALICE);
        vault.deposit(100e6);

        // Bob deposits (triggers possible rebalance if conditions met)
        vm.prank(BOB);
        vault.deposit(100e6);

        // Withdraw partial
        vm.prank(ALICE);
        vault.withdraw(vault.userShares(ALICE) / 2);

        // Rebalance
        townSquarePool.setAPY(600);
        vm.warp(block.timestamp + MIN_REBALANCE_INTERVAL + 1);
        vault.rebalance();

        // Final withdraw
        vm.prank(BOB);
        vault.withdraw(vault.userShares(BOB));

        assertEq(vault.totalShares(), vault.userShares(ALICE));
    }

    function test_Scenario_MultiuserYieldAccrual() public {
        // Three users deposit equal amounts
        vm.prank(ALICE);
        vault.deposit(100e6);

        vm.prank(BOB);
        vault.deposit(100e6);

        vm.prank(CHARLIE);
        vault.deposit(100e6);

        // Simulate 10% yield
        usdc.mint(address(vault), 30e6);

        // Each user should now have 110 USDC worth
        uint256 aliceBalance = vault.getUserBalance(ALICE);
        uint256 bobBalance = vault.getUserBalance(BOB);
        uint256 charlieBalance = vault.getUserBalance(CHARLIE);

        assertEq(aliceBalance, 110e6);
        assertEq(bobBalance, 110e6);
        assertEq(charlieBalance, 110e6);
    }
}
