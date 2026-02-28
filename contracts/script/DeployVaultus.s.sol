// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {VaultusVault} from "../src/VaultusVault.sol";
import {MockUSDC} from "../test/mocks/MockUSDC.sol";
import {MockNeverlandPool} from "../test/mocks/MockNeverlandPool.sol";
import {MockTownSquarePool} from "../test/mocks/MockTownSquarePool.sol";
import {MockCurvancePool} from "../test/mocks/MockCurvancePool.sol";

/**
 * @title DeployVaultus
 * @notice Deployment script for Monad Testnet (chain ID 10143)
 * @dev Deploys mock USDC, 3 mock pools, and VaultusVault
 *
 *   forge script script/DeployVaultus.s.sol \
 *     --rpc-url https://testnet-rpc.monad.xyz \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast
 */
contract DeployVaultus is Script {
    // ============= Configuration =============
    uint256 constant REBALANCE_THRESHOLD = 100; // 1% in basis points
    uint256 constant MIN_REBALANCE_INTERVAL = 0; // No cooldown

    // APY oscillation config (basis points) — 3-phase rotation
    // Each pool has unique base APYs + pseudo-random wobble for variety
    // Neverland: aggressive high-yield pool
    uint256 constant NEV_HIGH = 1400;    // 14% when hot
    uint256 constant NEV_MID  = 700;     // 7% when mid
    uint256 constant NEV_LOW  = 200;     // 2% when cold
    // TownSquare: balanced stable pool
    uint256 constant TS_HIGH  = 1100;    // 11% when hot
    uint256 constant TS_MID   = 550;     // 5.5% when mid
    uint256 constant TS_LOW   = 300;     // 3% when cold
    // Curvance: high-variance pool
    uint256 constant CV_HIGH  = 1600;    // 16% when hot
    uint256 constant CV_MID   = 450;     // 4.5% when mid
    uint256 constant CV_LOW   = 150;     // 1.5% when cold

    uint256 constant OSCILLATE_INTERVAL = 10;  // 10 seconds per phase

    function run() external {
        vm.startBroadcast();

        // 1. Deploy Mock USDC
        MockUSDC usdc = new MockUSDC();
        console2.log("MockUSDC deployed:", address(usdc));

        // 2. Deploy Mock Neverland Pool (hot in phase 0)
        MockNeverlandPool neverland = new MockNeverlandPool(
            address(usdc), NEV_HIGH, NEV_MID, NEV_LOW, OSCILLATE_INTERVAL
        );
        console2.log("MockNeverlandPool deployed:", address(neverland));

        // 3. Deploy Mock TownSquare Pool (hot in phase 1)
        MockTownSquarePool townSquare = new MockTownSquarePool(
            address(usdc), TS_HIGH, TS_MID, TS_LOW, OSCILLATE_INTERVAL
        );
        console2.log("MockTownSquarePool deployed:", address(townSquare));

        // 4. Deploy Mock Curvance Pool (hot in phase 2)
        MockCurvancePool curvance = new MockCurvancePool(
            address(usdc), CV_HIGH, CV_MID, CV_LOW, OSCILLATE_INTERVAL
        );
        console2.log("MockCurvancePool deployed:", address(curvance));

        // 5. Deploy VaultusVault
        VaultusVault vault = new VaultusVault(
            address(usdc),
            address(neverland),
            address(townSquare),
            address(curvance),
            REBALANCE_THRESHOLD,
            MIN_REBALANCE_INTERVAL
        );
        console2.log("VaultusVault deployed:", address(vault));

        // 6. Mint some test USDC to deployer (1,000,000 USDC)
        usdc.mint(msg.sender, 1_000_000 * 1e6);
        console2.log("Minted 1,000,000 USDC to deployer");

        vm.stopBroadcast();

        // Summary
        console2.log("");
        console2.log("=== Vaultus Deployed on Monad Testnet ===");
        console2.log("MockUSDC:          ", address(usdc));
        console2.log("MockNeverlandPool: ", address(neverland));
        console2.log("MockTownSquarePool:", address(townSquare));
        console2.log("MockCurvancePool:  ", address(curvance));
        console2.log("VaultusVault:      ", address(vault));
        console2.log("Rebalance Threshold:", REBALANCE_THRESHOLD, "bps");
        console2.log("Oscillation Interval:", OSCILLATE_INTERVAL, "sec");
    }
}
