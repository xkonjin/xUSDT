/**
 * My Predictions Page
 *
 * Mobile-first interface showing the user's prediction history.
 * Displays all predictions made by the user with status indicators.
 *
 * Features:
 * - List of user predictions
 * - Status badges (active, won, lost)
 * - Bet amounts and outcomes
 * - Link back to market
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

// Use shared utilities (DRY - eliminates duplicate code)
import { formatDateTime, getStatusColors } from "../../../lib/format";
import { MOCK_WALLET_ADDRESS, IS_DEMO_MODE } from "../../../lib/polymarket-config";

// =============================================================================
// Types
// =============================================================================

interface Prediction {
  id: string;
  user_address: string;
  market_id: string;
  market_question: string;
  outcome: string;
  amount: number;
  amount_formatted: number;
  created_at: string;
  status: string;
  mock_order_id?: string;
}

// =============================================================================
// Prediction Card Component
// =============================================================================

interface PredictionCardProps {
  prediction: Prediction;
  index: number;
}

function PredictionCard({ prediction, index }: PredictionCardProps) {
  const statusColors = getStatusColors(prediction.status);
  const isYes = prediction.outcome.toLowerCase() === "yes";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card>
        {/* Status Badge */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              background: statusColors.bg,
              color: statusColors.text,
              border: `1px solid ${statusColors.border}`,
            }}
          >
            {prediction.status}
          </span>
          <span style={{ fontSize: "12px", opacity: 0.5 }}>
            {formatDateTime(prediction.created_at)}
          </span>
        </div>

        {/* Market Question */}
        <Link href={`/predictions/${encodeURIComponent(prediction.market_id)}`}>
          <h3
            style={{
              fontSize: "15px",
              fontWeight: 600,
              lineHeight: 1.4,
              marginBottom: "16px",
              cursor: "pointer",
            }}
          >
            {prediction.market_question}
          </h3>
        </Link>

        {/* Prediction Details */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            alignItems: "center",
          }}
        >
          {/* Outcome */}
          <div
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              background: isYes
                ? "rgba(16, 185, 129, 0.1)"
                : "rgba(239, 68, 68, 0.1)",
              border: `1px solid ${isYes ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
            }}
          >
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: isYes ? "#10b981" : "#ef4444",
              }}
            >
              {prediction.outcome}
            </div>
          </div>

          {/* Amount */}
          <div>
            <div style={{ fontSize: "12px", opacity: 0.6 }}>Bet Amount</div>
            <div style={{ fontSize: "18px", fontWeight: 600 }}>
              {prediction.amount_formatted.toFixed(2)} USDT0
            </div>
          </div>
        </div>

        {/* Mock Order ID */}
        {prediction.mock_order_id && (
          <div
            style={{
              marginTop: "12px",
              fontSize: "11px",
              opacity: 0.4,
            }}
          >
            Order: {prediction.mock_order_id}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function MyPredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user predictions
  const loadPredictions = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(
        `/api/polymarket/predictions?user_address=${MOCK_WALLET_ADDRESS}&limit=100`
      );

      if (!response.ok) {
        throw new Error("Failed to load predictions");
      }

      const data = await response.json();
      // Handle both array and object responses
      const predictionsList = Array.isArray(data) ? data : data.predictions || [];
      setPredictions(predictionsList);
    } catch (err) {
      console.error("Error loading predictions:", err);
      setError(err instanceof Error ? err.message : "Failed to load predictions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPredictions();
  }, [loadPredictions]);

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
        <p style={{ opacity: 0.7 }}>Loading your predictions...</p>
      </div>
    );
  }

  // Calculate stats
  const totalPredictions = predictions.length;
  const activePredictions = predictions.filter((p) => p.status === "active").length;
  const totalVolume = predictions.reduce((sum, p) => sum + (p.amount_formatted || 0), 0);

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

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: "32px" }}
      >
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 700,
            marginBottom: "8px",
            letterSpacing: "-0.02em",
          }}
        >
          My Predictions
        </h1>
        <p style={{ opacity: 0.7 }}>Track your prediction history and performance</p>
      </motion.header>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
          marginBottom: "32px",
        }}
      >
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            background: "var(--xui-card)",
            border: "1px solid var(--xui-border)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "24px", fontWeight: 700 }}>{totalPredictions}</div>
          <div style={{ fontSize: "12px", opacity: 0.6 }}>Total</div>
        </div>
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            background: "var(--xui-card)",
            border: "1px solid var(--xui-border)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#3b82f6" }}>
            {activePredictions}
          </div>
          <div style={{ fontSize: "12px", opacity: 0.6 }}>Active</div>
        </div>
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            background: "var(--xui-card)",
            border: "1px solid var(--xui-border)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "24px", fontWeight: 700 }}>{totalVolume.toFixed(2)}</div>
          <div style={{ fontSize: "12px", opacity: 0.6 }}>USDT0</div>
        </div>
      </motion.div>

      {/* Error Message */}
      {error && (
        <Card>
          <div style={{ textAlign: "center", padding: "16px" }}>
            <p style={{ color: "#ef4444", marginBottom: "12px" }}>{error}</p>
            <Button variant="outline" onClick={() => loadPredictions()}>
              Try Again
            </Button>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!error && predictions.length === 0 && (
        <Card>
          <div style={{ textAlign: "center", padding: "32px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
            <h3 style={{ marginBottom: "8px" }}>No Predictions Yet</h3>
            <p style={{ opacity: 0.7, marginBottom: "20px" }}>
              Start making predictions on active markets
            </p>
            <Link href="/predictions">
              <Button variant="primary">Browse Markets</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Predictions List */}
      {predictions.length > 0 && (
        <div style={{ display: "grid", gap: "16px" }}>
          {predictions.map((prediction, index) => (
            <PredictionCard key={prediction.id} prediction={prediction} index={index} />
          ))}
        </div>
      )}

      {/* Demo Notice */}
      {IS_DEMO_MODE && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            marginTop: "32px",
            padding: "16px",
            borderRadius: "12px",
            background: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.2)",
            fontSize: "13px",
            lineHeight: 1.5,
            textAlign: "center",
          }}
        >
          <strong>Demo Mode:</strong> Predictions are stored in-memory and will reset
          when the server restarts. Using mock wallet address.
        </motion.div>
      )}
    </div>
  );
}
