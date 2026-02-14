"use client";

/**
 * ZKP2P On-Ramp V2 Component
 *
 * Provides a beautiful, integrated experience for on-ramping fiat to crypto
 * using ZKP2P's trustless P2P protocol. Supports Venmo, Revolut, Wise, and more.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ExternalLink,
  Shield,
  Zap,
  Clock,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
} from "lucide-react";

const USDT0_ADDRESS = "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb";
const PLASMA_RPC_URL = "https://rpc.plasma.io/v1";
const POLL_INTERVAL = 5000;
const POLL_TIMEOUT = 10 * 60 * 1000; // 10 minutes

async function getUSDT0Balance(address: string): Promise<bigint> {
  const data = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_call",
    params: [
      {
        to: USDT0_ADDRESS,
        data:
          "0x70a08231000000000000000000000000" + address.slice(2).toLowerCase(),
      },
      "latest",
    ],
  };
  const res = await fetch(PLASMA_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  return BigInt(json.result || "0x0");
}

interface ZKP2POnrampV2Props {
  recipientAddress: string;
  onClose?: () => void;
  onSuccess?: () => void;
  defaultAmount?: string;
}

type PaymentMethod =
  | "venmo"
  | "revolut"
  | "wise"
  | "cashapp"
  | "zelle"
  | "paypal";

interface PaymentOption {
  id: PaymentMethod;
  name: string;
  icon: string;
  color: string;
  bgGradient: string;
  currencies: string[];
  popular?: boolean;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: "venmo",
    name: "Venmo",
    icon: "/icons/venmo.svg",
    color: "#008CFF",
    bgGradient: "from-[#008CFF] to-[#0066CC]",
    currencies: ["USD"],
    popular: true,
  },
  {
    id: "zelle",
    name: "Zelle",
    icon: "/icons/zelle.svg",
    color: "#6D1ED4",
    bgGradient: "from-[#6D1ED4] to-[#4A148C]",
    currencies: ["USD"],
    popular: true,
  },
  {
    id: "revolut",
    name: "Revolut",
    icon: "/icons/revolut.svg",
    color: "#0075EB",
    bgGradient: "from-[#0075EB] to-[#0052A3]",
    currencies: ["USD", "EUR", "GBP"],
  },
  {
    id: "wise",
    name: "Wise",
    icon: "/icons/wise.svg",
    color: "#9FE870",
    bgGradient: "from-[#9FE870] to-[#7BC24C]",
    currencies: ["USD", "EUR", "GBP", "AUD"],
  },
  {
    id: "cashapp",
    name: "Cash App",
    icon: "/icons/cashapp.svg",
    color: "#00D632",
    bgGradient: "from-[#00D632] to-[#00A825]",
    currencies: ["USD"],
  },
  {
    id: "paypal",
    name: "PayPal",
    icon: "/icons/paypal.svg",
    color: "#003087",
    bgGradient: "from-[#003087] to-[#001F5C]",
    currencies: ["USD", "EUR", "GBP"],
  },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
};

// Build ZKP2P URL with parameters
function buildZKP2PUrl(params: {
  recipientAddress: string;
  amount?: string;
  currency?: string;
  paymentMethod?: PaymentMethod;
}): string {
  const baseUrl = "https://www.zkp2p.xyz/swap";
  const searchParams = new URLSearchParams({
    tab: "buy",
  });

  // Add recipient if provided (ZKP2P supports custom recipient)
  if (params.recipientAddress) {
    searchParams.set("recipient", params.recipientAddress);
  }

  // Add amount if provided
  if (params.amount) {
    searchParams.set("amount", params.amount);
  }

  // Add currency if provided
  if (params.currency) {
    searchParams.set("currency", params.currency);
  }

  // Add payment method if provided
  if (params.paymentMethod) {
    searchParams.set("paymentMethod", params.paymentMethod);
  }

  return `${baseUrl}?${searchParams.toString()}`;
}

export function ZKP2POnrampV2({
  recipientAddress,
  onClose,
  onSuccess,
  defaultAmount = "",
}: ZKP2POnrampV2Props) {
  const [step, setStep] = useState<
    "amount" | "method" | "redirect" | "waiting"
  >("amount");
  const [amount, setAmount] = useState(defaultAmount);
  const [currency, setCurrency] = useState("USD");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null
  );
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<
    "polling" | "success" | "timeout"
  >("polling");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const preBalanceRef = useRef<bigint>(0n);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Balance polling effect
  useEffect(() => {
    if (step !== "waiting" || pollingStatus !== "polling") return;

    const startTime = Date.now();

    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    pollingRef.current = setInterval(async () => {
      try {
        const currentBalance = await getUSDT0Balance(recipientAddress);
        if (currentBalance > preBalanceRef.current) {
          setPollingStatus("success");
          onSuccess?.();
        }
      } catch {
        // ignore polling errors, keep retrying
      }

      if (Date.now() - startTime > POLL_TIMEOUT) {
        setPollingStatus("timeout");
      }
    }, POLL_INTERVAL);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, pollingStatus, recipientAddress, onSuccess]);

  const handleAmountContinue = useCallback(() => {
    if (!amount || parseFloat(amount) <= 0) return;
    setStep("method");
  }, [amount]);

  const handleMethodSelect = useCallback((method: PaymentMethod) => {
    setSelectedMethod(method);
    setStep("redirect");
  }, []);

  const handleOpenZKP2P = useCallback(async () => {
    setIsRedirecting(true);

    // Snapshot balance before opening ZKP2P
    try {
      preBalanceRef.current = await getUSDT0Balance(recipientAddress);
    } catch {
      preBalanceRef.current = 0n;
    }

    const url = buildZKP2PUrl({
      recipientAddress,
      amount,
      currency,
      paymentMethod: selectedMethod || undefined,
    });

    window.open(url, "_blank", "noopener,noreferrer");

    // Transition to waiting step after brief delay
    setTimeout(() => {
      setIsRedirecting(false);
      setPollingStatus("polling");
      setElapsedSeconds(0);
      setStep("waiting");
    }, 1500);
  }, [recipientAddress, amount, currency, selectedMethod]);

  const handleBack = useCallback(() => {
    if (step === "method") {
      setStep("amount");
    } else if (step === "redirect") {
      setStep("method");
      setSelectedMethod(null);
    }
  }, [step]);

  const selectedPaymentOption = PAYMENT_OPTIONS.find(
    (p) => p.id === selectedMethod
  );

  return (
    <div className="bg-[rgb(var(--bg-elevated))] border border-white/[0.06] rounded-2xl overflow-hidden max-w-md w-full">
      {/* Header */}
      <div className="relative px-6 py-5 border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-plenmo-500/10 to-plenmo-600/10" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step !== "amount" && step !== "waiting" && (
              <button
                onClick={handleBack}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-plenmo-500" />
                Buy with ZKP2P
              </h2>
              <p className="text-white/50 text-sm">
                Instant, trustless on-ramp
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="px-6 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          {["Amount", "Payment", "Pay", "Complete"].map((label, index) => {
            const stepIndex = [
              "amount",
              "method",
              "redirect",
              "waiting",
            ].indexOf(step);
            const isActive = index <= stepIndex;
            const isCurrent = index === stepIndex;
            return (
              <div key={label} className="flex items-center flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isActive
                        ? "bg-plenmo-500 text-white"
                        : "bg-white/10 text-white/40"
                    } ${
                      isCurrent
                        ? "ring-2 ring-plenmo-500/50 ring-offset-2 ring-offset-transparent"
                        : ""
                    }`}
                  >
                    {isActive && index < stepIndex ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isActive ? "text-white" : "text-white/40"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {index < 3 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 rounded ${
                      isActive && index < stepIndex
                        ? "bg-plenmo-500"
                        : "bg-white/10"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Amount */}
          {step === "amount" && (
            <motion.div
              key="amount"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <label className="block text-sm font-medium text-white/70 mb-3">
                How much do you want to add?
              </label>

              {/* Amount Input */}
              <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-white/40 font-medium">
                  {CURRENCY_SYMBOLS[currency]}
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-24 text-2xl font-bold text-white placeholder-white/30 focus:border-plenmo-500/50 focus:ring-2 focus:ring-plenmo-500/20 focus:outline-none transition-all"
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm font-medium text-white focus:outline-none focus:border-plenmo-500/50"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                {["25", "50", "100", "250"].map((quickAmount) => (
                  <button
                    key={quickAmount}
                    onClick={() => setAmount(quickAmount)}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      amount === quickAmount
                        ? "bg-plenmo-500 text-white"
                        : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
                    }`}
                  >
                    {CURRENCY_SYMBOLS[currency]}
                    {quickAmount}
                  </button>
                ))}
              </div>

              {/* Info Box */}
              <div className="bg-plenmo-500/10 border border-plenmo-500/20 rounded-2xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-plenmo-500/20">
                    <Shield className="w-5 h-5 text-plenmo-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">
                      Zero fees, instant transfer
                    </p>
                    <p className="text-white/60 text-sm mt-0.5">
                      You&apos;ll receive ~{CURRENCY_SYMBOLS[currency]}
                      {amount || "0"} in USDC
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAmountContinue}
                disabled={!amount || parseFloat(amount) <= 0}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-plenmo-500 to-plenmo-600 text-white font-semibold text-lg transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continue
                <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {/* Step 2: Payment Method */}
          {step === "method" && (
            <motion.div
              key="method"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Amount Summary */}
              <div className="bg-white/5 rounded-2xl p-4 mb-5 border border-white/10">
                <p className="text-white/50 text-sm">You&apos;re adding</p>
                <p className="text-2xl font-bold text-white">
                  {CURRENCY_SYMBOLS[currency]}
                  {amount} {currency}
                </p>
              </div>

              <p className="text-sm font-medium text-white/70 mb-4">
                Select payment method
              </p>

              {/* Popular Methods */}
              <div className="space-y-2 mb-4">
                {PAYMENT_OPTIONS.filter(
                  (p) => p.popular && p.currencies.includes(currency)
                ).map((payment) => (
                  <button
                    key={payment.id}
                    onClick={() => handleMethodSelect(payment.id)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-plenmo-500/50 hover:bg-white/10 transition-all group"
                  >
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${payment.bgGradient} flex items-center justify-center flex-shrink-0`}
                    >
                      <span className="text-2xl font-bold text-white">
                        {payment.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">
                          {payment.name}
                        </p>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-plenmo-500/20 text-plenmo-400 rounded-full">
                          POPULAR
                        </span>
                      </div>
                      <p className="text-white/50 text-sm">
                        Pay with {payment.name}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-plenmo-500 transition-colors" />
                  </button>
                ))}
              </div>

              {/* Other Methods */}
              <p className="text-xs font-medium text-white/40 mb-3 uppercase tracking-wider">
                More options
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_OPTIONS.filter(
                  (p) => !p.popular && p.currencies.includes(currency)
                ).map((payment) => (
                  <button
                    key={payment.id}
                    onClick={() => handleMethodSelect(payment.id)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-plenmo-500/50 hover:bg-white/10 transition-all"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${payment.bgGradient} flex items-center justify-center flex-shrink-0`}
                    >
                      <span className="text-sm font-bold text-white">
                        {payment.name.charAt(0)}
                      </span>
                    </div>
                    <span className="font-medium text-white text-sm">
                      {payment.name}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 3: Redirect */}
          {step === "redirect" && selectedPaymentOption && (
            <motion.div
              key="redirect"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              {/* Selected Method Display */}
              <div className="mb-6">
                <div
                  className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${selectedPaymentOption.bgGradient} flex items-center justify-center mb-4`}
                >
                  <span className="text-3xl font-bold text-white">
                    {selectedPaymentOption.name.charAt(0)}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">
                  Pay with {selectedPaymentOption.name}
                </h3>
                <p className="text-white/50">
                  {CURRENCY_SYMBOLS[currency]}
                  {amount} {currency} → USDC
                </p>
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                  <p className="text-xs text-white/70">60 seconds</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <Shield className="w-5 h-5 text-green-400 mx-auto mb-1" />
                  <p className="text-xs text-white/70">Zero fraud</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <p className="text-xs text-white/70">Non-custodial</p>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={handleOpenZKP2P}
                disabled={isRedirecting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-plenmo-500 to-plenmo-600 text-white font-semibold text-lg transition-all hover:opacity-90 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isRedirecting ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Opening ZKP2P...
                  </>
                ) : (
                  <>
                    Continue to ZKP2P
                    <ExternalLink className="w-5 h-5" />
                  </>
                )}
              </button>

              {/* Info Note */}
              <div className="mt-4 flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-white/40">
                  You&apos;ll be redirected to ZKP2P to complete your purchase.
                  Funds will be sent directly to your Plenmo wallet.
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 4: Waiting for balance */}
          {step === "waiting" && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              {pollingStatus === "polling" && (
                <>
                  <div className="mb-6">
                    <Loader2 className="w-16 h-16 text-plenmo-500 mx-auto mb-4 animate-spin" />
                    <h3 className="text-xl font-bold text-white mb-1">
                      Waiting for payment
                    </h3>
                    <p className="text-white/50">
                      Complete your payment on ZKP2P, then come back here.
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 mb-4 border border-white/10">
                    <p className="text-white/50 text-sm">Elapsed time</p>
                    <p className="text-lg font-bold text-white">
                      {Math.floor(elapsedSeconds / 60)}:
                      {String(elapsedSeconds % 60).padStart(2, "0")}
                    </p>
                  </div>
                  <p className="text-xs text-white/40">
                    Checking your wallet balance every 5 seconds...
                  </p>
                </>
              )}

              {pollingStatus === "success" && (
                <>
                  <div className="mb-6">
                    <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-1">
                      Payment received!
                    </h3>
                    <p className="text-white/50">
                      {CURRENCY_SYMBOLS[currency]}
                      {amount} USDT0 has arrived in your wallet.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold text-lg transition-all hover:opacity-90"
                  >
                    Done
                  </button>
                </>
              )}

              {pollingStatus === "timeout" && (
                <>
                  <div className="mb-6">
                    <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-1">
                      Still waiting
                    </h3>
                    <p className="text-white/50">
                      We haven&apos;t detected a balance change yet. Your
                      payment may still be processing on ZKP2P.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setPollingStatus("polling");
                      setElapsedSeconds(0);
                    }}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-plenmo-500 to-plenmo-600 text-white font-semibold text-lg transition-all hover:opacity-90"
                  >
                    Keep waiting
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-center gap-2 text-xs text-white/40">
          <Shield className="w-3.5 h-3.5" />
          <span>Powered by ZKP2P</span>
          <span className="text-white/20">|</span>
          <span>Zero-knowledge verified</span>
        </div>
      </div>
    </div>
  );
}

export default ZKP2POnrampV2;
