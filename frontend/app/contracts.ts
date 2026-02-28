// Contract addresses and ABIs for Vaultus Vault on Monad Testnet (Chain ID 10143)

export const ADDRESSES = {
  // VaultusVault deployed on Monad Testnet
  AUTOMATION_VAULT: "0xe0C303877BC269e36ace4d5f3773ef715220319A",

  // MockUSDC on Monad Testnet
  USDC: "0x04809A1cA87dAd18c4F734c9f357A17B71c0374B",

  // Mock pool addresses on testnet
  NEVERLAND_POOL: "0x1b7B5d0224C1407281b4FdCBa299665c1143423F",
  TOWNSQUARE_USDC_POOL: "0x5756c9bB9C19BD9121E602E62c775FF93c356CC1",
} as const;

// VaultusVault Contract ABI
export const AUTOMATION_VAULT_ABI = [
  {
    type: "constructor",
    inputs: [
      { name: "_asset", type: "address" },
      { name: "_poolNeverland", type: "address" },
      { name: "_poolTownSquare", type: "address" },
      { name: "_rebalanceThreshold", type: "uint256" },
      { name: "_minRebalanceInterval", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "deposit",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "rebalance",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getTotalAssets",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserBalance",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "userShares",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCurrentAPYs",
    inputs: [],
    outputs: [
      { name: "neverlandAPY", type: "uint256" },
      { name: "townSquareAPY", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAllocation",
    inputs: [],
    outputs: [
      { name: "neverland", type: "uint256" },
      { name: "townSquare", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSharePrice",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "sharesToAssets",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "assetsToShares",
    inputs: [{ name: "assets", type: "uint256" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalShares",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "rebalanceThreshold",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "minRebalanceInterval",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "lastRebalance",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "paused",
    inputs: [],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "unpause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "emergencyWithdrawAll",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Deposit",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256" },
      { name: "shares", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Withdraw",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256" },
      { name: "shares", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Rebalanced",
    inputs: [
      { name: "apyNeverland", type: "uint256" },
      { name: "apyTownSquare", type: "uint256" },
      { name: "timestamp", type: "uint256" },
    ],
  },
] as const;

// ERC20 ABI (for USDC token)
export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferFrom",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Approval",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "spender", type: "address", indexed: true },
      { name: "value", type: "uint256" },
    ],
  },
] as const;
