"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronRight,
  ExternalLink,
  Sparkles
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
            <span className="text-2xl font-bold font-display tracking-tight">Vaultus</span>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-2">
            {['Dashboard', 'Strategies', 'Analytics', 'Docs'].map((item, i) => (
              <button 
                key={item}
                className={`px-4 py-2 font-medium font-display rounded-lg border-2 border-transparent hover:border-[#111] hover:bg-white transition-all ${i === 0 ? 'bg-[#6EE7B7] border-[#111]' : ''}`}
              >
                {item}
              </button>
            ))}
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
  color = 'accent' 
}: { 
  title: string; 
  value: string; 
  subtitle?: string; 
  icon: any;
  color?: 'accent' | 'blue' | 'purple' | 'pink';
}) {
  const bgColors = {
    accent: 'bg-[#6EE7B7]',
    blue: 'bg-[#60A5FA]',
    purple: 'bg-[#A855F7]',
    pink: 'bg-[#EC4899]'
  };

  return (
    <motion.div 
      className="nb-card p-6"
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${bgColors[color]} border-3 border-[#111] rounded-xl flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-[#111]" />
        </div>
        <span className="text-xs font-mono bg-[#111] text-white px-2 py-1 rounded-md">LIVE</span>
      </div>
      <p className="text-sm text-gray-600 font-medium mb-1">{title}</p>
      <p className="text-3xl font-bold font-display tracking-tight">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </motion.div>
  );
}

// APY Display
function APYDisplay({ neverlandAPY, townSquareAPY }: { neverlandAPY: number; townSquareAPY: number }) {
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

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#6EE7B7]/20 to-transparent rounded-xl border-2 border-[#111]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#6EE7B7] border-2 border-[#111] rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold">N</span>
            </div>
            <span className="font-semibold">Neverland Pool</span>
          </div>
          <span className="text-2xl font-bold font-display text-[#10B981]">{neverlandAPY.toFixed(2)}%</span>
        </div>

        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#60A5FA]/20 to-transparent rounded-xl border-2 border-[#111]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#60A5FA] border-2 border-[#111] rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-white">T</span>
            </div>
            <span className="font-semibold">TownSquare Pool</span>
          </div>
          <span className="text-2xl font-bold font-display text-[#3B82F6]">{townSquareAPY.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
}

// Allocation Display
function AllocationDisplay({ neverlandAlloc, townSquareAlloc }: { neverlandAlloc: number; townSquareAlloc: number }) {
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
            <span className="font-medium">Neverland Pool</span>
            <span className="font-bold font-mono">{neverlandAlloc.toFixed(1)}%</span>
          </div>
          <div className="h-4 bg-gray-100 border-2 border-[#111] rounded-lg overflow-hidden">
            <motion.div 
              className="h-full bg-[#6EE7B7]"
              initial={{ width: 0 }}
              animate={{ width: `${neverlandAlloc}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <span className="font-medium">TownSquare Pool</span>
            <span className="font-bold font-mono">{townSquareAlloc.toFixed(1)}%</span>
          </div>
          <div className="h-4 bg-gray-100 border-2 border-[#111] rounded-lg overflow-hidden">
            <motion.div 
              className="h-full bg-[#60A5FA]"
              initial={{ width: 0 }}
              animate={{ width: `${townSquareAlloc}%` }}
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
  allowanceApproved,
  handleApprove,
  handleDeposit,
  isApproveLoading,
  isDepositLoading,
  isConnected
}: {
  depositAmount: string;
  setDepositAmount: (v: string) => void;
  allowanceApproved: boolean;
  handleApprove: () => void;
  handleDeposit: () => void;
  isApproveLoading: boolean;
  isDepositLoading: boolean;
  isConnected: boolean;
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
          <label className="block text-sm font-medium mb-2">Amount</label>
          <div className="relative">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0.00"
              className="nb-input w-full pr-16 text-lg"
              disabled={!isConnected}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">USDC</span>
          </div>
        </div>

        {!allowanceApproved ? (
          <button
            onClick={handleApprove}
            disabled={!depositAmount || isApproveLoading || !isConnected}
            className="nb-btn w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApproveLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Approve USDC
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleDeposit}
            disabled={!depositAmount || isDepositLoading || !isConnected}
            className="nb-btn w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDepositLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Deposit Now
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// Withdraw Card
function WithdrawCard({
  withdrawShares,
  setWithdrawShares,
  handleWithdraw,
  isWithdrawLoading,
  userShares,
  isConnected
}: {
  withdrawShares: string;
  setWithdrawShares: (v: string) => void;
  handleWithdraw: () => void;
  isWithdrawLoading: boolean;
  userShares: bigint | undefined;
  isConnected: boolean;
}) {
  const maxShares = userShares ? formatUnits(userShares, 18) : "0";

  return (
    <div className="nb-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#60A5FA] border-3 border-[#111] rounded-xl flex items-center justify-center">
          <ArrowUpFromLine className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold font-display text-lg">Withdraw</h3>
          <p className="text-sm text-gray-500">Redeem your shares</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-medium">Shares</label>
            <button 
              onClick={() => setWithdrawShares(maxShares)}
              className="text-xs font-bold text-[#3B82F6] hover:underline"
            >
              MAX: {parseFloat(maxShares).toFixed(4)}
            </button>
          </div>
          <div className="relative">
            <input
              type="number"
              value={withdrawShares}
              onChange={(e) => setWithdrawShares(e.target.value)}
              placeholder="0.00"
              className="nb-input w-full pr-20 text-lg"
              disabled={!isConnected}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">SHARES</span>
          </div>
        </div>

        <button
          onClick={handleWithdraw}
          disabled={!withdrawShares || isWithdrawLoading || !isConnected}
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
  canRebalance,
  cooldownRemaining,
  isConnected
}: {
  handleRebalance: () => void;
  isRebalanceLoading: boolean;
  canRebalance: boolean;
  cooldownRemaining: number;
  isConnected: boolean;
}) {
  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

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
        Automatically shift funds to the highest-yielding pool based on current APYs.
      </p>

      {!canRebalance && (
        <div className="bg-[#F59E0B]/20 border-2 border-[#F59E0B] rounded-xl p-3 mb-4">
          <p className="text-sm font-medium text-[#B45309]">
            ⏱️ Cooldown: {formatCooldown(cooldownRemaining)}
          </p>
        </div>
      )}

      <button
        onClick={handleRebalance}
        disabled={!canRebalance || isRebalanceLoading || !isConnected}
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
    <div className="min-h-screen flex items-center justify-center p-4">
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
            Automated yield optimization vault. Deposit USDC, let our smart contracts find the best yields.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {[
              { label: 'Auto-Rebalancing', icon: RefreshCw },
              { label: 'Dual Pool Strategy', icon: BarChart3 },
              { label: 'Non-Custodial', icon: Shield },
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

          {/* Stats Preview */}
          <div className="grid grid-cols-3 gap-4 mt-12 max-w-xl mx-auto">
            <div className="nb-card p-4 text-center">
              <p className="text-2xl font-bold font-display text-[#10B981]">12.5%</p>
              <p className="text-sm text-gray-500">Avg APY</p>
            </div>
            <div className="nb-card p-4 text-center">
              <p className="text-2xl font-bold font-display">$2.4M</p>
              <p className="text-sm text-gray-500">TVL</p>
            </div>
            <div className="nb-card p-4 text-center">
              <p className="text-2xl font-bold font-display text-[#A855F7]">847</p>
              <p className="text-sm text-gray-500">Depositors</p>
            </div>
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
            {['Docs', 'GitHub', 'Twitter'].map((link) => (
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
            © 2025 Vaultus. Built on Monad.
          </p>
        </div>
      </div>
    </footer>
  );
}

// Main Page Component
export default function Home() {
  const { address, isConnected } = useAccount();
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawShares, setWithdrawShares] = useState("");
  const [lastRebalanceTime, setLastRebalanceTime] = useState<number>(0);
  const [allowanceApproved, setAllowanceApproved] = useState(false);

  // Read vault data
  const { data: totalAssets } = useReadContract({
    address: ADDRESSES.AUTOMATION_VAULT as `0x${string}`,
    abi: AUTOMATION_VAULT_ABI,
    functionName: "getTotalAssets",
    query: { refetchInterval: 5000 },
  });

  const { data: userBalance } = useReadContract({
    address: ADDRESSES.AUTOMATION_VAULT as `0x${string}`,
    abi: AUTOMATION_VAULT_ABI,
    functionName: "getUserBalance",
    args: [address as `0x${string}`],
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  const { data: userShares } = useReadContract({
    address: ADDRESSES.AUTOMATION_VAULT as `0x${string}`,
    abi: AUTOMATION_VAULT_ABI,
    functionName: "userShares",
    args: [address as `0x${string}`],
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  const { data: apys } = useReadContract({
    address: ADDRESSES.AUTOMATION_VAULT as `0x${string}`,
    abi: AUTOMATION_VAULT_ABI,
    functionName: "getCurrentAPYs",
    query: { refetchInterval: 5000 },
  });

  const { data: allocation } = useReadContract({
    address: ADDRESSES.AUTOMATION_VAULT as `0x${string}`,
    abi: AUTOMATION_VAULT_ABI,
    functionName: "getAllocation",
    query: { refetchInterval: 5000 },
  });

  const { data: userAllowance } = useReadContract({
    address: ADDRESSES.USDC as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [
      address as `0x${string}`,
      ADDRESSES.AUTOMATION_VAULT as `0x${string}`,
    ],
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  // Write contracts
  const { writeContract: approve, data: approveTxHash } = useWriteContract();
  const { writeContract: deposit, data: depositTxHash } = useWriteContract();
  const { writeContract: withdraw, data: withdrawTxHash } = useWriteContract();
  const { writeContract: rebalance, data: rebalanceTxHash } = useWriteContract();

  // Wait for transaction receipts
  const { isLoading: isApproveLoading, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveTxHash as `0x${string}` });

  const { isLoading: isDepositLoading, isSuccess: isDepositSuccess } =
    useWaitForTransactionReceipt({ hash: depositTxHash as `0x${string}` });

  const { isLoading: isWithdrawLoading, isSuccess: isWithdrawSuccess } =
    useWaitForTransactionReceipt({ hash: withdrawTxHash as `0x${string}` });

  const { isLoading: isRebalanceLoading, isSuccess: isRebalanceSuccess } =
    useWaitForTransactionReceipt({ hash: rebalanceTxHash as `0x${string}` });

  // Toast notifications
  useEffect(() => {
    if (isApproveSuccess) toast.success("USDC approved successfully!");
  }, [isApproveSuccess]);

  useEffect(() => {
    if (isDepositSuccess) {
      toast.success("Deposit successful!");
      setDepositAmount("");
      setAllowanceApproved(false);
    }
  }, [isDepositSuccess]);

  useEffect(() => {
    if (isWithdrawSuccess) {
      toast.success("Withdrawal successful!");
      setWithdrawShares("");
    }
  }, [isWithdrawSuccess]);

  useEffect(() => {
    if (isRebalanceSuccess) toast.success("Vault rebalanced successfully!");
  }, [isRebalanceSuccess]);

  // Update allowance status
  useEffect(() => {
    if (userAllowance && depositAmount) {
      const needed = parseUnits(depositAmount || "0", 6);
      setAllowanceApproved(userAllowance >= needed);
    }
  }, [userAllowance, depositAmount]);

  const handleApprove = () => {
    if (!depositAmount || !address) return;
    const amount = parseUnits(depositAmount, 6);
    approve({
      address: ADDRESSES.USDC as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ADDRESSES.AUTOMATION_VAULT as `0x${string}`, amount],
    });
  };

  const handleDeposit = () => {
    if (!depositAmount || !address) return;
    const amount = parseUnits(depositAmount, 6);
    deposit({
      address: ADDRESSES.AUTOMATION_VAULT as `0x${string}`,
      abi: AUTOMATION_VAULT_ABI,
      functionName: "deposit",
      args: [amount],
    });
  };

  const handleWithdraw = () => {
    if (!withdrawShares || !address) return;
    const shares = parseUnits(withdrawShares, 18);
    withdraw({
      address: ADDRESSES.AUTOMATION_VAULT as `0x${string}`,
      abi: AUTOMATION_VAULT_ABI,
      functionName: "withdraw",
      args: [shares],
    });
  };

  const handleRebalance = () => {
    if (!address) return;
    rebalance({
      address: ADDRESSES.AUTOMATION_VAULT as `0x${string}`,
      abi: AUTOMATION_VAULT_ABI,
      functionName: "rebalance",
    });
  };

  // Calculate cooldown
  const cooldownRemaining = Math.max(0, lastRebalanceTime + 3600 - Date.now() / 1000);
  const canRebalance = cooldownRemaining <= 0;

  // Format display values
  const formatValue = (value: bigint | undefined, decimals = 6) => {
    if (!value) return "0.00";
    return parseFloat(formatUnits(value, decimals)).toFixed(2);
  };

  const neverlandAPY = apys ? Number(apys[0]) / 100 : 8.5;
  const townSquareAPY = apys ? Number(apys[1]) / 100 : 6.2;
  const neverlandAlloc = allocation ? (Number(allocation[0]) / 1e18) * 100 : 65;
  const townSquareAlloc = allocation ? (Number(allocation[1]) / 1e18) * 100 : 35;

  // Not connected - show hero
  if (!isConnected) {
    return (
      <main className="min-h-screen" style={{ background: '#F7F5F2' }}>
        <Header />
        <HeroSection />
        <Footer />
      </main>
    );
  }

  // Connected - show dashboard
  return (
    <main className="min-h-screen" style={{ background: '#F7F5F2' }}>
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
                <h2 className="text-2xl font-bold font-display mb-1">Welcome back!</h2>
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
              value={`$${formatValue(totalAssets)}`}
              subtitle="Across all pools"
              icon={Vault}
              color="accent"
            />
            <StatCard
              title="Your Balance"
              value={`$${formatValue(userBalance)}`}
              subtitle="Current value"
              icon={Wallet}
              color="blue"
            />
            <StatCard
              title="Your Shares"
              value={formatValue(userShares, 18)}
              subtitle="Vault tokens"
              icon={BarChart3}
              color="purple"
            />
            <StatCard
              title="Best APY"
              value={`${Math.max(neverlandAPY, townSquareAPY).toFixed(2)}%`}
              subtitle="Current optimal"
              icon={TrendingUp}
              color="pink"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - APY & Allocation */}
            <div className="space-y-6">
              <APYDisplay neverlandAPY={neverlandAPY} townSquareAPY={townSquareAPY} />
              <AllocationDisplay neverlandAlloc={neverlandAlloc} townSquareAlloc={townSquareAlloc} />
            </div>

            {/* Middle & Right - Actions */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <DepositCard
                depositAmount={depositAmount}
                setDepositAmount={setDepositAmount}
                allowanceApproved={allowanceApproved}
                handleApprove={handleApprove}
                handleDeposit={handleDeposit}
                isApproveLoading={isApproveLoading}
                isDepositLoading={isDepositLoading}
                isConnected={isConnected}
              />
              <WithdrawCard
                withdrawShares={withdrawShares}
                setWithdrawShares={setWithdrawShares}
                handleWithdraw={handleWithdraw}
                isWithdrawLoading={isWithdrawLoading}
                userShares={userShares}
                isConnected={isConnected}
              />
              <div className="md:col-span-2">
                <RebalanceCard
                  handleRebalance={handleRebalance}
                  isRebalanceLoading={isRebalanceLoading}
                  canRebalance={canRebalance}
                  cooldownRemaining={cooldownRemaining}
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
