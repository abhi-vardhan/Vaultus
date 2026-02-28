"use client";

import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useChainId,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { Wallet, LogOut, ChevronRight, AlertTriangle } from "lucide-react";

const MONAD_TESTNET_ID = 10143;

export default function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const isWrongChain = isConnected && chainId !== MONAD_TESTNET_ID;

  if (isConnected && isWrongChain) {
    return (
      <button
        onClick={() => switchChain({ chainId: MONAD_TESTNET_ID })}
        className="flex items-center gap-2 px-6 py-3 bg-[#F59E0B] border-3 border-[#111] rounded-xl font-display font-bold shadow-[4px_4px_0_0_rgba(0,0,0,0.9)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgba(0,0,0,0.9)] active:translate-y-0 active:shadow-[2px_2px_0_0_rgba(0,0,0,0.9)] transition-all"
      >
        <AlertTriangle className="w-5 h-5" />
        Switch to Monad Testnet
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-3 border-[#111] rounded-xl shadow-[4px_4px_0_0_rgba(0,0,0,0.9)]">
          <div className="w-6 h-6 bg-[#6EE7B7] border-2 border-[#111] rounded-lg flex items-center justify-center">
            <Wallet className="w-3 h-3" />
          </div>
          <span className="font-mono font-semibold text-sm">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          className="p-2 bg-[#EF4444] border-3 border-[#111] rounded-xl shadow-[4px_4px_0_0_rgba(0,0,0,0.9)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgba(0,0,0,0.9)] active:translate-y-0 active:shadow-[2px_2px_0_0_rgba(0,0,0,0.9)] transition-all"
        >
          <LogOut className="w-5 h-5 text-white" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: injected() })}
      className="flex items-center gap-2 px-6 py-3 bg-[#6EE7B7] border-3 border-[#111] rounded-xl font-display font-bold shadow-[4px_4px_0_0_rgba(0,0,0,0.9)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgba(0,0,0,0.9)] active:translate-y-0 active:shadow-[2px_2px_0_0_rgba(0,0,0,0.9)] transition-all"
    >
      <Wallet className="w-5 h-5" />
      Connect Wallet
      <ChevronRight className="w-5 h-5" />
    </button>
  );
}
