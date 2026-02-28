# Vaultus

Automated yield optimization vault on Monad Mainnet. Accepts USDC deposits, allocates capital across two lending protocols (Neverland and TownSquare), and rebalances to the higher-yielding protocol automatically.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Smart Contracts](#smart-contracts)
  - [VaultusVault.sol](#vaultussvaultsol)
  - [INeverlandPool.sol](#ineverlandpoolsol)
  - [ITownSquarePool.sol](#itownsquarepoolsol)
  - [DeployVaultus.s.sol](#deployvaultussol)
- [Protocol Integrations](#protocol-integrations)
  - [Neverland](#neverland)
  - [TownSquare](#townsquare)
- [Automation Logic](#automation-logic)
- [Monad Network](#monad-network)
- [Frontend](#frontend)
- [Setup](#setup)
- [Deployment](#deployment)
- [Testing](#testing)
- [Contract Addresses](#contract-addresses)
- [Backup Protocols](#backup-protocols)
- [Security](#security)

---

## Overview

Vaultus is a single-contract yield optimizer on Monad Mainnet. Users deposit USDC and receive vault shares. The vault tracks APYs from two protocols — Neverland (Aave v3 fork) and TownSquare (Monad-native lending) — and routes capital to whichever is offering the higher rate. Rebalancing happens inline on every deposit/withdraw and is also callable permissionlessly by anyone.

No off-chain infrastructure. One contract on one chain.

**Contracts:**

| File                                           | Description                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| `contracts/src/VaultusVault.sol`               | Main vault — shares accounting, dual-pool routing, inline rebalance |
| `contracts/src/interfaces/INeverlandPool.sol`  | Aave v3-compatible interface for Neverland                          |
| `contracts/src/interfaces/ITownSquarePool.sol` | Interface for TownSquare USDC pool                                  |
| `contracts/script/DeployVaultus.s.sol`         | Foundry deploy script for Monad Mainnet                             |

---

## Architecture

```
User
  │
  │  deposit(uint256 amount)
  │  withdraw(uint256 shares)
  │  rebalance()
  ▼
VaultusVault.sol  (Monad Mainnet)
  │
  ├── allocationNeverland  ──►  Neverland Pool Proxy  (Aave v3)
  │                             supply() / withdraw()
  │
  └── allocationTownSquare ──►  TownSquare USDC Pool  (Monad-native)
                                deposit() / withdraw()
```

VaultusVault holds all share accounting and routing logic. It reads live APYs directly from both protocol contracts and moves funds accordingly.

---

## Smart Contracts

### VaultusVault.sol

**Path:** `contracts/src/VaultusVault.sol`  
**Inherits:** `Ownable`, `ReentrancyGuard`, `SafeERC20` (all OpenZeppelin)

#### Constructor

```solidity
constructor(
    address _asset,               // USDC token address
    address _poolNeverland,       // Neverland Pool Proxy
    address _poolTownSquare,      // TownSquare USDC Pool
    uint256 _rebalanceThreshold,  // Min APY diff in bps to trigger rebalance (e.g. 100 = 1%)
    uint256 _minRebalanceInterval // Cooldown in seconds between rebalances (e.g. 3600 = 1hr)
) Ownable(msg.sender)
```

Approves both pools to spend `type(uint256).max` of `_asset` on construction.

#### State Variables

| Variable               | Type                         | Description                                        |
| ---------------------- | ---------------------------- | -------------------------------------------------- |
| `asset`                | `IERC20`                     | Underlying token (USDC)                            |
| `poolNeverland`        | `INeverlandPool`             | Aave v3-compatible pool                            |
| `poolTownSquare`       | `ITownSquarePool`            | TownSquare USDC pool                               |
| `totalShares`          | `uint256`                    | Total vault shares outstanding                     |
| `userShares`           | `mapping(address → uint256)` | Per-user share balance                             |
| `allocationNeverland`  | `uint256`                    | USDC deployed to Neverland                         |
| `allocationTownSquare` | `uint256`                    | USDC deployed to TownSquare                        |
| `rebalanceThreshold`   | `uint256`                    | Min APY diff in bps to trigger (default: 100 = 1%) |
| `minRebalanceInterval` | `uint256`                    | Cooldown between rebalances (default: 1 hour)      |
| `lastRebalance`        | `uint256`                    | Timestamp of last rebalance                        |
| `paused`               | `bool`                       | Emergency pause flag                               |

#### External / Public Functions

**`deposit(uint256 amount)`**

- Caller must have approved this contract to spend `amount` of USDC
- Shares minted: if `totalShares == 0` → `amount * SHARE_PRECISION`; otherwise `(amount * totalShares) / getTotalAssets()`
- Transfers USDC from caller, increments `userShares[msg.sender]` and `totalShares`
- Calls `_deployToHigherApyPool(amount)`, then `_checkAndRebalanceIfNeeded()`
- Emits `Deposit(user, amount, shares)`
- Reverts: `VaultusVault__ZeroAmount`, `VaultusVault__Paused`

**`withdraw(uint256 shares)`**

- USDC out: `(shares * getTotalAssets()) / totalShares`
- Decrements `userShares[msg.sender]` and `totalShares`
- Calls `_withdrawFromPools(amount)`, then transfers USDC to caller
- Emits `Withdraw(user, amount, shares)`
- Reverts: `VaultusVault__ZeroAmount`, `VaultusVault__InsufficientBalance`, `VaultusVault__Paused`

**`rebalance()`**

- Permissionless — callable by anyone
- Requires `block.timestamp >= lastRebalance + minRebalanceInterval`
- Fetches live APYs from both protocols via `_fetchCurrentAPYs()`
- Requires `|apyNeverland - apyTownSquare| >= rebalanceThreshold`
- Moves all funds to the higher-APY protocol via `_executeRebalance()`
- Emits `Rebalanced(apyNeverland, apyTownSquare, block.timestamp)`
- Reverts: `VaultusVault__RebalanceTooSoon`, `VaultusVault__ThresholdNotMet`, `VaultusVault__NoFundsToRebalance`

**`emergencyWithdrawAll()`** — `onlyOwner`

- Withdraws all funds from both Neverland and TownSquare to this contract
- Sets `allocationNeverland = 0`, `allocationTownSquare = 0`, `paused = true`
- Emits `EmergencyWithdraw(amountNeverland, amountTownSquare)`

**`pause()` / `unpause()`** — `onlyOwner`

**`setRebalanceThreshold(uint256)`** — `onlyOwner`

**`setMinRebalanceInterval(uint256)`** — `onlyOwner`

#### Internal Functions

**`_deployToHigherApyPool(uint256 amount)`** — Reads APYs from both protocols; calls `poolNeverland.supply(asset, amount, address(this), 0)` or `poolTownSquare.deposit(amount)` based on which is higher; increments corresponding `allocation*` variable.

**`_checkAndRebalanceIfNeeded()`** — Returns early if cooldown not elapsed. Fetches APYs, computes diff, calls `_executeRebalance` if diff >= threshold.

**`_executeRebalance(uint256 apyNeverland, uint256 apyTownSquare)`** — Withdraws all from the lower-APY protocol, deposits all into the higher-APY protocol, updates allocation variables, sets `lastRebalance = block.timestamp`.

**`_withdrawFromPools(uint256 amount)`** — Uses contract's USDC balance first. Then withdraws from Neverland, then TownSquare, until `amount` is sourced. Decrements allocation variables accordingly.

**`_fetchCurrentAPYs()`** — Returns `(neverlandAPY, townSquareAPY)` read live from protocol contracts.

#### View Functions

| Function                  | Returns              | Description                                                          |
| ------------------------- | -------------------- | -------------------------------------------------------------------- |
| `getTotalAssets()`        | `uint256`            | `asset.balanceOf(this) + allocationNeverland + allocationTownSquare` |
| `getUserBalance(address)` | `uint256`            | `(userShares[user] * getTotalAssets()) / totalShares`                |
| `getCurrentAPYs()`        | `(uint256, uint256)` | Live APYs from Neverland and TownSquare                              |
| `getAllocation()`         | `(uint256, uint256)` | `(allocationNeverland, allocationTownSquare)`                        |
| `getSharePrice()`         | `uint256`            | `getTotalAssets() / totalShares`                                     |
| `sharesToAssets(uint256)` | `uint256`            | `(shares * getTotalAssets()) / totalShares`                          |
| `assetsToShares(uint256)` | `uint256`            | `(assets * totalShares) / getTotalAssets()`                          |

#### Events

```solidity
event Deposit(address indexed user, uint256 amount, uint256 shares);
event Withdraw(address indexed user, uint256 amount, uint256 shares);
event Rebalanced(uint256 apyNeverland, uint256 apyTownSquare, uint256 timestamp);
event AllocationUpdated(address indexed pool, uint256 newAllocation);
event EmergencyWithdraw(uint256 amountNeverland, uint256 amountTownSquare);
```

#### Errors

```solidity
error VaultusVault__ZeroAddress();
error VaultusVault__ZeroAmount();
error VaultusVault__InsufficientBalance();
error VaultusVault__Paused();
error VaultusVault__RebalanceTooSoon();
error VaultusVault__NoFundsToRebalance();
error VaultusVault__ThresholdNotMet();
```

---

### INeverlandPool.sol

**Path:** `contracts/src/interfaces/INeverlandPool.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface INeverlandPool {
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);
}
```

`onBehalfOf` is set to `address(this)` (the vault). `referralCode` is `0`. After `supply`, the vault holds aTokens representing the position.

---

### ITownSquarePool.sol

**Path:** `contracts/src/interfaces/ITownSquarePool.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITownSquarePool {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function getAPY() external view returns (uint256); // basis points
}
```

---

### DeployVaultus.s.sol

**Path:** `contracts/script/DeployVaultus.s.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { Script } from "forge-std/Script.sol";
import { VaultusVault } from "../src/VaultusVault.sol";

contract DeployVaultus is Script {
    address constant NEVERLAND_POOL       = 0x8f00661b13cc5f6ccd3885be7b4c9c67545d585;
    address constant TOWNSQUARE_USDC_POOL = 0xdb4e67f878289a820046f46f6304fd6ee1449281;
    address constant USDC                 = /* Monad Mainnet USDC address */;

    function run() external {
        vm.startBroadcast();
        new VaultusVault(
            USDC,
            NEVERLAND_POOL,
            TOWNSQUARE_USDC_POOL,
            100,   // 1% rebalance threshold (100 bps)
            3600   // 1 hour min rebalance interval
        );
        vm.stopBroadcast();
    }
}
```

---

## Protocol Integrations

### Neverland

Aave v3 fork on Monad Mainnet.

**Interface:** `supply(asset, amount, onBehalfOf, referralCode)` / `withdraw(asset, amount, to)`  
**Supported assets:** USDC, WMON, WETH, WBTC, USDT0, earnAUSD, gMON  
**Vault asset:** USDC  
**Referral code:** `0`

**Contracts:**

| Contract              | Address                                      |
| --------------------- | -------------------------------------------- |
| Pool (Proxy)          | `0x8f00661b13cc5f6ccd3885be7b4c9c67545d585`  |
| PoolAddressesProvider | `0x49d75170f55c964dfdd6726c74fdede75553a0f`  |
| PoolDataProvider      | `0xfd0b6b6f736376f7b99ee989c749007c7757fdba` |
| USDC AToken           | `0x38648958836ea88b368b4ac23b86ad4b0fe7508`  |
| WMON AToken           | `0xd0fd2cf7f6ceff4f96b1161f5e995d5843326154` |
| WETH AToken           | `0x31f63ae5a96566b93477191778606bebdc4ca6f`  |
| WBTC AToken           | `0x34c43684293963c546b0a6841008a4d3393b9ab`  |
| WrappedTokenGatewayV3 | `0x800409dbd717813bb76501c30e04596cc478f25`  |
| UiPoolDataProviderV3  | `0x0733e79171dd5a5e8af41e387c6299bcfe6a7e55` |

---

### TownSquare

Monad-native lending market.

**Interface:** `deposit(amount)` / `withdraw(amount)`  
**Supported assets:** MON, WMON, USDC, USDT, WETH, WBTC  
**Vault asset:** USDC  
**USDC APY:** ~10.1% at ~80.42% utilization  
**TVL:** ~$1,032,890

**Contracts:**

| Contract          | Address                                      |
| ----------------- | -------------------------------------------- |
| Hub               | `0x2dfdb4bf6c910b5bbbb0d07ec5f088e294628189` |
| USDC Pool         | `0xdb4e67f878289a820046f46f6304fd6ee1449281` |
| MON Pool          | `0x106d0e2bff74b39d09636bdcd5d4189f24d91433` |
| WMON Pool         | `0xf358f9e4ba7d210fde8c9a30522bb0063e15c4bb` |
| SpokeOperations   | `0x63cb1cf5accbcc57e0cca047be9673ea5022b8db` |
| SpokeController   | `0x8f8a0ed366439576b7db220678ed1259743239e3` |
| PriceFeedManager  | `0x428cfa65310c70bc9e65bddb26c65fe4ca490376` |
| LoanController    | `0xc4c20efbefa4bde14091a3040d112cf981d8b2db` |
| AccountController | `0xc2df24203ab3a4f3857d649757a99e18de059a16` |
| USDC SpokeToken   | `0xa457235b68606a7921b7c525d92e9592e793b4c0` |
| WMON SpokeToken   | `0xa2b1ac2bb0a6ad5e74d74f8809a2f935813d273a` |

---

## Automation Logic

Rebalancing runs on three layers — all on-chain, no external infrastructure:

**Layer 1 — Inline (every deposit/withdraw)**  
Every `deposit()` and `withdraw()` ends with `_checkAndRebalanceIfNeeded()`. If the cooldown has elapsed and the APY differential exceeds `rebalanceThreshold`, a rebalance executes atomically in the same transaction.

```solidity
function _checkAndRebalanceIfNeeded() internal {
    if (block.timestamp < lastRebalance + minRebalanceInterval) return;
    (uint256 apyNeverland, uint256 apyTownSquare) = _fetchCurrentAPYs();
    uint256 diff = apyNeverland > apyTownSquare
        ? apyNeverland - apyTownSquare
        : apyTownSquare - apyNeverland;
    if (diff >= rebalanceThreshold) {
        _executeRebalance(apyNeverland, apyTownSquare);
    }
}
```

**Layer 2 — Permissionless `rebalance()`**  
Anyone can call `rebalance()` directly. Conditions are validated internally.

```solidity
function rebalance() external nonReentrant {
    require(block.timestamp >= lastRebalance + minRebalanceInterval, "Too soon");
    (uint256 apyA, uint256 apyB) = _fetchCurrentAPYs();
    uint256 diff = apyA > apyB ? apyA - apyB : apyB - apyA;
    require(diff >= rebalanceThreshold, "No rebalance needed");
    _executeRebalance(apyA, apyB);
    emit Rebalanced(apyA, apyB, block.timestamp);
}
```

**Layer 3 — Frontend button**  
The UI has a "Rebalance" button that calls `rebalance()` on the contract.

---

## Monad Network

| Property           | Value                                              |
| ------------------ | -------------------------------------------------- |
| Chain ID           | `143`                                              |
| RPC                | `https://rpc.monad.xyz`                            |
| Alt RPCs           | `https://rpc1.monad.xyz`, `https://rpc2.monad.xyz` |
| Block Explorer     | `https://explorer.monad.xyz`                       |
| Block Time         | 400ms                                              |
| TPS                | ~1,440                                             |
| Native Token       | `MON`                                              |
| Wrapped MON (WMON) | `0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A`       |
| Permit2            | `0x000000000022D473030F116dDEE9F6B43aC78BA3`       |
| Multicall3         | `0xcA11bde05977b3631167028862Be2a173976CA11`       |
| USDC (Circle)      | verify from Circle's official Monad deployment     |

---

## Frontend

**Stack:** Next.js 15, wagmi v2, viem, TailwindCSS  
**Location:** `frontend/`

### File Structure

```
frontend/
  app/
    providers.tsx   — Wagmi config with Monad Mainnet chain definition
    contracts.ts    — VaultusVault ABI and contract addresses
    page.tsx        — Main UI (deposit, withdraw, rebalance, stats)
    layout.tsx      — Root layout
    globals.css     — Global styles
```

### Chain Config (`providers.tsx`)

```ts
const monad = {
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://explorer.monad.xyz" },
  },
};

const config = createConfig({
  chains: [monad],
  connectors: [injected()],
  transports: { [monad.id]: http() },
});
```

### `contracts.ts`

Exports:

- `ADDRESSES` — object with `AUTOMATION_VAULT` (VaultusVault address) and `USDC`
- `AUTOMATION_VAULT_ABI` — full ABI for VaultusVault
- `ERC20_ABI` — minimal ABI for USDC (`balanceOf`, `allowance`, `approve`, `transfer`)

### `page.tsx`

**Wallet connection** via injected connector (MetaMask, Rabby, etc.)

**Stats grid** reads from VaultusVault:

- Total Assets (`getTotalAssets()`)
- Your Balance (`getUserBalance(address)`)
- Your Shares (`userShares(address)`)
- Neverland APY and TownSquare APY (`getCurrentAPYs()`)
- Allocation split (`getAllocation()`)

**Deposit:** User enters USDC amount → approves if needed (`approve(AUTOMATION_VAULT, amount)`) → calls `deposit(amount)`

**Withdraw:** User enters share amount → calls `withdraw(shares)`

**Rebalance button:** Calls `rebalance()` on VaultusVault

**Allocation bar:** Visual percentage split between Neverland and TownSquare, labeled with live APYs

**Chain badge:** Displays "Monad"

All contract reads poll every 5000ms via wagmi's `refetchInterval`.

### Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Setup

**Requirements:** [Foundry](https://book.getfoundry.sh/), Node.js ≥ 18

```bash
# Contracts
cd contracts && forge install

# Frontend
cd frontend && npm install
```

### `foundry.toml`

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.33"

[rpc_endpoints]
monad = "https://rpc.monad.xyz"
```

### `remappings.txt`

```
@openzeppelin/=lib/openzeppelin-contracts/
forge-std/=lib/forge-std/src/
```

---

## Deployment

```bash
cd contracts
forge script script/DeployVaultus.s.sol \
  --rpc-url monad \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

After deployment, update `ADDRESSES.AUTOMATION_VAULT` in `frontend/app/contracts.ts` and copy the ABI from `contracts/out/VaultusVault.sol/VaultusVault.json`.

---

## Testing

**Test file:** `contracts/test/VaultusVault.t.sol`  
**Mocks:** Both `INeverlandPool` and `ITownSquarePool` are mocked — no live RPC required. Mocks expose configurable APY values.

| Test                                  | Description                                                 |
| ------------------------------------- | ----------------------------------------------------------- |
| `testDeposit_FirstDeposit`            | First depositor receives `amount * 1e18` shares             |
| `testDeposit_RoutesToHigherAPY`       | Funds routed to higher-APY protocol on deposit              |
| `testWithdraw_PartialWithdraw`        | Pro-rata USDC returned for partial share redemption         |
| `testWithdraw_FullWithdraw`           | Full exit returns all USDC                                  |
| `testLazyRebalance_TriggersOnDeposit` | Inline rebalance fires when threshold exceeded              |
| `testPublicRebalance_Cooldown`        | `rebalance()` reverts before `minRebalanceInterval` elapses |
| `testPublicRebalance_ThresholdNotMet` | `rebalance()` reverts when APY diff is below threshold      |
| `testPublicRebalance_MovesAllFunds`   | All funds move to higher-APY protocol                       |
| `testEmergencyWithdrawAll`            | Owner pulls all funds from both protocols, vault pauses     |
| `testShareAccounting_MultipleUsers`   | Share dilution and pro-rata math across multiple users      |
| `testPause_BlocksDeposit`             | `deposit()` reverts when paused                             |
| `testPause_BlocksWithdraw`            | `withdraw()` reverts when paused                            |

```bash
cd contracts
forge test -vvv
```

---

## Contract Addresses

| Contract                     | Address                                      |
| ---------------------------- | -------------------------------------------- |
| VaultusVault (Monad Mainnet) | —                                            |
| Neverland Pool Proxy         | `0x8f00661b13cc5f6ccd3885be7b4c9c67545d585`  |
| TownSquare USDC Pool         | `0xdb4e67f878289a820046f46f6304fd6ee1449281` |
| USDC (Monad Mainnet)         | —                                            |

---

## Backup Protocols

Alternative lending protocols on Monad that can be substituted for Neverland or TownSquare:

| Protocol        | Type                   | Contract                                        | Interface                  |
| --------------- | ---------------------- | ----------------------------------------------- | -------------------------- |
| Curvance        | Compound-style cTokens | `0x21adbb60a5fb909e7f1fb48aacc78d6bb399baf88b5` | `mint()` / `redeem()`      |
| Euler Finance   | Modular lending (EVC)  | `0x7a9324e8f270413fa2e458f5831226d99c7477cd`    | EVC interface              |
| Morpho          | Lending optimizer      | `0xd5d960e8c380b724a48ac59e2dff1b2cb4aeaee`     | MetaMorpho vault interface |
| Mellow Protocol | Yield aggregator vault | `0x912644cdfada93469b8ab5b4351bdcff61691613`    | Vault deposit/withdraw     |

---

## Security

### Access Control

| Function                    | Access                        |
| --------------------------- | ----------------------------- |
| `deposit()`                 | Public                        |
| `withdraw()`                | Public (own shares only)      |
| `rebalance()`               | Public (validated internally) |
| `pause()` / `unpause()`     | Owner only                    |
| `emergencyWithdrawAll()`    | Owner only                    |
| `setRebalanceThreshold()`   | Owner only                    |
| `setMinRebalanceInterval()` | Owner only                    |

### Design Properties

- **Share-based accounting** — share price increases as yield accrues; prevents inflation attacks. First deposit: `shares = amount * 1e18`.
- **ReentrancyGuard** — applied to `deposit`, `withdraw`, `rebalance`, `emergencyWithdrawAll`.
- **SafeERC20** — all ERC20 operations use OpenZeppelin's safe wrappers.
- **No external APY oracle** — APYs are read directly from protocol contracts.
- **`minRebalanceInterval`** — prevents rebalance spam and limits sandwich attacks.
- **`rebalanceThreshold`** — rebalance only moves funds when the APY difference is meaningful; prevents churning for negligible gain.

---

## License

MIT
