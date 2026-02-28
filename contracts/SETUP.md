# Local Setup & Deployment Guide

## Prerequisites

Install [Foundry](https://book.getfoundry.sh/):

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## Setup

### 1. Install Dependencies

```bash
cd contracts

# Install submodules
git submodule update --init --recursive

# Install OpenZeppelin Contracts (if not already a submodule)
forge install OpenZeppelin/openzeppelin-contracts
```

### 2. Create .env file

```bash
cp .env.example .env
```

The default `.env` contains:

- `PRIVATE_KEY`: Default anvil account key (use as-is for local testing)
- `ETH_RPC_URL`: Local anvil RPC (http://localhost:8545)

## Local Deployment with Anvil

### Option 1: Automated Script (Recommended)

```bash
cd contracts
chmod +x deploy-local.sh
./deploy-local.sh
```

This will:

1. Start Anvil at http://localhost:8545
2. Deploy all contracts (MockUSDC, MockNeverlandPool, MockTownSquarePool, VaultusVault)
3. Mint 100,000 test USDC to the deployer
4. Output all contract addresses

### Option 2: Manual Steps

**Terminal 1: Start Anvil**

```bash
anvil
```

**Terminal 2: Deploy Contracts**

```bash
cd contracts

# Create .env if you haven't already
cp .env.example .env

# Deploy
forge script script/DeployVaultus.s.sol \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb476cad982d8fcd4f3dd4d3cba4e \
  --broadcast
```

## Running Tests

```bash
cd contracts
forge test
# or for verbose output:
forge test -vvv
```

## Configuration after Deployment

1. Copy the VaultusVault address from deployment output
2. Update `frontend/app/contracts.ts`:

   ```typescript
   export const ADDRESSES = {
     AUTOMATION_VAULT: "0x...", // Paste VaultusVault address
     USDC: "0x...", // Paste MockUSDC address
   };
   ```

3. Add Anvil to your wallet:
   - **Name**: Anvil Local
   - **RPC URL**: http://localhost:8545
   - **Chain ID**: 31337
   - **Currency Symbol**: ETH

4. Import the deployer account to your wallet:
   - **Private Key**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb476cad982d8fcd4f3dd4d3cba4e`
   - You'll have 100,000 test USDC automatically

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Then visit http://localhost:3000 and connect your wallet to Anvil (Chain ID 31337).

## Troubleshooting

### "Cannot find openzeppelin/contracts"

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts
```

### Anvil not found

```bash
foundryup
```

### Forge test failing

```bash
cd contracts
forge clean
forge build
forge test -vvv
```

### Contract addresses not showing

Make sure you're using the `--broadcast` flag and that anvil is running.

## Next Steps

1. Deploy locally with Anvil
2. Run comprehensive tests with `forge test`
3. Test frontend UI by connecting wallet to Anvil
4. Modify APYs in the mock pools using the setAPY() function to test rebalancing
