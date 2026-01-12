"use client";

/**
 * WalletManager Component
 * 
 * Comprehensive wallet management dashboard including:
 * - Balance display
 * - Fund wallet options
 * - Connected wallets list
 * - Deposit address
 * - Withdraw to external wallet
 */

import { useState } from "react";
import { 
  Wallet, 
  Copy, 
  Check, 
  ExternalLink, 
  ChevronDown,
  ChevronUp,
  Settings,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw
} from "lucide-react";
import { useUSDT0Balance, useAllWallets, useConnectExternalWallet } from "@plasma-pay/privy-auth";
import { FundWalletModal } from "./FundWallet";
import { ModalPortal } from "./ui/ModalPortal";

interface WalletManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletManager({ isOpen, onClose }: WalletManagerProps) {
  const [copied, setCopied] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("wallets");
  
  const { balance, formatted, refresh, loading: balanceLoading } = useUSDT0Balance();
  const { wallets, embeddedWallet, externalWallets, hasExternalWallet } = useAllWallets();
  const { connectWallet, loading: connectingWallet } = useConnectExternalWallet();

  if (!isOpen) return null;

  const copyAddress = async (address: string) => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <ModalPortal isOpen={true} onClose={onClose} zIndex={110}>
      <div className="relative w-full max-w-md bg-gradient-to-br from-white/[0.12] to-white/[0.06] backdrop-blur-xl border border-white/15 rounded-3xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[rgb(0,212,255)] to-purple-500 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Wallet Manager</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Balance Section */}
          <div className="bg-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/50 text-sm">Total Balance</span>
              <button
                onClick={refresh}
                disabled={balanceLoading}
                className="text-white/40 hover:text-white/70 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${balanceLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="text-4xl font-bold text-white mb-4">
              ${formatted || "0.00"}
              <span className="text-white/30 text-lg ml-2">USDT0</span>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowFundModal(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)] hover:bg-[rgb(0,212,255)]/30 transition-colors text-sm font-medium"
              >
                <ArrowDownLeft className="w-4 h-4" />
                Add Funds
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition-colors text-sm font-medium"
                disabled
                title="Coming soon"
              >
                <ArrowUpRight className="w-4 h-4" />
                Withdraw
              </button>
            </div>
          </div>

          {/* Connected Wallets Section */}
          <div className="bg-white/5 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection("wallets")}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-white/50" />
                <span className="text-white font-medium">Connected Wallets</span>
                <span className="text-white/30 text-sm">({wallets.length})</span>
              </div>
              {expandedSection === "wallets" ? (
                <ChevronUp className="w-5 h-5 text-white/30" />
              ) : (
                <ChevronDown className="w-5 h-5 text-white/30" />
              )}
            </button>
            
            {expandedSection === "wallets" && (
              <div className="px-4 pb-4 space-y-2">
                {/* Embedded Wallet */}
                {embeddedWallet && (
                  <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[rgb(0,212,255)] to-blue-500 flex items-center justify-center">
                        <Wallet className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">Plasma Wallet</p>
                        <p className="text-white/40 text-xs font-mono">
                          {embeddedWallet.address.slice(0, 6)}...{embeddedWallet.address.slice(-4)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                        Primary
                      </span>
                      <button
                        onClick={() => copyAddress(embeddedWallet.address)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-white/40" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* External Wallets */}
                {externalWallets.map((wallet) => (
                  <div key={wallet.address} className="flex items-center justify-between p-3 bg-black/20 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <ExternalLink className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium capitalize">
                          {wallet.walletClientType || 'External'}
                        </p>
                        <p className="text-white/40 text-xs font-mono">
                          {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => copyAddress(wallet.address)}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Copy className="w-4 h-4 text-white/40" />
                    </button>
                  </div>
                ))}

                {/* Connect Another Wallet */}
                <button
                  onClick={() => connectWallet()}
                  disabled={connectingWallet}
                  className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-white/20 rounded-xl text-white/50 hover:text-white hover:border-white/40 transition-colors text-sm"
                >
                  {connectingWallet ? (
                    "Connecting..."
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      Connect External Wallet
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Deposit Address Section */}
          <div className="bg-white/5 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection("deposit")}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ArrowDownLeft className="w-5 h-5 text-white/50" />
                <span className="text-white font-medium">Receive USDT0</span>
              </div>
              {expandedSection === "deposit" ? (
                <ChevronUp className="w-5 h-5 text-white/30" />
              ) : (
                <ChevronDown className="w-5 h-5 text-white/30" />
              )}
            </button>
            
            {expandedSection === "deposit" && embeddedWallet && (
              <div className="px-4 pb-4">
                <p className="text-white/50 text-sm mb-3">
                  Send USDT0 on Plasma Chain to this address:
                </p>
                <div className="flex items-center justify-between bg-black/20 rounded-xl p-3 mb-3">
                  <code className="text-white/80 text-xs font-mono break-all pr-2">
                    {embeddedWallet.address}
                  </code>
                  <button
                    onClick={() => copyAddress(embeddedWallet.address)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-white/50" />
                    )}
                  </button>
                </div>
                <div className="text-amber-400/80 text-xs bg-amber-500/10 rounded-xl p-3">
                  <strong>Important:</strong> Only send USDT0 on Plasma Chain (ID: 9745)
                </div>
              </div>
            )}
          </div>

          {/* Network Info */}
          <div className="text-center text-white/30 text-xs pt-2">
            <p>Plasma Chain (ID: 9745) • Zero Gas Fees</p>
          </div>
        </div>
      </div>

      {/* Fund Wallet Modal */}
      {showFundModal && embeddedWallet && (
        <FundWalletModal 
          walletAddress={embeddedWallet.address} 
          onClose={() => setShowFundModal(false)} 
        />
      )}
    </ModalPortal>
  );
}

export function WalletManagerButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-xl hover:bg-white/10 transition-colors text-white/50 hover:text-white"
        title="Wallet Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      <WalletManager isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export default WalletManager;
