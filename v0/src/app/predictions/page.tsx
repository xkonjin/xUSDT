/**
 * Predictions Markets Browser Page
 *
 * Mobile-first interface for browsing Polymarket prediction markets.
 * Displays active markets with current pricing, volume, and quick access
 * to place predictions.
 *
 * Features:
 * - Market cards with outcome prices
 * - Volume and liquidity indicators
 * - Click to navigate to market detail/prediction page
 * - Pull-to-refresh (on mobile)
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

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
  image_url?: string;
}

interface MarketsResponse {
  markets: Market[];
  total: number;
  limit: number;
  offset: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format a date string into a human-readable format
 */
function formatDate(dateString?: string): string {
  if (!dateString) return "TBD";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

/**
 * Format volume/liquidity values with K/M suffixes
 */
function formatVolume(volume?: number): string {
  if (!volume) return "$0";
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
  return `$${volume.toFixed(0)}`;
}

/**
 * Format a probability as a percentage
 */
function formatProbability(price: number): string {
  return `${Math.round(price * 100)}%`;
}

// =============================================================================
// Market Card Component
// =============================================================================

interface MarketCardProps {
  market: Market;
  index: number;
}

function MarketCard({ market, index }: MarketCardProps) {
  const router = useRouter();

  // Get Yes and No outcomes (or first two outcomes)
  const yesOutcome = market.outcomes.find((o) => o.name.toLowerCase() === "yes") || market.outcomes[0];
  const noOutcome = market.outcomes.find((o) => o.name.toLowerCase() === "no") || market.outcomes[1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={() => router.push(`/predictions/${encodeURIComponent(market.id)}`)}
      style={{ cursor: "pointer" }}
    >
      <Card>
        {/* Market Question */}
        <h3
          style={{
            fontSize: "16px",
            fontWeight: 600,
            lineHeight: 1.4,
            marginBottom: "12px",
          }}
        >
          {market.question}
        </h3>

        {/* Outcome Prices */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          {/* Yes Probability */}
          {yesOutcome && (
            <div
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "12px",
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#10b981",
                }}
              >
                {formatProbability(yesOutcome.price)}
              </div>
              <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "4px" }}>
                {yesOutcome.name}
              </div>
            </div>
          )}

          {/* No Probability */}
          {noOutcome && (
            <div
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "12px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#ef4444",
                }}
              >
                {formatProbability(noOutcome.price)}
              </div>
              <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "4px" }}>
                {noOutcome.name}
              </div>
            </div>
          )}
        </div>

        {/* Market Stats */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            opacity: 0.6,
          }}
        >
          <span>Volume: {formatVolume(market.volume)}</span>
          <span>Ends: {formatDate(market.end_date)}</span>
        </div>
      </Card>
    </motion.div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function PredictionsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch markets from the API
  const loadMarkets = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/polymarket/markets?active=true&limit=50");

      if (!response.ok) {
        throw new Error("Failed to load markets");
      }

      const data: MarketsResponse = await response.json();
      // Handle both array and object responses
      const marketsList = Array.isArray(data) ? data : data.markets || [];
      setMarkets(marketsList);
    } catch (err) {
      console.error("Error loading markets:", err);
      setError(err instanceof Error ? err.message : "Failed to load markets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMarkets();
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
        <p style={{ opacity: 0.7 }}>Loading prediction markets...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ padding: "48px 0", textAlign: "center" }}>
        <Card>
          <h3 style={{ color: "#ef4444", marginBottom: "12px" }}>Error Loading Markets</h3>
          <p style={{ opacity: 0.7, marginBottom: "16px" }}>{error}</p>
          <Button variant="outline" onClick={handleRefresh}>
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 0 48px" }}>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: "center", marginBottom: "32px" }}
      >
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 700,
            marginBottom: "8px",
            letterSpacing: "-0.02em",
          }}
        >
          Prediction Markets
        </h1>
        <p style={{ opacity: 0.7, marginBottom: "20px" }}>
          Compete on prediction accuracy with USDT0
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </Button>
          <Link href="/predictions/my">
            <Button variant="primary">My Predictions</Button>
          </Link>
        </div>
      </motion.header>

      {/* Markets Grid */}
      {markets.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "32px" }}>
            <p style={{ opacity: 0.7 }}>No active markets found</p>
          </div>
        </Card>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "16px",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          }}
        >
          <AnimatePresence>
            {markets.map((market, index) => (
              <MarketCard key={market.id} market={market} index={index} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Footer Stats */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          marginTop: "32px",
          textAlign: "center",
          fontSize: "12px",
          opacity: 0.5,
        }}
      >
        {markets.length} active markets • Data from Polymarket
      </motion.footer>
    </div>
  );
}

