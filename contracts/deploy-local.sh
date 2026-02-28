#!/bin/bash

# Local Anvil Deployment Script
# This script starts anvil and deploys the Vaultus smart contracts

set -e

echo "================================"
echo "Vaultus Local Deployment Script"
echo "================================"
echo ""

# Kill any existing anvil instances
echo "Killing existing Anvil instances..."
pkill -f anvil || true
sleep 1

# Check if anvil is installed
if ! command -v anvil &> /dev/null; then
    echo "Error: anvil not found. Please install Foundry:"
    echo "curl -L https://foundry.paradigm.xyz | bash"
    exit 1
fi

echo "Starting Anvil..."
echo "RPC: http://localhost:8545"
echo "Chain ID: 31337"
echo ""

# Start anvil in the background (no fork, fresh instance)
anvil &
ANVIL_PID=$!

echo "Anvil PID: $ANVIL_PID"
echo "Waiting for Anvil to start..."
sleep 5

# Verify anvil is running
echo "Checking Anvil connectivity..."
for i in {1..10}; do
    if curl -s -X POST http://127.0.0.1:8545 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"net_version","id":1}' > /dev/null 2>&1; then
        echo "Anvil is ready!"
        break
    fi
    echo "Attempt $i: Waiting for Anvil..."
    sleep 1
done

echo ""
echo "Deploying Vaultus contracts..."
echo ""

# Deploy using forge script with default anvil account
cd "$(dirname "$0")"
forge script script/DeployVaultus.s.sol \
    --rpc-url http://localhost:8545 \
    --private-key ac0974bec39a17e36ba4a6b4d238ff944bacb476cad982d8fcd4f3dd4d3cba4e \
    --broadcast

echo ""
echo "================================"
echo "Deployment Complete!"
echo "================================"
echo ""
echo "Anvil is running at http://localhost:8545"
echo "Chain ID: 31337"
echo "Press Ctrl+C to stop Anvil"
echo ""

# Keep anvil running
wait $ANVIL_PID
