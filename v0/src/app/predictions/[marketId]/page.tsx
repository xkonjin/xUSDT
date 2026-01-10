/**
 * Market Detail and Prediction Page
 *
 * Mobile-first interface for viewing a single prediction market
 * and placing predictions. Features large touch targets for outcome
 * selection and amount input.
 *
 * Features:
 * - Market details (question, description, end date)
 * - Outcome selection (Yes/No buttons)
 * - Amount input with USDT0 formatting
 * - Submit prediction to backend
 * - Mock order confirmation
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

// Use shared utilities (DRY - eliminates duplicate code)
import { formatDate, formatVolume, displayToAtomic } from "../../../lib/format";
import {
  MOCK_WALLET_ADDRESS,
  IS_DEMO_MODE,
  MIN_BET_AMOUNT_DISPLAY,
} from "../../../lib/polymarket-config";

// =============================================================================
// Types
// =============================================================================

interface MarketOutcome {
  outcome_id: string;
  name: string;
  price: number;
}

interface Market {
  id: string;
  question: string;
  description?: string;
  end_date?: string;
  outcomes: MarketOutcome[];
  volume?: number;
  liquidity?: number;
  active: boolean;
  category?: string;
}

interface PredictionResponse {
  success: boolean;
  prediction?: {
    id: string;
    market_id: string;
    outcome: string;
    amount: number;
    status: string;
  };
  mock_order_id?: string;
  message: string;
  error?: string;
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function MarketDetailPage() {
  const params = useParams();
  const marketId = params.marketId as string;

  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prediction form state
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>("1.00");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<PredictionResponse | null>(null);

  // Fetch market details with AbortController for cleanup
  const loadMarket = useCallback(async (signal?: AbortSignal) => {
    if (!marketId) return;

    try {
      setError(null);
      const response = await fetch(
        `/api/polymarket/markets/${encodeURIComponent(marketId)}`,
        { signal }
      );

      // Check if request was aborted
      if (signal?.aborted) return;

      if (response.status === 404) {
        setError("Market not found");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load market");
      }

      const data = await response.json();
      setMarket(data);
    } catch (err) {
      // Ignore abort errors (component unmounted)
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load market");
    } finally {
      setLoading(false);
    }
  }, [marketId]);

  useEffect(() => {
    const controller = new AbortController();
    loadMarket(controller.signal);

    // Cleanup: abort fetch on unmount
    return () => controller.abort();
  }, [loadMarket]);

  // Handle prediction submission
  const handleSubmit = async () => {
    if (!selectedOutcome || !market) {
      setError("Please select an outcome");
      return;
    }

    const amountFloat = parseFloat(amount);
    if (isNaN(amountFloat) || amountFloat < MIN_BET_AMOUNT_DISPLAY) {
      setError(`Minimum bet is ${MIN_BET_AMOUNT_DISPLAY} USDT0`);
      return;
    }

    // Convert to atomic units using BigInt for precision (avoids JS floating-point issues)
    const amountAtomic = displayToAtomic(amount);

    setSubmitting(true);
    setError(null);
    setSubmitResult(null);

    try {
      const response = await fetch("/api/polymarket/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_address: MOCK_WALLET_ADDRESS,
          market_id: market.id,
          market_question: market.question,
          outcome: selectedOutcome,
          // Convert BigInt to Number for JSON (safe for reasonable bet sizes)
          amount: Number(amountAtomic),
        }),
      });

      // Handle non-JSON error responses gracefully
      let data: PredictionResponse;
      try {
        data = await response.json();
      } catch {
        throw new Error("Server returned an invalid response");
      }

      setSubmitResult(data);

      if (data.success) {
        // Reset form after successful submission
        setSelectedOutcome(null);
        setAmount("1.00");
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit prediction");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ padding: "48px 0", textAlign: "center" }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{
            width: "32px",
            height: "32px",
            border: "3px solid var(--xui-border)",
            borderTopColor: "var(--xui-primary)",
            borderRadius: "50%",
            margin: "0 auto 16px",
          }}
        />
        <p style={{ opacity: 0.7 }}>Loading market...</p>
      </div>
    );
  }

  // Error state (market not found)
  if (error && !market) {
    return (
      <div style={{ padding: "48px 0", textAlign: "center" }}>
        <Card>
          <h3 style={{ color: "#ef4444", marginBottom: "12px" }}>Error</h3>
          <p style={{ opacity: 0.7, marginBottom: "16px" }}>{error}</p>
          <Link href="/predictions">
            <Button variant="outline">← Back to Markets</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!market) return null;

  return (
    <div style={{ padding: "24px 0 48px" }}>
      {/* Back Link */}
      <Link
        href="/predictions"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "24px",
          opacity: 0.7,
          fontSize: "14px",
        }}
      >
        ← Back to Markets
      </Link>

      {/* Market Question */}
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          fontSize: "28px",
          fontWeight: 700,
          lineHeight: 1.3,
          marginBottom: "16px",
          letterSpacing: "-0.02em",
        }}
      >
        {market.question}
      </motion.h1>

      {/* Market Description */}
      {market.description && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{
            opacity: 0.7,
            marginBottom: "24px",
            lineHeight: 1.5,
          }}
        >
          {market.description}
        </motion.p>
      )}

      {/* Market Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        style={{
          display: "flex",
          gap: "24px",
          marginBottom: "32px",
          fontSize: "14px",
        }}
      >
        <span>
          <strong>Volume:</strong> {formatVolume(market.volume)}
        </span>
        <span>
          <strong>Ends:</strong> {formatDate(market.end_date)}
        </span>
        {market.category && (
          <span>
            <strong>Category:</strong> {market.category}
          </span>
        )}
      </motion.div>

      {/* Prediction Form */}
      <Card title="Make a Prediction" subtitle="Select your outcome and bet amount">
        {/* Success Message */}
        {submitResult?.success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              padding: "16px",
              marginBottom: "24px",
              borderRadius: "12px",
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            <h4 style={{ color: "#10b981", marginBottom: "8px" }}>
              ✓ Prediction Submitted!
            </h4>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              {submitResult.message}
            </p>
            {submitResult.mock_order_id && (
              <p style={{ fontSize: "12px", opacity: 0.6, marginTop: "8px" }}>
                Mock Order ID: {submitResult.mock_order_id}
              </p>
            )}
            <div style={{ marginTop: "16px" }}>
              <Link href="/predictions/my">
                <Button variant="outline">View My Predictions</Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: "12px 16px",
              marginBottom: "16px",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#ef4444",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        {/* Outcome Selection */}
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              marginBottom: "12px",
              opacity: 0.8,
            }}
          >
            Select Outcome
          </label>
          <div style={{ display: "flex", gap: "12px" }}>
            {market.outcomes.map((outcome) => {
              const isYes = outcome.name.toLowerCase() === "yes";
              const isSelected = selectedOutcome === outcome.name;
              const baseColor = isYes ? "#10b981" : "#ef4444";

              return (
                <motion.button
                  key={outcome.outcome_id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedOutcome(outcome.name)}
                  style={{
                    flex: 1,
                    padding: "20px",
                    borderRadius: "16px",
                    border: isSelected
                      ? `2px solid ${baseColor}`
                      : "2px solid var(--xui-border)",
                    background: isSelected
                      ? `${baseColor}20`
                      : "transparent",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      fontSize: "32px",
                      fontWeight: 700,
                      color: isSelected ? baseColor : "inherit",
                    }}
                  >
                    {Math.round(outcome.price * 100)}%
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      marginTop: "4px",
                      color: isSelected ? baseColor : "inherit",
                    }}
                  >
                    {outcome.name}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Amount Input */}
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              marginBottom: "8px",
              opacity: 0.8,
            }}
          >
            Bet Amount (USDT0)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={MIN_BET_AMOUNT_DISPLAY}
            step="0.01"
            placeholder="1.00"
            className="xui-input"
            style={{ fontSize: "18px", padding: "14px 16px" }}
          />
          <p
            style={{
              fontSize: "12px",
              opacity: 0.5,
              marginTop: "6px",
            }}
          >
            Minimum: {MIN_BET_AMOUNT_DISPLAY} USDT0 • {IS_DEMO_MODE ? "This is a mock prediction for testing" : ""}
          </p>
        </div>

        {/* Submit Button */}
        <Button
          variant="primary"
          fullWidth
          onClick={handleSubmit}
          disabled={!selectedOutcome || submitting}
          style={{
            padding: "16px",
            fontSize: "16px",
            fontWeight: 600,
          }}
        >
          {submitting
            ? "Submitting..."
            : selectedOutcome
              ? `Predict ${selectedOutcome} for ${amount} USDT0`
              : "Select an Outcome"}
        </Button>
      </Card>

      {/* Demo Notice */}
      {IS_DEMO_MODE && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            marginTop: "24px",
            padding: "16px",
            borderRadius: "12px",
            background: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.2)",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          <strong>Demo Mode:</strong> This is a mock prediction system for testing.
          No real orders are placed on Polymarket. Wallet address is simulated.
        </motion.div>
      )}
    </div>
  );
}
