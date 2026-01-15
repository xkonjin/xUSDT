"use client";

/**
 * BridgeDeposit Component
 * 
 * Allows users to deposit any token from any supported chain
 * and automatically convert it to USDT0 on Plasma via bridge aggregation.
 * 
 * Supports: LI.FI, deBridge, Squid Router, Across Protocol
 */

import { useState, useEffect, useCallback } from "react";
import { 
  ArrowRightLeft, 
  ChevronDown, 
  RefreshCw, 
  Clock, 
  Fuel, 
  AlertCircle,
  Check,
  X,
  Loader2,
  ExternalLink,
  Zap,
  RotateCcw
} from "lucide-react";
import { ModalPortal } from "./ui/ModalPortal";
import { posthog } from "@/lib/posthog";
import type { BridgeQuote, ChainInfo, TokenInfo, BridgeProvider } from "@plasma-pay/aggregator";
import { POPULAR_SOURCE_CHAINS, POPULAR_TOKENS } from "@plasma-pay/aggregator";

interface BridgeDepositProps {
  recipientAddress: string;
  onClose?: () => void;
  onSuccess?: (txHash: string) => void;
}

interface QuoteState {
  loading: boolean;
  error: string | null;
  best: BridgeQuote | null;
  all: BridgeQuote[];
  lastUpdated: Date | null;
}

const PROVIDER_LOGOS: Record<BridgeProvider, string> = {
  lifi: "🔗",
  debridge: "🌉",
  squid: "🦑",
  across: "⚡",
};

const PROVIDER_NAMES: Record<BridgeProvider, string> = {
  lifi: "LI.FI",
  debridge: "deBridge",
  squid: "Squid",
  across: "Across",
};

export function BridgeDepositButton({ recipientAddress }: { recipientAddress: string }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[rgb(0,212,255)]/10 to-purple-500/10 hover:from-[rgb(0,212,255)]/20 hover:to-purple-500/20 transition-all text-left border border-[rgb(0,212,255)]/20"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[rgb(0,212,255)] to-purple-500 flex items-center justify-center flex-shrink-0">
          <ArrowRightLeft className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-white font-semibold">Bridge Any Token</h4>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)] rounded-full">
              NEW
            </span>
          </div>
          <p className="text-white/50 text-sm">Convert ETH, USDC, etc. from any chain</p>
        </div>
        <span className="text-white/30">→</span>
      </button>

      {showModal && (
        <BridgeDepositModal 
          recipientAddress={recipientAddress} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </>
  );
}

export function BridgeDepositModal({ recipientAddress, onClose, onSuccess }: BridgeDepositProps) {
  // Selected chain and token
  const [selectedChain, setSelectedChain] = useState<ChainInfo>(POPULAR_SOURCE_CHAINS[0]);
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [amount, setAmount] = useState<string>("");
  
  // UI state
  const [showChainPicker, setShowChainPicker] = useState(false);
  const [showTokenPicker, setShowTokenPicker] = useState(false);
  const [showAllQuotes, setShowAllQuotes] = useState(false);
  
  // Quote state
  const [quote, setQuote] = useState<QuoteState>({
    loading: false,
    error: null,
    best: null,
    all: [],
    lastUpdated: null,
  });
  
  // Transaction state
  const [txState, setTxState] = useState<{
    status: "idle" | "approving" | "bridging" | "waiting" | "success" | "error";
    txHash?: string;
    error?: string;
  }>({ status: "idle" });
  
  // Get tokens for selected chain
  const availableTokens = POPULAR_TOKENS[selectedChain.chainId] || [];
  
  // Set default token when chain changes
  useEffect(() => {
    if (availableTokens.length > 0) {
      setSelectedToken(availableTokens[0]);
    } else {
      setSelectedToken(null);
    }
    // Reset quote when chain changes
    setQuote({ loading: false, error: null, best: null, all: [], lastUpdated: null });
  }, [selectedChain.chainId]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Fetch quote when amount changes
  const fetchQuote = useCallback(async () => {
    if (!selectedToken || !amount || parseFloat(amount) <= 0) {
      setQuote({ loading: false, error: null, best: null, all: [], lastUpdated: null });
      return;
    }
    
    setQuote(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch("/api/bridge/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromChainId: selectedChain.chainId,
          fromToken: selectedToken.address,
          fromAmount: (parseFloat(amount) * Math.pow(10, selectedToken.decimals)).toString(),
          recipientAddress,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get quote");
      }
      
      const data = await response.json();
      
      setQuote({
        loading: false,
        error: null,
        best: data.best,
        all: data.all,
        lastUpdated: new Date(),
      });
    } catch (err) {
      setQuote({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to get quote",
        best: null,
        all: [],
        lastUpdated: null,
      });
    }
  }, [selectedChain.chainId, selectedToken, amount, recipientAddress]);
  
  // Debounced quote fetch
  useEffect(() => {
    const timer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timer);
  }, [fetchQuote]);
  
  // Auto-refresh quotes every 30 seconds
  useEffect(() => {
    if (!quote.best || txState.status !== "idle") return;
    
    const interval = setInterval(fetchQuote, 30000);
    return () => clearInterval(interval);
  }, [quote.best, txState.status, fetchQuote]);
  
  // Reset error state and allow retry
  const resetError = () => {
    setTxState({ status: "idle" });
    // Refetch quote
    fetchQuote();
  };

  // Execute bridge transaction
  const executeBridge = async () => {
    if (!quote.best || !selectedToken) return;
    
    setTxState({ status: "bridging" });
    
    // Track bridge attempt
    posthog?.capture("bridge_initiated", {
      provider: quote.best.provider,
      fromChain: selectedChain.name,
      fromToken: selectedToken.symbol,
      amount: amount,
      estimatedOutput: quote.best.toAmount,
    });
    
    try {
      // Get transaction data from API
      const txResponse = await fetch("/api/bridge/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: quote.best.provider,
          fromChainId: selectedChain.chainId,
          fromToken: selectedToken.address,
          fromAmount: (parseFloat(amount) * Math.pow(10, selectedToken.decimals)).toString(),
          recipientAddress,
        }),
      });
      
      if (!txResponse.ok) {
        const error = await txResponse.json();
        throw new Error(error.error || "Failed to get transaction");
      }
      
      const txData = await txResponse.json();
      
      // Track that we got transaction data (wallet connection needed)
      posthog?.capture("bridge_wallet_required", {
        provider: quote.best.provider,
        fromChain: selectedChain.name,
      });
      
      // For now, show a message about connecting external wallet
      // In production, this would use WalletConnect or the user's connected wallet
      setTxState({ 
        status: "error",
        error: "Connect your wallet to complete this transaction. WalletConnect integration coming soon!",
      });
      
      console.log("Transaction data:", txData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Bridge failed";
      
      posthog?.capture("bridge_error", {
        provider: quote.best?.provider,
        fromChain: selectedChain.name,
        error: errorMessage,
      });
      
      setTxState({
        status: "error",
        error: errorMessage,
      });
    }
  };
  
  // Format amount for display
  const formatOutputAmount = (amountStr: string) => {
    const num = parseFloat(amountStr) / 1e6; // USDT0 has 6 decimals
    return num.toFixed(2);
  };
  
  // Format time for display
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `~${seconds}s`;
    const minutes = Math.round(seconds / 60);
    return `~${minutes}min`;
  };

  return (
    <ModalPortal isOpen={true} onClose={onClose || (() => undefined)} zIndex={120}>
      <div className="relative w-full max-w-md bg-gradient-to-br from-white/[0.12] to-white/[0.06] backdrop-blur-xl border border-white/15 rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[rgb(0,212,255)] to-purple-500 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Bridge to USDT0</h3>
              <p className="text-white/40 text-xs">Convert any token to USDT0</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* From Section */}
        <div className="bg-white/5 rounded-2xl p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/50 text-sm">From</span>
            {/* Chain Selector */}
            <button
              onClick={() => setShowChainPicker(!showChainPicker)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 transition-colors"
            >
              <span className="text-white text-sm font-medium">{selectedChain.shortName}</span>
              <ChevronDown className="w-4 h-4 text-white/50" />
            </button>
          </div>
          
          {/* Chain Picker Dropdown */}
          {showChainPicker && (
            <div className="absolute left-4 right-4 mt-1 bg-gray-900 border border-white/20 rounded-2xl p-2 z-10 max-h-48 overflow-y-auto">
              {POPULAR_SOURCE_CHAINS.map((chain) => (
                <button
                  key={chain.chainId}
                  onClick={() => {
                    setSelectedChain(chain);
                    setShowChainPicker(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    chain.chainId === selectedChain.chainId
                      ? "bg-[rgb(0,212,255)]/20 text-white"
                      : "hover:bg-white/10 text-white/70"
                  }`}
                >
                  <span className="font-medium">{chain.name}</span>
                  {chain.chainId === selectedChain.chainId && (
                    <Check className="w-4 h-4 ml-auto text-[rgb(0,212,255)]" />
                  )}
                </button>
              ))}
            </div>
          )}
          
          {/* Token + Amount Row */}
          <div className="flex items-center gap-3">
            {/* Token Selector */}
            <button
              onClick={() => setShowTokenPicker(!showTokenPicker)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 transition-colors min-w-[120px]"
              disabled={availableTokens.length === 0}
            >
              {selectedToken ? (
                <>
                  <span className="text-white font-bold">{selectedToken.symbol}</span>
                  <ChevronDown className="w-4 h-4 text-white/50" />
                </>
              ) : (
                <span className="text-white/50">Select</span>
              )}
            </button>
            
            {/* Token Picker Dropdown */}
            {showTokenPicker && availableTokens.length > 0 && (
              <div className="absolute left-4 right-4 mt-16 bg-gray-900 border border-white/20 rounded-2xl p-2 z-10">
                {availableTokens.map((token) => (
                  <button
                    key={token.address}
                    onClick={() => {
                      setSelectedToken(token);
                      setShowTokenPicker(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      token.address === selectedToken?.address
                        ? "bg-[rgb(0,212,255)]/20 text-white"
                        : "hover:bg-white/10 text-white/70"
                    }`}
                  >
                    <span className="font-medium">{token.symbol}</span>
                    <span className="text-white/40 text-sm">{token.name}</span>
                    {token.address === selectedToken?.address && (
                      <Check className="w-4 h-4 ml-auto text-[rgb(0,212,255)]" />
                    )}
                  </button>
                ))}
              </div>
            )}
            
            {/* Amount Input */}
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-right text-2xl font-bold text-white placeholder:text-white/30 focus:outline-none"
            />
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center -my-1 relative z-10">
          <div className="w-10 h-10 rounded-full bg-gray-900 border-4 border-[#1a1a2e] flex items-center justify-center">
            <ChevronDown className="w-5 h-5 text-[rgb(0,212,255)]" />
          </div>
        </div>

        {/* To Section */}
        <div className="bg-white/5 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/50 text-sm">To (Plasma Chain)</span>
            <span className="text-white/50 text-sm">USDT0</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-white">
              {quote.loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-white/50 text-lg">Finding best price...</span>
                </span>
              ) : quote.best ? (
                `$${formatOutputAmount(quote.best.toAmount)}`
              ) : (
                <span className="text-white/30">Enter amount above</span>
              )}
            </span>
            
            {quote.best && (
              <button
                onClick={fetchQuote}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Refresh quote"
              >
                <RefreshCw className={`w-4 h-4 text-white/50 ${quote.loading ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>
        </div>

        {/* Quote Details */}
        {quote.best && (
          <div className="bg-white/5 rounded-2xl p-4 mb-4 space-y-3">
            {/* Best Route */}
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">Best Route</span>
              <div className="flex items-center gap-2">
                <span className="text-lg">{PROVIDER_LOGOS[quote.best.provider]}</span>
                <span className="text-white font-medium">{PROVIDER_NAMES[quote.best.provider]}</span>
                {quote.best.provider === "across" && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-yellow-500/20 text-yellow-400 rounded-full">
                    <Zap className="w-3 h-3" />
                    FAST
                  </span>
                )}
              </div>
            </div>
            
            {/* Time */}
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Estimated Time
              </span>
              <span className="text-white">{formatTime(quote.best.estimatedTime)}</span>
            </div>
            
            {/* Gas */}
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm flex items-center gap-1">
                <Fuel className="w-4 h-4" />
                Gas Cost
              </span>
              <span className="text-white">${quote.best.gasUsd}</span>
            </div>
            
            {/* Min Received */}
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">Min. Received</span>
              <span className="text-white">${formatOutputAmount(quote.best.toAmountMin)}</span>
            </div>
            
            {/* View All Quotes */}
            {quote.all.length > 1 && (
              <button
                onClick={() => setShowAllQuotes(!showAllQuotes)}
                className="w-full text-[rgb(0,212,255)] text-sm hover:underline"
              >
                {showAllQuotes ? "Hide" : "View"} all {quote.all.length} routes
              </button>
            )}
            
            {/* All Quotes */}
            {showAllQuotes && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                {quote.all.map((q, idx) => (
                  <div
                    key={`${q.provider}-${idx}`}
                    className={`flex items-center justify-between p-3 rounded-xl ${
                      q.provider === quote.best?.provider
                        ? "bg-[rgb(0,212,255)]/10 border border-[rgb(0,212,255)]/30"
                        : "bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{PROVIDER_LOGOS[q.provider]}</span>
                      <span className="text-white text-sm">{PROVIDER_NAMES[q.provider]}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">${formatOutputAmount(q.toAmount)}</div>
                      <div className="text-white/40 text-xs">{formatTime(q.estimatedTime)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {(quote.error || txState.error) && (
          <div className="bg-red-500/10 rounded-xl p-3 mb-4">
            <div className="flex items-start gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{quote.error || txState.error}</span>
            </div>
            {txState.error && (
              <button
                onClick={resetError}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-sm transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
            )}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={executeBridge}
          disabled={!quote.best || quote.loading || txState.status !== "idle"}
          className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {txState.status === "idle" ? (
            <>
              <ArrowRightLeft className="w-5 h-5" />
              Convert to USDT0
            </>
          ) : txState.status === "bridging" ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Preparing...
            </>
          ) : txState.status === "success" ? (
            <>
              <Check className="w-5 h-5" />
              Conversion Complete!
            </>
          ) : (
            <>
              <ArrowRightLeft className="w-5 h-5" />
              Convert to USDT0
            </>
          )}
        </button>

        {/* Success View */}
        {txState.status === "success" && txState.txHash && (
          <div className="mt-4 text-center">
            <a
              href={`${selectedChain.explorerUrl}/tx/${txState.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[rgb(0,212,255)] hover:underline text-sm"
            >
              View on Explorer
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* Footer */}
        <p className="text-white/30 text-xs text-center mt-4">
          Best rate aggregated from LI.FI, deBridge, Squid & Across
        </p>
      </div>
    </ModalPortal>
  );
}

export default BridgeDepositModal;
