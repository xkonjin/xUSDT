/**
 * Prediction Interface Page
 * 
 * Mobile-first interface for placing predictions/bets on Polymarket markets.
 * Features large touch targets, clear outcome selection, and amount input.
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { getCurrentAccount, connectWallet } from "../../../lib/wallet";

interface Market {
  id: string;
  question: string;
  description?: string;
  end_date?: string;
  outcomes?: string[];
  token_id?: string;
}

function PredictionContent() {
  const router = useRouter();
  const params = useParams();
  const marketId = params.marketId as string;

  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<string | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<{ 
    usdc_balance: number; 
    usdc_balance_formatted: number; 
    pending_deposits: number;
    max_bet_amount?: number;
    max_bet_amount_formatted?: number;
  } | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  useEffect(() => {
    loadMarket();
    checkWallet();
  }, [marketId]);

  useEffect(() => {
    if (account) {
      loadBalance();
    }
  }, [account]);

  const checkWallet = async () => {
    try {
      const addr = await getCurrentAccount();
      setAccount(addr);
    } catch {
      // Wallet not connected
    }
  };

  const loadBalance = async () => {
    if (!account) return;
    
    try {
      setLoadingBalance(true);
      const response = await fetch(`/api/polymarket/balance?userAddress=${account}`);
      
      if (response.ok) {
        const data = await response.json();
        setBalance(data);
      }
    } catch (err) {
      console.error("Error loading balance:", err);
    } finally {
      setLoadingBalance(false);
    }
  };

  const loadMarket = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/polymarket/markets/${marketId}`);
      
      if (!response.ok) {
        throw new Error("Failed to load market");
      }

      const data = await response.json();
      setMarket(data);
    } catch (err) {
      console.error("Error loading market:", err);
      setError(err instanceof Error ? err.message : "Failed to load market");
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBet = async () => {
    if (!account) {
      const addr = await connectWallet();
      if (!addr) {
        setError("Wallet connection required");
        return;
      }
      setAccount(addr);
      return;
    }

    if (!selectedOutcome) {
      setError("Please select an outcome");
      return;
    }

    const amount = parseFloat(betAmount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid bet amount");
      return;
    }

    // Convert to atomic units (6 decimals for USDC)
    const amountAtomic = Math.floor(amount * 1_000_000);

    // Check balance
    if (!balance || balance.usdc_balance < amountAtomic) {
      setError(`Insufficient balance. You have $${balance?.usdc_balance_formatted.toFixed(2) || "0.00"} USDC. Please deposit first.`);
      return;
    }

    // Check max bet limit (liquidity buffer)
    const maxBet = balance.max_bet_amount || balance.usdc_balance;
    if (amountAtomic > maxBet) {
      const maxBetFormatted = balance.max_bet_amount_formatted || balance.usdc_balance_formatted;
      setError(
        `Bet amount exceeds global maximum: $${amount.toFixed(2)} USDC. ` +
        `Maximum bet is $${maxBetFormatted.toFixed(2)} USDC. ` +
        `This limit is set by the global liquidity buffer.`
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/polymarket/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_address: account,
          market_id: marketId,
          market_question: market?.question || "",
          outcome: selectedOutcome,
          bet_amount_usdc: amountAtomic,
          token_id: market?.token_id || marketId, // Fallback to marketId if token_id not available
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error || "Failed to place bet");
      }

      const result = await response.json();
      
      // Reload balance after bet
      await loadBalance();
      
      // Redirect to predictions page
      router.push("/predictions/my");
    } catch (err) {
      console.error("Error placing bet:", err);
      setError(err instanceof Error ? err.message : "Failed to place bet");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "TBD";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { 
        month: "long", 
        day: "numeric", 
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <main className="xui-container" style={{ paddingTop: 32, paddingBottom: 80 }}>
        <div style={{ textAlign: "center", padding: "48px 16px" }}>
          <p style={{ color: "var(--palantir-text-secondary)" }}>Loading market...</p>
        </div>
      </main>
    );
  }

  if (!market) {
    return (
      <main className="xui-container" style={{ paddingTop: 32, paddingBottom: 80 }}>
        <Card>
          <div style={{ padding: "32px 16px", textAlign: "center" }}>
            <p style={{ color: "var(--palantir-text-secondary)", marginBottom: "16px" }}>Market not found</p>
            <Button onClick={() => router.push("/predictions")} variant="outline">
              Back to Markets
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  const outcomes = market.outcomes || ["YES", "NO"];

  return (
    <main className="xui-container" style={{ paddingTop: 32, paddingBottom: 80 }}>
      {/* Back Button */}
      <Button
        onClick={() => router.back()}
        variant="outline"
        style={{ marginBottom: "24px", minWidth: "auto", padding: "8px 16px" }}
      >
        ← Back
      </Button>

      {/* Balance Display */}
      {account && (
        <Card style={{ marginBottom: "24px", background: balance && balance.usdc_balance > 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)", border: balance && balance.usdc_balance > 0 ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)" }}>
          <div style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: balance && balance.max_bet_amount && balance.max_bet_amount < balance.usdc_balance ? "12px" : "0" }}>
              <div>
                <p style={{ fontSize: "12px", color: "var(--palantir-text-secondary)", marginBottom: "6px", fontWeight: 500 }}>Your Balance</p>
                <p style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--palantir-text-primary)" }}>
                  {loadingBalance ? "..." : `$${balance?.usdc_balance_formatted.toFixed(2) || "0.00"} USDC`}
                </p>
                {balance && balance.pending_deposits > 0 && (
                  <p style={{ fontSize: "12px", color: "#f59e0b", marginTop: "6px", fontWeight: 500 }}>
                    ${(balance.pending_deposits / 1_000_000).toFixed(2)} converting...
                  </p>
                )}
              </div>
              {(!balance || balance.usdc_balance === 0) && (
                <Button
                  onClick={() => router.push("/predictions/deposit")}
                  variant="primary"
                  style={{ minWidth: "auto", padding: "10px 20px", fontSize: "14px" }}
                >
                  Deposit
                </Button>
              )}
            </div>
            {/* Max Bet Limit Warning */}
            {balance && balance.max_bet_amount && balance.max_bet_amount < balance.usdc_balance && (
              <div style={{ 
                padding: "12px", 
                background: "rgba(59, 130, 246, 0.1)", 
                borderRadius: "8px", 
                border: "1px solid rgba(59, 130, 246, 0.2)",
                marginTop: "12px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "14px" }}>⚠️</span>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--palantir-text-primary)", margin: 0 }}>
                    Max Bet: ${balance.max_bet_amount_formatted?.toFixed(2) || (balance.max_bet_amount / 1_000_000).toFixed(2)} USDC
                  </p>
                </div>
                <p style={{ fontSize: "12px", color: "var(--palantir-text-secondary)", margin: 0 }}>
                  Limited by global liquidity buffer
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Market Question */}
      <Card style={{ marginBottom: "24px" }}>
        <div style={{ padding: "24px" }}>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 700,
              marginBottom: "12px",
              lineHeight: "1.4",
              letterSpacing: "-0.02em",
              color: "var(--palantir-text-primary)",
            }}
          >
            {market.question}
          </h1>
          {market.description && (
            <p style={{ color: "var(--palantir-text-secondary)", fontSize: "14px", marginBottom: "12px" }}>
              {market.description}
            </p>
          )}
          {market.end_date && (
            <p style={{ color: "var(--palantir-text-muted)", fontSize: "13px" }}>
              Closes: {formatDate(market.end_date)}
            </p>
          )}
        </div>
      </Card>

      {/* Outcome Selection - Large Touch Targets */}
      <Card style={{ marginBottom: "24px" }}>
        <div style={{ padding: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "var(--palantir-text-primary)", letterSpacing: "-0.01em" }}>
            Select Your Prediction
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {outcomes.map((outcome) => (
              <button
                key={outcome}
                onClick={() => {
                  setSelectedOutcome(outcome);
                  setError(null);
                }}
                style={{
                  padding: "20px",
                  borderRadius: "12px",
                  border: selectedOutcome === outcome ? "2px solid var(--palantir-blue)" : "1px solid var(--palantir-border)",
                  background: selectedOutcome === outcome ? "rgba(59, 130, 246, 0.1)" : "var(--palantir-gray-light)",
                  fontSize: "18px",
                  fontWeight: 600,
                  cursor: "pointer",
                  minHeight: "64px", // Large touch target
                  transition: "all 0.2s",
                  textAlign: "center",
                  color: selectedOutcome === outcome ? "var(--palantir-blue)" : "var(--palantir-text-primary)",
                }}
                onTouchStart={(e) => {
                  e.currentTarget.style.transform = "scale(0.98)";
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                {outcome}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Bet Amount Input */}
      <Card style={{ marginBottom: "24px" }}>
        <div style={{ padding: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "var(--palantir-text-primary)", letterSpacing: "-0.01em" }}>
            Bet Amount (USDC)
          </h2>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={betAmount}
            onChange={(e) => {
              setBetAmount(e.target.value);
              setError(null);
            }}
            style={{
              width: "100%",
              padding: "16px",
              fontSize: "20px",
              fontWeight: 600,
              border: balance && balance.max_bet_amount && parseFloat(betAmount || "0") > (balance.max_bet_amount / 1_000_000) ? "2px solid #ef4444" : "1px solid var(--palantir-border)",
              background: "var(--palantir-gray-light)",
              color: "var(--palantir-text-primary)",
              borderRadius: "12px",
              minHeight: "56px", // Large touch target
              textAlign: "center",
              fontFamily: "'Inter', sans-serif",
            }}
            min="0"
            max={balance?.max_bet_amount_formatted || balance?.usdc_balance_formatted}
            step="0.01"
          />
          <div style={{ marginTop: "8px", textAlign: "center" }}>
            <p style={{ color: "var(--palantir-text-muted)", fontSize: "13px", marginBottom: "4px" }}>
              Minimum: 0.01 USDC
            </p>
            {balance && balance.max_bet_amount && (
              <p style={{ color: "var(--palantir-blue)", fontSize: "13px", fontWeight: 500 }}>
                Maximum: ${balance.max_bet_amount_formatted?.toFixed(2) || (balance.max_bet_amount / 1_000_000).toFixed(2)} USDC
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <Card style={{ marginBottom: "24px", borderColor: "#ef4444" }}>
          <div style={{ padding: "16px", textAlign: "center" }}>
            <p style={{ color: "#ef4444", fontSize: "14px", fontWeight: 500 }}>{error}</p>
          </div>
        </Card>
      )}

      {/* Submit Button */}
      <Button
        variant="primary"
        onClick={handlePlaceBet}
        disabled={submitting || !selectedOutcome || !betAmount}
        style={{
          width: "100%",
          minHeight: "56px", // Large touch target
          fontSize: "18px",
          fontWeight: 600,
          marginBottom: "16px",
          letterSpacing: "-0.01em",
        }}
      >
        {!account
          ? "Connect Wallet"
          : submitting
          ? "Placing Bet..."
          : `Place Bet: $${betAmount || "0"} USDC`}
      </Button>

      {/* Info */}
      <div style={{ textAlign: "center", color: "var(--palantir-text-muted)" }}>
        <p style={{ fontSize: "12px", color: "var(--palantir-text-muted)" }}>
          Your bet will be placed instantly using your USDC balance
        </p>
      </div>
    </main>
  );
}

export default function PredictionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PredictionContent />
    </Suspense>
  );
}

