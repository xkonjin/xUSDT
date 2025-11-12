/**
 * Prediction Leaderboard Page
 * 
 * Mobile-friendly leaderboard showing user rankings by prediction accuracy.
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

interface LeaderboardEntry {
  rank: number;
  user_address: string;
  display_name?: string;
  total_predictions: number;
  correct_predictions: number;
  accuracy_percentage: number;
  total_volume_usdt0: number;
  total_profit_loss: number;
}

function LeaderboardContent() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>("alltime");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/polymarket/leaderboard?period=${period}&limit=100`);
      
      if (!response.ok) {
        throw new Error("Failed to load leaderboard");
      }

      const data = await response.json();
      setLeaderboard(data);
    } catch (err) {
      console.error("Error loading leaderboard:", err);
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getDisplayName = (entry: LeaderboardEntry) => {
    return entry.display_name || formatAddress(entry.user_address);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(2)}M`;
    if (volume >= 1_000) return `$${(volume / 1_000).toFixed(2)}K`;
    return `$${(volume / 1_000_000).toFixed(2)}`;
  };

  const formatPnl = (pnl: number) => {
    const sign = pnl >= 0 ? "+" : "";
    return `${sign}${formatVolume(pnl * 1_000_000)}`;
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const periods = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "alltime", label: "All Time" },
  ];

  return (
    <main className="xui-container" style={{ paddingTop: 32, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ marginBottom: "40px", textAlign: "center" }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: "12px", letterSpacing: "-0.02em", color: "var(--palantir-text-primary)" }}>
          Leaderboard
        </h1>
        <p style={{ color: "var(--palantir-text-secondary)", fontSize: "16px" }}>
          Top predictors by accuracy
        </p>
      </div>

      {/* Period Selector */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
        {periods.map((p) => (
          <Button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            variant={period === p.value ? "primary" : "outline"}
            style={{
              minWidth: "auto",
              padding: "10px 16px",
              fontSize: "14px",
            }}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: "center", padding: "48px 16px" }}>
          <p style={{ color: "var(--palantir-text-secondary)" }}>Loading leaderboard...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card style={{ marginBottom: "24px", borderColor: "#ef4444" }}>
          <div style={{ padding: "16px", textAlign: "center" }}>
            <p style={{ color: "#ef4444", marginBottom: "12px" }}>{error}</p>
            <Button onClick={loadLeaderboard} variant="outline" style={{ fontSize: "14px" }}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Leaderboard */}
      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {leaderboard.length === 0 ? (
            <Card>
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <p style={{ color: "var(--palantir-text-secondary)" }}>No rankings yet</p>
              </div>
            </Card>
          ) : (
            leaderboard.map((entry) => (
              <Card
                key={entry.user_address}
                style={{
                  padding: "20px",
                  borderLeft: entry.rank <= 3 ? "4px solid var(--palantir-blue)" : "4px solid transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  {/* Rank */}
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: 700,
                      minWidth: "40px",
                      textAlign: "center",
                    }}
                  >
                    {getRankEmoji(entry.rank)}
                  </div>

                  {/* User Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px", color: "var(--palantir-text-primary)", letterSpacing: "-0.01em" }}>
                      {getDisplayName(entry)}
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--palantir-text-secondary)" }}>
                      {entry.correct_predictions}/{entry.total_predictions} correct
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: 600,
                        color: entry.accuracy_percentage >= 50 ? "#10b981" : "#ef4444",
                        marginBottom: "4px",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {entry.accuracy_percentage.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--palantir-text-secondary)" }}>
                      {formatPnl(entry.total_profit_loss)}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </main>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LeaderboardContent />
    </Suspense>
  );
}

