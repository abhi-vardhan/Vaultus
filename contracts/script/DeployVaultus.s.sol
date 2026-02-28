// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {VaultusVault} from "../src/VaultusVault.sol";
import {MockUSDC} from "../test/mocks/MockUSDC.sol";
import {MockNeverlandPool} from "../test/mocks/MockNeverlandPool.sol";
import {MockTownSquarePool} from "../test/mocks/MockTownSquarePool.sol";

/**
 * @title DeployVaultus
 * @notice Deployment script for local anvil testing and development
 * Usage: forge script script/DeployVaultus.s.sol --rpc-url http://localhost:8545 --broadcast
 */
contract DeployVaultus is Script {
    // Configuration
    uint256 constant REBALANCE_THRESHOLD = 100; // 1% in basis points
    uint256 constant MIN_REBALANCE_INTERVAL = 3600; // 1 hour
    uint256 constant NEVERLAND_INITIAL_APY = 500; // 5%
    uint256 constant TOWNSQUARE_INITIAL_APY = 400; // 4%

    // Deployed contracts
    MockUSDC public usdc;
    MockNeverlandPool public neverlandPool;
    MockTownSquarePool public townSquarePool;
    VaultusVault public vault;

    function run() external {
        vm.startBroadcast();

        // 1. Deploy MockUSDC
        usdc = new MockUSDC();

        // 2. Deploy MockNeverlandPool
        neverlandPool = new MockNeverlandPool(address(usdc), NEVERLAND_INITIAL_APY);

        // 3. Deploy MockTownSquarePool
        townSquarePool = new MockTownSquarePool(address(usdc), TOWNSQUARE_INITIAL_APY);

        // 4. Deploy VaultusVault
        vault = new VaultusVault(
            address(usdc),
            address(neverlandPool),
            address(townSquarePool),
            REBALANCE_THRESHOLD,
            MIN_REBALANCE_INTERVAL
        );

        // 5. Mint test USDC to deployer
        usdc.mint(msg.sender, 100000e6); // 100,000 USDC

        vm.stopBroadcast();
    }
}
