"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet, ExternalLink, Check, AlertCircle, Loader2 } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WALLETS = [
  { id: "metamask", name: "MetaMask", icon: "🦊", popular: true },
  { id: "walletconnect", name: "WalletConnect", icon: "🔗", popular: true },
  { id: "coinbase", name: "Coinbase Wallet", icon: "🔵", popular: true },
  { id: "rainbow", name: "Rainbow", icon: "🌈", popular: false },
  { id: "trust", name: "Trust Wallet", icon: "🛡️", popular: false },
];

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { login, connectWallet, authenticated, user } = usePrivy();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [networkAdded, setNetworkAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async (walletId: string) => {
    setConnecting(walletId);
    setError(null);
    
    try {
      if (walletId === "metamask") {
        // Trigger MetaMask through Privy
        await connectWallet();
      } else if (walletId === "walletconnect") {
        await connectWallet();
      } else if (walletId === "coinbase") {
        await connectWallet();
      } else {
        // Generic wallet connection
        await connectWallet();
      }

      // Add Plasma network if not present
      await addPlasmaNetwork();
      setNetworkAdded(true);
      
      // Wait and close
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Failed to connect wallet");
    } finally {
      setConnecting(null);
    }
  };

  const addPlasmaNetwork = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: `0x${(9745).toString(16)}`,
            chainName: "Plasma",
            nativeCurrency: {
              name: "ETH",
              symbol: "ETH",
              decimals: 18,
            },
            rpcUrls: ["https://rpc.plasma.to"],
            blockExplorerUrls: ["https://explorer.plasma.to"],
          }],
        });
      } catch (err) {
        console.log("Network may already be added");
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-sm z-50"
          >
            <div className="liquid-metal-elevated rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">Connect Wallet</h3>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-2">
                {WALLETS.filter(w => w.popular).map((wallet) => (
                  <WalletButton
                    key={wallet.id}
                    wallet={wallet}
                    isConnecting={connecting === wallet.id}
                    isConnected={networkAdded && connecting === wallet.id}
                    onClick={() => handleConnect(wallet.id)}
                    disabled={!!connecting}
                  />
                ))}

                {/* More wallets */}
                <div className="pt-2 mt-2 border-t border-white/10">
                  <p className="text-xs text-white/40 mb-2">More wallets</p>
                  <div className="grid grid-cols-2 gap-2">
                    {WALLETS.filter(w => !w.popular).map((wallet) => (
                      <WalletButton
                        key={wallet.id}
                        wallet={wallet}
                        isConnecting={connecting === wallet.id}
                        isConnected={false}
                        onClick={() => handleConnect(wallet.id)}
                        disabled={!!connecting}
                        compact
                      />
                    ))}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-xl mt-3">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/10">
                <p className="text-xs text-white/40 text-center">
                  By connecting, you agree to our Terms of Service
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function WalletButton({ 
  wallet, 
  isConnecting, 
  isConnected, 
  onClick, 
  disabled,
  compact = false
}: { 
  wallet: typeof WALLETS[0];
  isConnecting: boolean;
  isConnected: boolean;
  onClick: () => void;
  disabled: boolean;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed ${
        compact ? "justify-center" : ""
      }`}
    >
      <span className="text-2xl">{wallet.icon}</span>
      {!compact && (
        <span className="flex-1 text-left font-medium text-white">{wallet.name}</span>
      )}
      {isConnecting && <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />}
      {isConnected && <Check className="w-5 h-5 text-green-400" />}
    </button>
  );
}
