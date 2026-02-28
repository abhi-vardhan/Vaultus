// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {VaultusVault} from "../src/VaultusVault.sol";
import {MockUSDC} from "../test/mocks/MockUSDC.sol";
import {MockNeverlandPool} from "../test/mocks/MockNeverlandPool.sol";
import {MockTownSquarePool} from "../test/mocks/MockTownSquarePool.sol";

/**
 * @title DeployVaultus
 * @notice Deployment script for Monad Testnet (chain ID 10143)
 * @dev Deploys mock USDC, mock pools, and VaultusVault
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

    // APY oscillation config (basis points)
    uint256 constant NEVERLAND_HIGH_APY = 1200;    // 12% when hot
    uint256 constant NEVERLAND_LOW_APY = 300;      // 3% when cold
    uint256 constant TOWNSQUARE_HIGH_APY = 1100;   // 11% when hot
    uint256 constant TOWNSQUARE_LOW_APY = 400;     // 4% when cold
    uint256 constant OSCILLATE_INTERVAL = 10;      // Swap every 10 seconds

    function run() external {
        vm.startBroadcast();

        // 1. Deploy Mock USDC
        MockUSDC usdc = new MockUSDC();
        console2.log("MockUSDC deployed:", address(usdc));

        // 2. Deploy Mock Neverland Pool (auto-oscillating APY)
        MockNeverlandPool neverland = new MockNeverlandPool(
            address(usdc), NEVERLAND_HIGH_APY, NEVERLAND_LOW_APY, OSCILLATE_INTERVAL
        );
        console2.log("MockNeverlandPool deployed:", address(neverland));

        // 3. Deploy Mock TownSquare Pool (auto-oscillating APY, opposite phase)
        MockTownSquarePool townSquare = new MockTownSquarePool(
            address(usdc), TOWNSQUARE_HIGH_APY, TOWNSQUARE_LOW_APY, OSCILLATE_INTERVAL
        );
        console2.log("MockTownSquarePool deployed:", address(townSquare));

        // 4. Deploy VaultusVault
        VaultusVault vault = new VaultusVault(
            address(usdc),
            address(neverland),
            address(townSquare),
            REBALANCE_THRESHOLD,
            MIN_REBALANCE_INTERVAL
        );
        console2.log("VaultusVault deployed:", address(vault));

        // 5. Mint some test USDC to deployer (1,000,000 USDC)
        usdc.mint(msg.sender, 1_000_000 * 1e6);
        console2.log("Minted 1,000,000 USDC to deployer");

        vm.stopBroadcast();

        // Summary
        console2.log("");
        console2.log("=== Vaultus Deployed on Monad Testnet ===");
        console2.log("MockUSDC:          ", address(usdc));
        console2.log("MockNeverlandPool: ", address(neverland));
        console2.log("MockTownSquarePool:", address(townSquare));
        console2.log("VaultusVault:      ", address(vault));
        console2.log("Rebalance Threshold:", REBALANCE_THRESHOLD, "bps");
        console2.log("Min Rebalance Interval:", MIN_REBALANCE_INTERVAL, "sec");
    }
}
