"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Vault,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Wallet,
  Zap,
  Shield,
  BarChart3,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { ADDRESSES, AUTOMATION_VAULT_ABI, ERC20_ABI } from "./contracts";
import ConnectButton from "./components/ConnectButton";

// Header Component
function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#F7F5F2]/80 backdrop-blur-md border-b-3 border-[#111]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#6EE7B7] border-3 border-[#111] rounded-xl flex items-center justify-center shadow-[4px_4px_0_0_rgba(0,0,0,0.9)]">
              <Vault className="w-6 h-6 text-[#111]" />
            </div>
            <span className="text-2xl font-bold font-display tracking-tight">
              Vaultus
            </span>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-2">
            <button className="px-4 py-2 font-medium font-display rounded-lg border-2 bg-[#6EE7B7] border-[#111] transition-all">
              Dashboard
            </button>
          </nav>

          {/* Connect */}
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}

// Stats Card
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "accent",
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  color?: "accent" | "blue" | "purple" | "pink";
}) {
  const bgColors = {
    accent: "bg-[#6EE7B7]",
    blue: "bg-[#60A5FA]",
    purple: "bg-[#A855F7]",
    pink: "bg-[#EC4899]",
  };

  return (
    <motion.div
      className="nb-card p-6"
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 ${bgColors[color]} border-3 border-[#111] rounded-xl flex items-center justify-center`}
        >
          <Icon className="w-6 h-6 text-[#111]" />
        </div>
        <span className="text-xs font-mono bg-[#111] text-white px-2 py-1 rounded-md">
          LIVE
        </span>
      </div>
      <p className="text-sm text-gray-600 font-medium mb-1">{title}</p>
      <p className="text-3xl font-bold font-display tracking-tight">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </motion.div>
  );
}

// APY Display
function APYDisplay({
  neverlandAPY,
  townSquareAPY,
  curvanceAPY,
}: {
  neverlandAPY: number;
  townSquareAPY: number;
  curvanceAPY: number;
}) {
  const bestAPY = Math.max(neverlandAPY, townSquareAPY, curvanceAPY);
  return (
    <div className="nb-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#A855F7] border-3 border-[#111] rounded-xl flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold font-display text-lg">Current APYs</h3>
          <p className="text-sm text-gray-500">Real-time yield rates</p>
        </div>
      </div>

      <div className="space-y-3">
        <div
          className={`flex items-center justify-between p-4 bg-gradient-to-r from-[#6EE7B7]/20 to-transparent rounded-xl border-2 ${neverlandAPY === bestAPY ? "border-[#10B981] ring-2 ring-[#10B981]/30" : "border-[#111]"}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#6EE7B7] border-2 border-[#111] rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold">N</span>
            </div>
            <span className="font-semibold">Neverland</span>
            {neverlandAPY === bestAPY && (
              <span className="text-xs bg-[#10B981] text-white px-2 py-0.5 rounded-full font-bold">
                BEST
              </span>
            )}
          </div>
          <span className="text-2xl font-bold font-display text-[#10B981]">
            {neverlandAPY.toFixed(2)}%
          </span>
        </div>

        <div
          className={`flex items-center justify-between p-4 bg-gradient-to-r from-[#60A5FA]/20 to-transparent rounded-xl border-2 ${townSquareAPY === bestAPY ? "border-[#3B82F6] ring-2 ring-[#3B82F6]/30" : "border-[#111]"}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#60A5FA] border-2 border-[#111] rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-white">T</span>
            </div>
            <span className="font-semibold">TownSquare</span>
            {townSquareAPY === bestAPY && (
              <span className="text-xs bg-[#3B82F6] text-white px-2 py-0.5 rounded-full font-bold">
                BEST
              </span>
            )}
          </div>
          <span className="text-2xl font-bold font-display text-[#3B82F6]">
            {townSquareAPY.toFixed(2)}%
          </span>
        </div>

        <div
          className={`flex items-center justify-between p-4 bg-gradient-to-r from-[#F59E0B]/20 to-transparent rounded-xl border-2 ${curvanceAPY === bestAPY ? "border-[#F59E0B] ring-2 ring-[#F59E0B]/30" : "border-[#111]"}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#F59E0B] border-2 border-[#111] rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-white">C</span>
            </div>
            <span className="font-semibold">Curvance</span>
            {curvanceAPY === bestAPY && (
              <span className="text-xs bg-[#F59E0B] text-white px-2 py-0.5 rounded-full font-bold">
                BEST
              </span>
            )}
          </div>
          <span className="text-2xl font-bold font-display text-[#D97706]">
            {curvanceAPY.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// Allocation Display
function AllocationDisplay({
  neverlandAlloc,
  townSquareAlloc,
  curvanceAlloc,
  neverlandUSDC,
  townSquareUSDC,
  curvanceUSDC,
}: {
  neverlandAlloc: number;
  townSquareAlloc: number;
  curvanceAlloc: number;
  neverlandUSDC: string;
  townSquareUSDC: string;
  curvanceUSDC: string;
}) {
  return (
    <div className="nb-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#EC4899] border-3 border-[#111] rounded-xl flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold font-display text-lg">Fund Allocation</h3>
          <p className="text-sm text-gray-500">Current distribution</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <span className="font-medium">Neverland</span>
            <span className="font-bold font-mono">
              {neverlandAlloc.toFixed(1)}% (${neverlandUSDC})
            </span>
          </div>
          <div className="h-4 bg-gray-100 border-2 border-[#111] rounded-lg overflow-hidden">
            <motion.div
              className="h-full bg-[#6EE7B7]"
              key={`nev-${neverlandAlloc}`}
              initial={{ width: 0 }}
              animate={{ width: `${neverlandAlloc}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <span className="font-medium">TownSquare</span>
            <span className="font-bold font-mono">
              {townSquareAlloc.toFixed(1)}% (${townSquareUSDC})
            </span>
          </div>
          <div className="h-4 bg-gray-100 border-2 border-[#111] rounded-lg overflow-hidden">
            <motion.div
              className="h-full bg-[#60A5FA]"
              key={`ts-${townSquareAlloc}`}
              initial={{ width: 0 }}
              animate={{ width: `${townSquareAlloc}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <span className="font-medium">Curvance</span>
            <span className="font-bold font-mono">
              {curvanceAlloc.toFixed(1)}% (${curvanceUSDC})
            </span>
          </div>
          <div className="h-4 bg-gray-100 border-2 border-[#111] rounded-lg overflow-hidden">
            <motion.div
              className="h-full bg-[#F59E0B]"
              key={`cv-${curvanceAlloc}`}
              initial={{ width: 0 }}
              animate={{ width: `${curvanceAlloc}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Deposit Card
function DepositCard({
  depositAmount,
  setDepositAmount,
  handleDeposit,
  isLoading,
  isConnected,
  needsApproval,
  walletBalance,
}: {
  depositAmount: string;
  setDepositAmount: (v: string) => void;
  handleDeposit: () => void;
  isLoading: boolean;
  isConnected: boolean;
  needsApproval: boolean;
  walletBalance: string;
}) {
  return (
    <div className="nb-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#6EE7B7] border-3 border-[#111] rounded-xl flex items-center justify-center">
          <ArrowDownToLine className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold font-display text-lg">Deposit USDC</h3>
          <p className="text-sm text-gray-500">Start earning yield</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <label className="block text-sm font-medium">Amount</label>
            <button
              onClick={() => setDepositAmount(walletBalance)}
              className="text-xs font-bold text-[#10B981] hover:underline"
            >
              Wallet: ${walletBalance} USDC
            </button>
          </div>
          <div className="relative">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0.00"
              className="nb-input w-full pr-16 text-lg"
              disabled={!isConnected}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">
              USDC
            </span>
          </div>
        </div>

        {needsApproval && depositAmount && (
          <div className="bg-[#6EE7B7]/20 border-2 border-[#6EE7B7] rounded-xl p-3">
            <p className="text-sm font-medium text-[#059669]">
              Will auto-approve USDC before depositing
            </p>
          </div>
        )}

        <button
          onClick={handleDeposit}
          disabled={!depositAmount || isLoading || !isConnected}
          className="nb-btn w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Deposit
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Withdraw Card — user enters USDC amount, we convert to shares
function WithdrawCard({
  withdrawAmount,
  setWithdrawAmount,
  handleWithdraw,
  isWithdrawLoading,
  userBalance,
  isConnected,
}: {
  withdrawAmount: string;
  setWithdrawAmount: (v: string) => void;
  handleWithdraw: () => void;
  isWithdrawLoading: boolean;
  userBalance: string;
  isConnected: boolean;
}) {
  return (
    <div className="nb-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#60A5FA] border-3 border-[#111] rounded-xl flex items-center justify-center">
          <ArrowUpFromLine className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold font-display text-lg">Withdraw</h3>
          <p className="text-sm text-gray-500">Withdraw your USDC</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-medium">Amount (USDC)</label>
            <button
              onClick={() => setWithdrawAmount(userBalance)}
              className="text-xs font-bold text-[#3B82F6] hover:underline"
            >
              MAX: ${userBalance} USDC
            </button>
          </div>
          <div className="relative">
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="0.00"
              className="nb-input w-full pr-20 text-lg"
              disabled={!isConnected}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">
              USDC
            </span>
          </div>
        </div>

        <button
          onClick={handleWithdraw}
          disabled={!withdrawAmount || isWithdrawLoading || !isConnected}
          className="nb-btn nb-btn-secondary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isWithdrawLoading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <ArrowUpFromLine className="w-5 h-5" />
              Withdraw
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Rebalance Card
function RebalanceCard({
  handleRebalance,
  isRebalanceLoading,
  isConnected,
}: {
  handleRebalance: () => void;
  isRebalanceLoading: boolean;
  isConnected: boolean;
}) {
  return (
    <div className="nb-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#A855F7] border-3 border-[#111] rounded-xl flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold font-display text-lg">Rebalance</h3>
          <p className="text-sm text-gray-500">Optimize allocation</p>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Automatically shift funds to the highest-yielding pool based on current
        APYs. Pool rates oscillate in real-time.
      </p>

      <button
        onClick={handleRebalance}
        disabled={isRebalanceLoading || !isConnected}
        className="nb-btn nb-btn-purple w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRebalanceLoading ? (
          <RefreshCw className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Rebalance Now
          </>
        )}
      </button>
    </div>
  );
}

// Hero Section for non-connected state
function HeroSection() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-28">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo */}
          <div className="inline-flex items-center gap-4 mb-8">
            <div className="w-20 h-20 bg-[#6EE7B7] border-4 border-[#111] rounded-2xl flex items-center justify-center shadow-[8px_8px_0_0_rgba(0,0,0,0.9)] float">
              <Vault className="w-10 h-10 text-[#111]" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tight mb-6">
            <span className="bg-gradient-to-r from-[#6EE7B7] via-[#60A5FA] to-[#A855F7] bg-clip-text text-transparent">
              Vaultus
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Automated yield optimization vault. Deposit USDC, let our smart
            contracts find the best yields.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {[
              { label: "Auto-Rebalancing", icon: RefreshCw },
              { label: "Multi-Pool Strategy", icon: BarChart3 },
              { label: "Non-Custodial", icon: Shield },
            ].map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border-3 border-[#111] rounded-full shadow-[4px_4px_0_0_rgba(0,0,0,0.9)]"
              >
                <Icon className="w-4 h-4" />
                <span className="font-semibold">{label}</span>
              </div>
            ))}
          </div>

          {/* Connect Button */}
          <div className="inline-block">
            <ConnectButton />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Footer
function Footer() {
  return (
    <footer className="border-t-3 border-[#111] bg-white mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#6EE7B7] border-2 border-[#111] rounded-lg flex items-center justify-center">
              <Vault className="w-5 h-5" />
            </div>
            <span className="font-bold font-display">Vaultus Protocol</span>
          </div>

          <div className="flex items-center gap-6">
            {["Docs", "GitHub", "Twitter"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-sm font-medium text-gray-600 hover:text-[#111] flex items-center gap-1"
              >
                {link}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>

          <p className="text-sm text-gray-500">
            © 2026 Vaultus. Built on Monad.
          </p>
        </div>
      </div>
    </footer>
  );
}

// Main Page Component
export default function Home() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [depositStep, setDepositStep] = useState<
    "idle" | "approving" | "depositing"
  >("idle");

  // Invalidate all contract reads to force UI refresh
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  // Monad Testnet Chain ID
  const CHAIN_ID = 10143;

  // Read vault data — always target Monad Testnet
  const { data: totalAssets } = useReadContract({
    address: ADDRESSES.AUTOMATION_VAULT as `0x${string}`,
    abi: AUTOMATION_VAULT_ABI,
    functionName: "getTotalAssets",
    chainId: CHAIN_ID,
    query: { refetchInterval: 5000 },
  }) as { data: bigint | undefined };

  const { data: userBalance } = useReadContract({
    address: ADDRESSES.AUTOMATION_VAULT as `0x${string}`,
    abi: AUTOMATION_VAULT_ABI,
    functionName: "getUserBalance",
    args: [address as `0x${string}`],
    chainId: CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 5000 },
  }) as { data: bigint | undefined };

  const { data: apys } = useReadContract({
    address: ADDRESSES.AUTOMATION_VAULT as `0x${string}`,
    abi: AUTOMATION_VAULT_ABI,
    functionName: "getCurrentAPYs",
    chainId: CHAIN_ID,
    query: { refetchInterval: 5000 },
  }) as { data: [bigint, bigint, bigint] | undefined };

  const { data: allocation } = useReadContract({
    address: ADDRESSES.AUTOMATION_VAULT as `0x${string}`,
    abi: AUTOMATION_VAULT_ABI,
    functionName: "getAllocation",
    chainId: CHAIN_ID,
    query: { refetchInterval: 5000 },
  }) as { data: [bigint, bigint, bigint] | undefined };

  const { data: userAllowance } = useReadContract({
    address: ADDRESSES.USDC as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [
      address as `0x${string}`,
      ADDRESSES.AUTOMATION_VAULT as `0x${string}`,
    ],
    chainId: CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 5000 },
  }) as { data: bigint | undefined };

  // Read user's USDC wallet balance
  const { data: usdcWalletBalance } = useReadContract({
    address: ADDRESSES.USDC as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    chainId: CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 5000 },
  }) as { data: bigint | undefined };

  // Read shares-to-assets conversion for withdraw
  const withdrawUsdcRaw = withdrawAmount
    ? parseUnits(withdrawAmount, 6)
    : BigInt(0);
  const { data: withdrawSharesNeeded } = useReadContract({
    address: ADDRESSES.AUTOMATION_VAULT as `0x${string}`,
    abi: AUTOMATION_VAULT_ABI,
    functionName: "assetsToShares",
    args: [withdrawUsdcRaw],
    chainId: CHAIN_ID,
    query: {
      enabled: !!withdrawAmount && withdrawUsdcRaw > BigInt(0),
      refetchInterval: 5000,
    },
  }) as { data: bigint | undefined };

  // Write contracts — extract isPending (wallet signing) + reset (clear old hash)
  const {
    writeContract: approve,
    data: approveTxHash,
    isPending: isApprovePending,
    reset: resetApprove,
  } = useWriteContract();
  const {
    writeContract: deposit,
    data: depositTxHash,
    isPending: isDepositPending,
    reset: resetDeposit,
  } = useWriteContract();
  const {
    writeContract: withdraw,
    data: withdrawTxHash,
    isPending: isWithdrawPending,
    reset: resetWithdraw,
  } = useWriteContract();
  const {
    writeContract: rebalance,
    data: rebalanceTxHash,
    isPending: isRebalancePending,
    reset: resetRebalance,
  } = useWriteContract();

  // Wait for transaction receipts (isConfirming = waiting on-chain)
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveTxHash, chainId: CHAIN_ID });

  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } =
    useWaitForTransactionReceipt({ hash: depositTxHash, chainId: CHAIN_ID });

  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } =
    useWaitForTransactionReceipt({ hash: withdrawTxHash, chainId: CHAIN_ID });

  const { isLoading: isRebalanceConfirming, isSuccess: isRebalanceSuccess } =
    useWaitForTransactionReceipt({ hash: rebalanceTxHash, chainId: CHAIN_ID });

  // Combined loading states: wallet signing OR on-chain confirmation
  const isDepositFlowLoading =
    isApprovePending ||
    isApproveConfirming ||
    isDepositPending ||
    isDepositConfirming;
  const isWithdrawLoading = isWithdrawPending || isWithdrawConfirming;
  const isRebalanceLoading = isRebalancePending || isRebalanceConfirming;

  // After approve succeeds, auto-trigger deposit
  useEffect(() => {
    if (isApproveSuccess && depositStep === "approving") {
      toast.success("USDC approved! Now depositing...");
      resetApprove();
      invalidateAll();
      setDepositStep("depositing");
      if (depositAmount && address) {
        const amount = parseUnits(depositAmount, 6);
        deposit({
          chainId: CHAIN_ID,
          address: ADDRESSES.AUTOMATION_VAULT as `0x${string}`,
          abi: AUTOMATION_VAULT_ABI,
          functionName: "deposit",
          args: [amount],
        });
      }
    }
  }, [isApproveSuccess, depositStep]);

  useEffect(() => {
    if (isDepositSuccess) {
      toast.success("Deposit successful!");
      setDepositAmount("");
      setDepositStep("idle");
      resetDeposit();
      invalidateAll();
    }
  }, [isDepositSuccess, resetDeposit, invalidateAll]);

  useEffect(() => {
    if (isWithdrawSuccess) {
      toast.success("Withdrawal successful!");
      setWithdrawAmount("");
      resetWithdraw();
      invalidateAll();
    }
  }, [isWithdrawSuccess, resetWithdraw, invalidateAll]);

  useEffect(() => {
    if (isRebalanceSuccess) {
      toast.success("Vault rebalanced successfully!");
      resetRebalance();
      invalidateAll();
    }
  }, [isRebalanceSuccess, resetRebalance, invalidateAll]);

  // Check if approval is needed
  const needsApproval = (() => {
    if (!depositAmount || !userAllowance) return true;
    try {
      const needed = parseUnits(depositAmount, 6);
      return userAllowance < needed;
    } catch {
      return true;
    }
  })();

  // Single deposit handler — auto-approves if needed, then deposits
  const handleDeposit = () => {
    if (!depositAmount || !address) return;
    const amount = parseUnits(depositAmount, 6);

    if (needsApproval) {
      // Step 1: Approve first, deposit will auto-trigger on success
      setDepositStep("approving");
      approve({
        chainId: CHAIN_ID,
        address: ADDRESSES.USDC as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [ADDRESSES.AUTOMATION_VAULT as `0x${string}`, amount],
      });
    } else {
      // Already approved, deposit directly
      setDepositStep("depositing");
      deposit({
        chainId: CHAIN_ID,
        address: ADDRESSES.AUTOMATION_VAULT as `0x${string}`,
        abi: AUTOMATION_VAULT_ABI,
        functionName: "deposit",
        args: [amount],
      });
    }
  };

  const handleWithdraw = () => {
    if (!withdrawAmount || !address || !withdrawSharesNeeded) return;
    withdraw({
      chainId: CHAIN_ID,
      address: ADDRESSES.AUTOMATION_VAULT as `0x${string}`,
      abi: AUTOMATION_VAULT_ABI,
      functionName: "withdraw",
      args: [withdrawSharesNeeded],
    });
  };

  const handleRebalance = () => {
    if (!address) return;
    rebalance({
      chainId: CHAIN_ID,
      address: ADDRESSES.AUTOMATION_VAULT as `0x${string}`,
      abi: AUTOMATION_VAULT_ABI,
      functionName: "rebalance",
    });
  };

  // Format display values
  const formatUSDC = (value: bigint | undefined) => {
    if (!value) return "0.00";
    return parseFloat(formatUnits(value, 6)).toFixed(2);
  };

  // APYs come as basis points (e.g., 500 = 5%)
  const neverlandAPY = apys ? Number(apys[0]) / 100 : 0;
  const townSquareAPY = apys ? Number(apys[1]) / 100 : 0;
  const curvanceAPY = apys ? Number(apys[2]) / 100 : 0;
  const bestAPY = Math.max(neverlandAPY, townSquareAPY, curvanceAPY);
  // Allocation values are raw USDC amounts (6 decimals)
  const totalAlloc = allocation
    ? Number(allocation[0]) + Number(allocation[1]) + Number(allocation[2])
    : 0;
  const neverlandAlloc =
    totalAlloc > 0 && allocation
      ? (Number(allocation[0]) / totalAlloc) * 100
      : 0;
  const townSquareAlloc =
    totalAlloc > 0 && allocation
      ? (Number(allocation[1]) / totalAlloc) * 100
      : 0;
  const curvanceAlloc =
    totalAlloc > 0 && allocation
      ? (Number(allocation[2]) / totalAlloc) * 100
      : 0;

  // User's balance in USDC for display
  const userBalanceFormatted = formatUSDC(userBalance);
  const walletUsdcFormatted = formatUSDC(usdcWalletBalance);

  // Allocation display: also show raw USDC values
  const neverlandAllocUSDC = allocation ? formatUSDC(allocation[0]) : "0.00";
  const townSquareAllocUSDC = allocation ? formatUSDC(allocation[1]) : "0.00";
  const curvanceAllocUSDC = allocation ? formatUSDC(allocation[2]) : "0.00";

  // Not connected - show hero
  if (!isConnected) {
    return (
      <main className="min-h-screen" style={{ background: "#F7F5F2" }}>
        <Header />
        <HeroSection />
        <Footer />
      </main>
    );
  }

  // Connected - show dashboard
  return (
    <main className="min-h-screen" style={{ background: "#F7F5F2" }}>
      <Header />

      <div className="pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Banner */}
          <motion.div
            className="nb-card p-6 mb-8 bg-gradient-to-r from-[#6EE7B7]/20 via-[#60A5FA]/20 to-[#A855F7]/20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold font-display mb-1">
                  Welcome back!
                </h2>
                <p className="text-gray-600 font-mono text-sm">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#10B981]/20 border-2 border-[#10B981] rounded-xl">
                <div className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse" />
                <span className="font-semibold text-[#059669]">Connected</span>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Total Value Locked"
              value={`$${formatUSDC(totalAssets)}`}
              subtitle="Across all pools"
              icon={Vault}
              color="accent"
            />
            <StatCard
              title="Your Balance"
              value={`$${formatUSDC(userBalance)}`}
              subtitle="Current value"
              icon={Wallet}
              color="blue"
            />
            <StatCard
              title="Best APY"
              value={`${bestAPY.toFixed(2)}%`}
              subtitle="Highest yield available"
              icon={TrendingUp}
              color="purple"
            />
            <StatCard
              title="Active Pools"
              value="3"
              subtitle="Neverland · TownSquare · Curvance"
              icon={BarChart3}
              color="pink"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - APY & Allocation */}
            <div className="space-y-6">
              <APYDisplay
                neverlandAPY={neverlandAPY}
                townSquareAPY={townSquareAPY}
                curvanceAPY={curvanceAPY}
              />
              <AllocationDisplay
                neverlandAlloc={neverlandAlloc}
                townSquareAlloc={townSquareAlloc}
                curvanceAlloc={curvanceAlloc}
                neverlandUSDC={neverlandAllocUSDC}
                townSquareUSDC={townSquareAllocUSDC}
                curvanceUSDC={curvanceAllocUSDC}
              />
            </div>

            {/* Middle & Right - Actions */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <DepositCard
                depositAmount={depositAmount}
                setDepositAmount={setDepositAmount}
                handleDeposit={handleDeposit}
                isLoading={isDepositFlowLoading}
                isConnected={isConnected}
                needsApproval={needsApproval}
                walletBalance={walletUsdcFormatted}
              />
              <WithdrawCard
                withdrawAmount={withdrawAmount}
                setWithdrawAmount={setWithdrawAmount}
                handleWithdraw={handleWithdraw}
                isWithdrawLoading={isWithdrawLoading}
                userBalance={userBalanceFormatted}
                isConnected={isConnected}
              />
              <div className="md:col-span-2">
                <RebalanceCard
                  handleRebalance={handleRebalance}
                  isRebalanceLoading={isRebalanceLoading}
                  isConnected={isConnected}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
