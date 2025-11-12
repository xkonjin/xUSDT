/**
 * Predictions Market Browser Page
 * 
 * Mobile-first interface for browsing Polymarket prediction markets.
 * Features swipeable cards, pull-to-refresh, and touch-friendly interactions.
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import Link from "next/link";

interface Market {
  id: string;
  question: string;
  description?: string;
  end_date?: string;
  volume?: number;
  liquidity?: number;
  outcomes?: string[];
  active?: boolean;
}

function PredictionsContent() {
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMarkets();
  }, []);

  const loadMarkets = async () => {
    try {
      setError(null);
      const response = await fetch("/api/polymarket/markets?active=true&limit=50");
      
      if (!response.ok) {
        throw new Error("Failed to load markets");
      }

      const data = await response.json();
      // Handle both array and object responses
      const marketsList = Array.isArray(data) ? data : (data.markets || []);
      setMarkets(marketsList);
    } catch (err) {
      console.error("Error loading markets:", err);
      setError(err instanceof Error ? err.message : "Failed to load markets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMarkets();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "TBD";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateString;
    }
  };

  const formatVolume = (volume?: number) => {
    if (!volume) return "$0";
    if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
    if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
    return `$${volume.toFixed(0)}`;
  };

  if (loading) {
    return (
      <main className="xui-container" style={{ paddingTop: 32, paddingBottom: 80 }}>
        <div style={{ textAlign: "center", padding: "48px 16px" }}>
              <p style={{ color: "var(--palantir-text-secondary)" }}>Loading markets...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="xui-container" style={{ paddingTop: 32, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ marginBottom: "40px", textAlign: "center", position: "relative" }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: "12px", letterSpacing: "-0.02em", color: "var(--palantir-text-primary)" }}>
          Prediction Markets
        </h1>
        <p style={{ color: "var(--palantir-text-secondary)", fontSize: "16px", marginBottom: "20px" }}>
          Compete on prediction accuracy
        </p>
        <Button
          onClick={handleRefresh}
          variant="outline"
          style={{ position: "absolute", top: 0, right: 0, minWidth: "auto", padding: "8px 16px" }}
          disabled={refreshing}
        >
          {refreshing ? "..." : "↻"}
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card style={{ marginBottom: "24px", borderColor: "#ef4444" }}>
          <div style={{ padding: "16px", textAlign: "center" }}>
            <p style={{ color: "#ef4444", marginBottom: "12px" }}>{error}</p>
            <Button onClick={loadMarkets} variant="outline" style={{ fontSize: "14px" }}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Markets List - Mobile-First Swipeable Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {markets.length === 0 && !loading && (
          <Card>
            <div style={{ padding: "32px 16px", textAlign: "center" }}>
              <p style={{ color: "var(--palantir-text-secondary)" }}>No active markets found</p>
            </div>
          </Card>
        )}

        {markets.map((market) => (
          <Card
            key={market.id}
            style={{
              cursor: "pointer",
              transition: "transform 0.2s, box-shadow 0.2s",
              touchAction: "pan-y",
            }}
            onClick={() => router.push(`/predictions/${market.id}`)}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.98)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = "scale(0.98)";
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <div style={{ padding: "20px" }}>
              {/* Market Question */}
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  marginBottom: "12px",
                  lineHeight: "1.4",
                  color: "var(--palantir-text-primary)",
                  letterSpacing: "-0.01em",
                }}
              >
                {market.question || market.id}
              </h3>

              {/* Market Info */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "16px" }}>
                {market.end_date && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: "var(--palantir-text-muted)", fontSize: "14px" }}>📅</span>
                    <span style={{ fontSize: "14px", color: "var(--palantir-text-secondary)" }}>
                      {formatDate(market.end_date)}
                    </span>
                  </div>
                )}
                {market.volume !== undefined && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: "var(--palantir-text-muted)", fontSize: "14px" }}>💰</span>
                    <span style={{ fontSize: "14px", color: "var(--palantir-text-secondary)" }}>
                      {formatVolume(market.volume)}
                    </span>
                  </div>
                )}
              </div>

              {/* Outcomes */}
              {market.outcomes && market.outcomes.length > 0 && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                  {market.outcomes.slice(0, 2).map((outcome, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: "6px 12px",
                        background: "var(--palantir-gray-light)",
                        border: "1px solid var(--palantir-border)",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "var(--palantir-text-primary)",
                      }}
                    >
                      {outcome}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Button */}
              <Button
                variant="primary"
                style={{
                  width: "100%",
                  minHeight: "44px", // Touch-friendly minimum height
                  fontSize: "16px",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/predictions/${market.id}`);
                }}
              >
                Make Prediction →
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Bottom Navigation Hint */}
      <div style={{ marginTop: "32px", textAlign: "center", color: "var(--palantir-text-muted)" }}>
        <p style={{ fontSize: "12px" }}>
          Swipe cards to view • Pull down to refresh
        </p>
      </div>
    </main>
  );
}

export default function PredictionsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PredictionsContent />
    </Suspense>
  );
}

