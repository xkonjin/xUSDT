"use client";

/**
 * BridgeDeposit Component
 *
 * Allows users to deposit any token from any supported chain
 * and automatically convert it to USDT0 on Plasma via bridge aggregation.
 *
 * Supports: LI.FI, deBridge, Squid Router, Across Protocol
 */

import { useState, useEffect, useCallback, useRef } from "react";
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
  RotateCcw,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { ModalPortal } from "./ui/ModalPortal";
import { posthog } from "@/lib/posthog";
import {
  useAllWallets,
  useConnectExternalWallet,
} from "@plasma-pay/privy-auth";
import type {
  BridgeQuote,
  ChainInfo,
  TokenInfo,
  BridgeProvider,
} from "@plasma-pay/aggregator";
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

interface BalanceState {
  loading: boolean;
  balance: string | null;
  error: string | null;
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

const QUOTE_VALIDITY_SECONDS = 30;
const QUOTE_WARNING_THRESHOLD = 10;

export function BridgeDepositButton({
  recipientAddress,
}: {
  recipientAddress: string;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] transition-all text-left border border-white/[0.06]"
        aria-label="Bridge any token to USDT0"
      >
        <div className="w-12 h-12 rounded-full bg-plenmo-500/15 flex items-center justify-center flex-shrink-0">
          <ArrowRightLeft className="w-6 h-6 text-white" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-white font-semibold">Bridge Any Token</h4>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-plenmo-500/20 text-plenmo-500 rounded-full">
              NEW
            </span>
          </div>
          <p className="text-white/50 text-sm">
            Convert ETH, USDC, etc. from any chain
          </p>
        </div>
        <span className="text-white/30" aria-hidden="true">
          →
        </span>
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

export function BridgeDepositModal({
  recipientAddress,
  onClose,
  onSuccess,
}: BridgeDepositProps) {
  // Selected chain and token
  const [selectedChain, setSelectedChain] = useState<ChainInfo>(
    POPULAR_SOURCE_CHAINS[0]
  );
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [amount, setAmount] = useState<string>("");

  // UI state
  const [showChainPicker, setShowChainPicker] = useState(false);
  const [showTokenPicker, setShowTokenPicker] = useState(false);
  const [showAllQuotes, setShowAllQuotes] = useState(false);

  // Dropdown refs for proper positioning
  const chainButtonRef = useRef<HTMLButtonElement>(null);
  const tokenButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Quote state
  const [quote, setQuote] = useState<QuoteState>({
    loading: false,
    error: null,
    best: null,
    all: [],
    lastUpdated: null,
  });

  // Quote expiry countdown
  const [quoteSecondsLeft, setQuoteSecondsLeft] = useState<number>(
    QUOTE_VALIDITY_SECONDS
  );

  // Balance state for source token
  const [sourceBalance, setSourceBalance] = useState<BalanceState>({
    loading: false,
    balance: null,
    error: null,
  });

  // Transaction state
  const [txState, setTxState] = useState<{
    status:
      | "idle"
      | "connecting"
      | "approving"
      | "bridging"
      | "waiting"
      | "success"
      | "error";
    txHash?: string;
    error?: string;
  }>({ status: "idle" });

  // External wallet connection
  const { externalWallets, hasExternalWallet } = useAllWallets();
  const { connectWallet, loading: connectingWallet } =
    useConnectExternalWallet();

  // Get tokens for selected chain
  const availableTokens = POPULAR_TOKENS[selectedChain.chainId] || [];

  // Set default token when chain changes
  useEffect(() => {
    if (availableTokens.length > 0) {
      setSelectedToken(availableTokens[0]);
    } else {
      setSelectedToken(null);
    }
    // Reset quote and balance when chain changes
    setQuote({
      loading: false,
      error: null,
      best: null,
      all: [],
      lastUpdated: null,
    });
    setSourceBalance({ loading: false, balance: null, error: null });
    setQuoteSecondsLeft(QUOTE_VALIDITY_SECONDS);
  }, [selectedChain.chainId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setShowChainPicker(false);
        setShowTokenPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Quote expiry countdown
  useEffect(() => {
    if (!quote.lastUpdated || !quote.best) {
      setQuoteSecondsLeft(QUOTE_VALIDITY_SECONDS);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - quote.lastUpdated!.getTime()) / 1000
      );
      const remaining = Math.max(0, QUOTE_VALIDITY_SECONDS - elapsed);
      setQuoteSecondsLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [quote.lastUpdated, quote.best]);

  // Get stable reference to external wallet address
  const externalWalletAddress = externalWallets[0]?.address;

  // Fetch source token balance when external wallet connected
  useEffect(() => {
    async function fetchBalance() {
      if (!hasExternalWallet || !selectedToken || !externalWalletAddress) {
        setSourceBalance({ loading: false, balance: null, error: null });
        return;
      }

      // Get fresh wallet reference inside the effect
      const wallet = externalWallets.find(
        (w) => w.address === externalWalletAddress
      );
      if (!wallet) {
        setSourceBalance({ loading: false, balance: null, error: null });
        return;
      }

      setSourceBalance({ loading: true, balance: null, error: null });

      try {
        const provider = await wallet.getEthereumProvider();

        // Check if it's native token (ETH, MATIC, etc.)
        const isNative =
          selectedToken.address.toLowerCase() ===
          "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

        let balance: string;
        if (isNative) {
          const balanceHex = (await provider.request({
            method: "eth_getBalance",
            params: [externalWalletAddress, "latest"],
          })) as string;
          balance = (
            parseInt(balanceHex, 16) / Math.pow(10, selectedToken.decimals)
          ).toFixed(4);
        } else {
          // ERC20 balanceOf call
          const balanceData = (await provider.request({
            method: "eth_call",
            params: [
              {
                to: selectedToken.address,
                data: `0x70a08231000000000000000000000000${externalWalletAddress.slice(
                  2
                )}`,
              },
              "latest",
            ],
          })) as string;
          balance = (
            parseInt(balanceData, 16) / Math.pow(10, selectedToken.decimals)
          ).toFixed(4);
        }

        setSourceBalance({ loading: false, balance, error: null });
      } catch (err) {
        console.error("Failed to fetch balance:", err);
        setSourceBalance({
          loading: false,
          balance: null,
          error: "Failed to fetch balance",
        });
      }
    }

    fetchBalance();
  }, [
    hasExternalWallet,
    externalWalletAddress,
    selectedToken?.address,
    selectedChain.chainId,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch quote when amount changes
  const fetchQuote = useCallback(async () => {
    if (!selectedToken || !amount || parseFloat(amount) <= 0) {
      setQuote({
        loading: false,
        error: null,
        best: null,
        all: [],
        lastUpdated: null,
      });
      return;
    }

    setQuote((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch("/api/bridge/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromChainId: selectedChain.chainId,
          fromToken: selectedToken.address,
          fromAmount: (
            parseFloat(amount) * Math.pow(10, selectedToken.decimals)
          ).toString(),
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
      setQuoteSecondsLeft(QUOTE_VALIDITY_SECONDS);
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
    fetchQuote();
  };

  // Check if user has sufficient balance
  const hasSufficientBalance = useCallback(() => {
    if (!sourceBalance.balance || !amount) return true; // Don't block if we can't check
    return parseFloat(sourceBalance.balance) >= parseFloat(amount);
  }, [sourceBalance.balance, amount]);

  // Execute bridge transaction
  const executeBridge = async () => {
    if (!quote.best || !selectedToken) return;

    // Check if external wallet is connected
    if (!hasExternalWallet) {
      setTxState({ status: "connecting" });
      posthog?.capture("bridge_wallet_required", {
        provider: quote.best.provider,
        fromChain: selectedChain.name,
      });
      connectWallet();
      return;
    }

    // Check balance
    if (!hasSufficientBalance()) {
      setTxState({
        status: "error",
        error: `Insufficient ${selectedToken.symbol} balance. You have ${sourceBalance.balance} but need ${amount}.`,
      });
      return;
    }

    setTxState({ status: "bridging" });

    // Track bridge attempt
    posthog?.capture("bridge_initiated", {
      provider: quote.best.provider,
      fromChain: selectedChain.name,
      fromToken: selectedToken.symbol,
      amount: amount,
      estimatedOutput: quote.best.toAmount,
      walletType: externalWallets[0]?.walletClientType || "unknown",
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
          fromAmount: (
            parseFloat(amount) * Math.pow(10, selectedToken.decimals)
          ).toString(),
          recipientAddress,
          userAddress: externalWallets[0]?.address,
        }),
      });

      if (!txResponse.ok) {
        const error = await txResponse.json();
        throw new Error(error.error || "Failed to get transaction");
      }

      const txData = await txResponse.json();

      // Get provider and execute transaction
      const provider = await externalWallets[0].getEthereumProvider();

      // Switch chain if needed
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${selectedChain.chainId.toString(16)}` }],
        });
      } catch (switchError: unknown) {
        // Chain not added, try to add it
        if ((switchError as { code?: number })?.code === 4902) {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${selectedChain.chainId.toString(16)}`,
                chainName: selectedChain.name,
                nativeCurrency: selectedChain.nativeCurrency,
                rpcUrls: selectedChain.rpcUrl ? [selectedChain.rpcUrl] : [],
                blockExplorerUrls: selectedChain.explorerUrl
                  ? [selectedChain.explorerUrl]
                  : [],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }

      // Handle approval if needed
      if (txData.transaction?.approval) {
        setTxState({ status: "approving" });

        const approval = txData.transaction.approval;
        const approveTx = await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: externalWallets[0].address,
              to: approval.token,
              data: `0x095ea7b3000000000000000000000000${approval.spender.slice(
                2
              )}${BigInt(approval.amount).toString(16).padStart(64, "0")}`,
            },
          ],
        });

        // Wait for approval to be mined
        await waitForTransaction(provider, approveTx as string);
      }

      // Execute bridge transaction
      setTxState({ status: "bridging" });

      const txHash = (await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: externalWallets[0].address,
            to: txData.transaction.to,
            data: txData.transaction.data,
            value: txData.transaction.value || "0x0",
            ...(txData.transaction.gasLimit
              ? {
                  gas: `0x${parseInt(txData.transaction.gasLimit).toString(
                    16
                  )}`,
                }
              : {}),
          },
        ],
      })) as string;

      posthog?.capture("bridge_transaction_sent", {
        provider: quote.best.provider,
        fromChain: selectedChain.name,
        txHash,
      });

      setTxState({ status: "waiting", txHash });

      // Wait for transaction
      await waitForTransaction(provider, txHash);

      posthog?.capture("bridge_success", {
        provider: quote.best.provider,
        fromChain: selectedChain.name,
        txHash,
      });

      setTxState({ status: "success", txHash });
      onSuccess?.(txHash);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Bridge failed";

      posthog?.capture("bridge_error", {
        provider: quote.best?.provider,
        fromChain: selectedChain.name,
        error: errorMessage,
      });

      // User-friendly error messages
      let friendlyError = errorMessage;
      if (
        errorMessage.includes("user rejected") ||
        errorMessage.includes("User denied")
      ) {
        friendlyError = "Transaction was cancelled";
      } else if (errorMessage.includes("insufficient funds")) {
        friendlyError = "Insufficient funds for gas";
      }

      setTxState({
        status: "error",
        error: friendlyError,
      });
    }
  };

  // Helper to wait for transaction
  async function waitForTransaction(
    provider: unknown,
    txHash: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkReceipt = async () => {
        try {
          const receipt = (await (
            provider as {
              request: (args: {
                method: string;
                params: unknown[];
              }) => Promise<unknown>;
            }
          ).request({
            method: "eth_getTransactionReceipt",
            params: [txHash],
          })) as { status: string } | null;

          if (receipt) {
            if (receipt.status === "0x1" || receipt.status === "1") {
              resolve();
            } else {
              reject(new Error("Transaction failed"));
            }
          } else {
            setTimeout(checkReceipt, 2000);
          }
        } catch {
          setTimeout(checkReceipt, 2000);
        }
      };
      checkReceipt();
    });
  }

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

  // Determine button text and state
  const getButtonContent = () => {
    if (txState.status === "connecting" || connectingWallet) {
      return (
        <>
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          Connecting Wallet...
        </>
      );
    }
    if (txState.status === "approving") {
      return (
        <>
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          Approving Token...
        </>
      );
    }
    if (txState.status === "bridging") {
      return (
        <>
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          Confirming Bridge...
        </>
      );
    }
    if (txState.status === "waiting") {
      return (
        <>
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          Waiting for Confirmation...
        </>
      );
    }
    if (txState.status === "success") {
      return (
        <>
          <Check className="w-5 h-5" aria-hidden="true" />
          Bridge Complete!
        </>
      );
    }
    if (!hasExternalWallet) {
      return (
        <>
          <Wallet className="w-5 h-5" aria-hidden="true" />
          Connect Wallet to Bridge
        </>
      );
    }
    return (
      <>
        <ArrowRightLeft className="w-5 h-5" aria-hidden="true" />
        Convert to USDT0
      </>
    );
  };

  return (
    <ModalPortal
      isOpen={true}
      onClose={onClose || (() => undefined)}
      zIndex={120}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-[rgb(var(--bg-elevated))] border border-white/[0.06] rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bridge-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-plenmo-500/15 flex items-center justify-center">
              <ArrowRightLeft
                className="w-5 h-5 text-white"
                aria-hidden="true"
              />
            </div>
            <div>
              <h3
                id="bridge-modal-title"
                className="text-xl font-bold text-white"
              >
                Bridge to USDT0
              </h3>
              <p className="text-white/40 text-xs">
                Convert any token to USDT0
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors p-1"
            aria-label="Close bridge modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Connected Wallet Indicator */}
        {hasExternalWallet && externalWallets[0] && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-4 flex items-center gap-2">
            <Check className="w-4 h-4 text-green-400" aria-hidden="true" />
            <span className="text-green-400 text-sm">
              Connected: {externalWallets[0].address.slice(0, 6)}...
              {externalWallets[0].address.slice(-4)}
            </span>
          </div>
        )}

        {/* From Section */}
        <div className="bg-white/5 rounded-2xl p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/50 text-sm" id="from-label">
              From
            </span>
            {/* Chain Selector */}
            <div className="relative">
              <button
                ref={chainButtonRef}
                onClick={() => {
                  setShowChainPicker(!showChainPicker);
                  setShowTokenPicker(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 transition-colors"
                aria-haspopup="listbox"
                aria-expanded={showChainPicker}
                aria-label={`Select chain, currently ${selectedChain.shortName}`}
              >
                <span className="text-white text-sm font-medium">
                  {selectedChain.shortName}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-white/50 transition-transform ${
                    showChainPicker ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              {/* Chain Picker Dropdown */}
              {showChainPicker && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-white/20 rounded-2xl p-2 z-50 max-h-64 overflow-y-auto shadow-xl"
                  role="listbox"
                  aria-label="Select source chain"
                >
                  {POPULAR_SOURCE_CHAINS.map((chain) => (
                    <button
                      key={chain.chainId}
                      onClick={() => {
                        setSelectedChain(chain);
                        setShowChainPicker(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        chain.chainId === selectedChain.chainId
                          ? "bg-plenmo-500/20 text-white"
                          : "hover:bg-white/10 text-white/70"
                      }`}
                      role="option"
                      aria-selected={chain.chainId === selectedChain.chainId}
                    >
                      <span className="font-medium">{chain.name}</span>
                      {chain.chainId === selectedChain.chainId && (
                        <Check
                          className="w-4 h-4 ml-auto text-plenmo-500"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Token + Amount Row */}
          <div className="flex items-center gap-3">
            {/* Token Selector */}
            <div className="relative">
              <button
                ref={tokenButtonRef}
                onClick={() => {
                  setShowTokenPicker(!showTokenPicker);
                  setShowChainPicker(false);
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 transition-colors min-w-[120px]"
                disabled={availableTokens.length === 0}
                aria-haspopup="listbox"
                aria-expanded={showTokenPicker}
                aria-label={`Select token, currently ${
                  selectedToken?.symbol || "none"
                }`}
              >
                {selectedToken ? (
                  <>
                    <span className="text-white font-bold">
                      {selectedToken.symbol}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-white/50 transition-transform ${
                        showTokenPicker ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </>
                ) : (
                  <span className="text-white/50">Select</span>
                )}
              </button>

              {/* Token Picker Dropdown */}
              {showTokenPicker && availableTokens.length > 0 && (
                <div
                  className="absolute left-0 top-full mt-2 w-48 bg-gray-900 border border-white/20 rounded-2xl p-2 z-50 shadow-xl"
                  role="listbox"
                  aria-label="Select source token"
                >
                  {availableTokens.map((token) => (
                    <button
                      key={token.address}
                      onClick={() => {
                        setSelectedToken(token);
                        setShowTokenPicker(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        token.address === selectedToken?.address
                          ? "bg-plenmo-500/20 text-white"
                          : "hover:bg-white/10 text-white/70"
                      }`}
                      role="option"
                      aria-selected={token.address === selectedToken?.address}
                    >
                      <span className="font-medium">{token.symbol}</span>
                      <span className="text-white/40 text-sm truncate">
                        {token.name}
                      </span>
                      {token.address === selectedToken?.address && (
                        <Check
                          className="w-4 h-4 ml-auto text-plenmo-500"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Amount Input */}
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-right text-2xl font-bold text-white placeholder:text-white/30 focus:outline-none"
              aria-label="Amount to bridge"
              aria-describedby="balance-display"
              min="0"
              step="any"
            />
          </div>

          {/* Balance Display */}
          {hasExternalWallet && selectedToken && (
            <div
              id="balance-display"
              className="flex items-center justify-between mt-3 pt-3 border-t border-white/10"
            >
              <span className="text-white/50 text-xs">Your Balance</span>
              <span
                className={`text-xs ${
                  !hasSufficientBalance() && amount
                    ? "text-red-400"
                    : "text-white/70"
                }`}
              >
                {sourceBalance.loading ? (
                  <Loader2
                    className="w-3 h-3 animate-spin inline"
                    aria-label="Loading balance"
                  />
                ) : sourceBalance.balance ? (
                  <>
                    {sourceBalance.balance} {selectedToken.symbol}
                    {!hasSufficientBalance() && amount && (
                      <AlertTriangle
                        className="w-3 h-3 inline ml-1 text-red-400"
                        aria-hidden="true"
                      />
                    )}
                  </>
                ) : (
                  "--"
                )}
              </span>
            </div>
          )}
        </div>

        {/* Arrow */}
        <div className="flex justify-center -my-1 relative z-10">
          <div className="w-10 h-10 rounded-full bg-gray-900 border-4 border-[#1a1a2e] flex items-center justify-center">
            <ChevronDown
              className="w-5 h-5 text-plenmo-500"
              aria-hidden="true"
            />
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
                  <Loader2
                    className="w-5 h-5 animate-spin"
                    aria-label="Loading quote"
                  />
                  <span className="text-white/50 text-lg">
                    Finding best price...
                  </span>
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
                disabled={quote.loading}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh quote"
                aria-label={
                  quote.loading ? "Refreshing quote" : "Refresh quote"
                }
              >
                <RefreshCw
                  className={`w-4 h-4 text-white/50 ${
                    quote.loading ? "animate-spin" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>
            )}
          </div>
        </div>

        {/* Quote Details */}
        {quote.best && (
          <div className="bg-white/5 rounded-2xl p-4 mb-4 space-y-3">
            {/* Quote Expiry Warning */}
            {quoteSecondsLeft <= QUOTE_WARNING_THRESHOLD &&
              quoteSecondsLeft > 0 && (
                <div className="flex items-center gap-2 text-amber-400 text-xs pb-2 border-b border-white/10">
                  <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                  <span>
                    Quote expires in {quoteSecondsLeft}s - prices may change
                  </span>
                </div>
              )}

            {quoteSecondsLeft === 0 && (
              <div className="flex items-center justify-between text-amber-400 text-xs pb-2 border-b border-white/10">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                  Quote expired
                </span>
                <button
                  onClick={fetchQuote}
                  disabled={quote.loading}
                  className="text-plenmo-500 hover:underline disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>
            )}

            {/* Best Route */}
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">Best Route</span>
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">
                  {PROVIDER_LOGOS[quote.best.provider]}
                </span>
                <span className="text-white font-medium">
                  {PROVIDER_NAMES[quote.best.provider]}
                </span>
                {quote.best.provider === "across" && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-yellow-500/20 text-yellow-400 rounded-full">
                    <Zap className="w-3 h-3" aria-hidden="true" />
                    FAST
                  </span>
                )}
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm flex items-center gap-1">
                <Clock className="w-4 h-4" aria-hidden="true" />
                Estimated Time
              </span>
              <span className="text-white">
                {formatTime(quote.best.estimatedTime)}
              </span>
            </div>

            {/* Gas */}
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm flex items-center gap-1">
                <Fuel className="w-4 h-4" aria-hidden="true" />
                Gas Cost
              </span>
              <span className="text-white">${quote.best.gasUsd}</span>
            </div>

            {/* Min Received */}
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">Min. Received</span>
              <span className="text-white">
                ${formatOutputAmount(quote.best.toAmountMin)}
              </span>
            </div>

            {/* View All Quotes */}
            {quote.all.length > 1 && (
              <button
                onClick={() => setShowAllQuotes(!showAllQuotes)}
                className="w-full text-plenmo-500 text-sm hover:underline"
                aria-expanded={showAllQuotes}
              >
                {showAllQuotes ? "Hide" : "View"} all {quote.all.length} routes
              </button>
            )}

            {/* All Quotes */}
            {showAllQuotes && (
              <div
                className="space-y-2 pt-2 border-t border-white/10"
                role="list"
                aria-label="All available routes"
              >
                {quote.all.map((q, idx) => (
                  <div
                    key={`${q.provider}-${idx}`}
                    className={`flex items-center justify-between p-3 rounded-xl ${
                      q.provider === quote.best?.provider
                        ? "bg-plenmo-500/10 border border-plenmo-500/30"
                        : "bg-white/5"
                    }`}
                    role="listitem"
                  >
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true">
                        {PROVIDER_LOGOS[q.provider]}
                      </span>
                      <span className="text-white text-sm">
                        {PROVIDER_NAMES[q.provider]}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">
                        ${formatOutputAmount(q.toAmount)}
                      </div>
                      <div className="text-white/40 text-xs">
                        {formatTime(q.estimatedTime)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {(quote.error || txState.error) && (
          <div className="bg-red-500/10 rounded-xl p-3 mb-4" role="alert">
            <div className="flex items-start gap-2 text-red-400 text-sm">
              <AlertCircle
                className="w-4 h-4 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>{quote.error || txState.error}</span>
            </div>
            {txState.error && (
              <button
                onClick={resetError}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-sm transition-colors"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                Try Again
              </button>
            )}
          </div>
        )}

        {/* Insufficient Balance Warning */}
        {amount && !hasSufficientBalance() && sourceBalance.balance && (
          <div className="bg-amber-500/10 rounded-xl p-3 mb-4" role="alert">
            <div className="flex items-start gap-2 text-amber-400 text-sm">
              <AlertTriangle
                className="w-4 h-4 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>
                Insufficient balance. You have {sourceBalance.balance}{" "}
                {selectedToken?.symbol} but need {amount}.
              </span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={executeBridge}
          disabled={
            !quote.best ||
            quote.loading ||
            (txState.status !== "idle" && txState.status !== "error") ||
            (!hasSufficientBalance() && hasExternalWallet)
          }
          className="w-full clay-button clay-button-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-busy={
            txState.status !== "idle" &&
            txState.status !== "success" &&
            txState.status !== "error"
          }
        >
          {getButtonContent()}
        </button>

        {/* Success View */}
        {txState.status === "success" && txState.txHash && (
          <div className="mt-4 text-center">
            <a
              href={`${selectedChain.explorerUrl}/tx/${txState.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-plenmo-500 hover:underline text-sm"
            >
              View on Explorer
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
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
