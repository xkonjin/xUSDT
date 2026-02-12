"use client";

/**
 * ExternalWalletPay Component
 * 
 * Allows users to pay payment links using an external wallet (MetaMask, Rabby, etc.)
 * This provides an alternative for users who don't want to create a Privy embedded wallet
 * or who have USDT0 in an existing wallet.
 */

import { useState } from "react";
import { Wallet, Copy, Check, ExternalLink, AlertCircle, X } from "lucide-react";
import { ModalPortal } from "./ui/ModalPortal";

interface ExternalWalletPayProps {
  recipientAddress: string;
  amount: string;
  memo?: string;
  onClose?: () => void;
}

// Plasma Chain configuration
const PLASMA_CHAIN_CONFIG = {
  chainId: "0x2611", // 9745 in hex
  chainName: "Plasma",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.plasma.to"],
  blockExplorerUrls: ["https://scan.plasma.to"],
};

const USDT0_ADDRESS = "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb";

export function ExternalWalletPayButton({ 
  recipientAddress, 
  amount,
  memo 
}: Omit<ExternalWalletPayProps, 'onClose'>) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all text-sm font-medium border border-white/10"
      >
        <Wallet className="w-4 h-4" />
        Pay with External Wallet
      </button>

      {showModal && (
        <ExternalWalletPayModal
          recipientAddress={recipientAddress}
          amount={amount}
          memo={memo}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

export function ExternalWalletPayModal({ 
  recipientAddress, 
  amount, 
  memo,
  onClose 
}: ExternalWalletPayProps) {
  const [copied, setCopied] = useState<"address" | "amount" | null>(null);
  const [addingNetwork, setAddingNetwork] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyToClipboard = async (text: string, type: "address" | "amount") => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  // Add Plasma network to MetaMask
  const addPlasmaNetwork = async () => {
    const ethereum = (window as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    if (!ethereum) {
      setError("Please install MetaMask or another Web3 wallet");
      return;
    }

    setAddingNetwork(true);
    setError(null);

    try {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [PLASMA_CHAIN_CONFIG],
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add network";
      setError(errorMessage);
    } finally {
      setAddingNetwork(false);
    }
  };

  // Open MetaMask with pre-filled transfer (if supported)
  const openInMetaMask = () => {
    // Deep link format for MetaMask token transfer
    const deepLink = `https://metamask.app.link/send/${USDT0_ADDRESS}@${PLASMA_CHAIN_CONFIG.chainId}/transfer?address=${recipientAddress}&uint256=${parseFloat(amount) * 1e6}`;
    window.open(deepLink, "_blank");
  };

  return (
    <ModalPortal isOpen={true} onClose={onClose || (() => undefined)} zIndex={110}>
      <div className="relative w-full max-w-md bg-gradient-to-br from-white/[0.12] to-white/[0.06] backdrop-blur-xl border border-white/15 rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">Pay with Wallet</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions */}
        <div className="space-y-4 mb-6">
          <p className="text-white/60 text-sm">
            Send USDT0 from your external wallet (MetaMask, Rabby, etc.) to complete this payment:
          </p>

          {/* Step 1: Add Network */}
          <div className="bg-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)] text-xs font-bold flex items-center justify-center">1</span>
              <span className="text-white font-medium text-sm">Add Plasma Network</span>
            </div>
            <button
              onClick={addPlasmaNetwork}
              disabled={addingNetwork}
              className="w-full mt-2 py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {addingNetwork ? "Adding..." : "Add to MetaMask"}
            </button>
          </div>

	          {/* Step 2: Amount */}
	          <div className="bg-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)] text-xs font-bold flex items-center justify-center">2</span>
              <span className="text-white font-medium text-sm">Send Amount</span>
            </div>
            <div className="flex items-center justify-between bg-black/20 rounded-xl p-3 mt-2">
              <div>
                <span className="text-2xl font-bold text-white">${amount}</span>
                <span className="text-white/40 text-sm ml-2">USDT0</span>
              </div>
              <button
                onClick={() => copyToClipboard(amount, "amount")}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                {copied === "amount" ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-white/50" />
                )}
              </button>
	            </div>
	          </div>

	          {memo && (
	            <div className="bg-white/5 rounded-2xl p-4">
	              <div className="flex items-center gap-2 mb-2">
	                <span className="text-white font-medium text-sm">Memo</span>
	              </div>
	              <p className="text-white/60 text-sm break-words">{memo}</p>
	            </div>
	          )}

	          {/* Step 3: Recipient */}
	          <div className="bg-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)] text-xs font-bold flex items-center justify-center">3</span>
              <span className="text-white font-medium text-sm">Send To Address</span>
            </div>
            <div className="flex items-center justify-between bg-black/20 rounded-xl p-3 mt-2">
              <code className="text-white/80 text-xs font-mono break-all pr-2">
                {recipientAddress}
              </code>
              <button
                onClick={() => copyToClipboard(recipientAddress, "address")}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
              >
                {copied === "address" ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-white/50" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl p-3 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Warning */}
        <div className="flex items-start gap-2 text-amber-400/80 text-xs bg-amber-500/10 rounded-xl p-3 mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Only send <strong>USDT0</strong> on <strong>Plasma Chain</strong> (ID: 9745). 
            Sending other tokens or on wrong networks will result in lost funds.
          </span>
        </div>

        {/* Token Contract Info */}
        <div className="text-center mb-4">
          <p className="text-white/40 text-xs mb-1">USDT0 Token Contract:</p>
          <code className="text-white/60 text-xs font-mono">{USDT0_ADDRESS}</code>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={openInMetaMask}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Open in MetaMask
          </button>
          
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 font-medium transition-colors"
          >
            I&apos;ve Sent the Payment
          </button>
        </div>

        {/* Footer */}
        <p className="text-white/30 text-xs text-center mt-4">
          After sending, the payment will be confirmed automatically
        </p>
      </div>
    </ModalPortal>
  );
}

export default ExternalWalletPayModal;
