/**
 * Leaderboard Page
 * 
 * Displays player rankings for weekly/monthly/all-time periods.
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

type Period = "weekly" | "monthly" | "alltime";

interface LeaderboardEntry {
  rank: number;
  wallet_address: string;
  nickname: string | null;
  points: number;
}

function LeaderboardContent() {
  const [period, setPeriod] = useState<Period>("weekly");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/game/leaderboard?period=${period}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  };

  return (
    <main className="xui-container" style={{ paddingTop: 32 }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 className="xui-card-title" style={{ fontSize: 28, marginBottom: "8px" }}>
          Leaderboard
        </h1>
        <p style={{ opacity: 0.7, fontSize: "14px" }}>
          Top players competing for weekly prizes
        </p>
      </div>

      {/* Period Tabs */}
      <Card style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Button
            onClick={() => setPeriod("weekly")}
            variant={period === "weekly" ? "primary" : "outline"}
          >
            Weekly
          </Button>
          <Button
            onClick={() => setPeriod("monthly")}
            variant={period === "monthly" ? "primary" : "outline"}
          >
            Monthly
          </Button>
          <Button
            onClick={() => setPeriod("alltime")}
            variant={period === "alltime" ? "primary" : "outline"}
          >
            All Time
          </Button>
        </div>
      </Card>

      {/* Leaderboard */}
      <Card>
        {loading ? (
          <div style={{ textAlign: "center", padding: "32px" }}>Loading...</div>
        ) : leaderboard.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px", opacity: 0.6 }}>
            No players yet. Be the first to play!
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: 600 }}>Rank</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: 600 }}>Player</th>
                  <th style={{ padding: "12px", textAlign: "right", fontSize: "14px", fontWeight: 600 }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <tr
                    key={entry.wallet_address}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      backgroundColor: index < 3 ? "rgba(96, 165, 250, 0.05)" : undefined,
                    }}
                  >
                    <td style={{ padding: "12px", fontSize: "16px", fontWeight: index < 3 ? 600 : 400 }}>
                      {index === 0 && "🥇"}
                      {index === 1 && "🥈"}
                      {index === 2 && "🥉"}
                      {index >= 3 && `#${entry.rank}`}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: 500 }}>
                        {entry.nickname || formatAddress(entry.wallet_address)}
                      </div>
                      {entry.nickname && (
                        <div style={{ fontSize: "12px", opacity: 0.6 }}>
                          {formatAddress(entry.wallet_address)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontWeight: 600 }}>
                      {entry.points.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Prize Info */}
      <Card style={{ marginTop: "24px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px" }}>
          Weekly Prizes
        </h3>
        <p style={{ opacity: 0.7, fontSize: "14px", marginBottom: "12px" }}>
          Top 3 players each week receive USDT0 prizes from merchant fees.
        </p>
        <div style={{ fontSize: "14px" }}>
          <div>🥇 1st Place: 50% of weekly fees</div>
          <div>🥈 2nd Place: 30% of weekly fees</div>
          <div>🥉 3rd Place: 20% of weekly fees</div>
        </div>
      </Card>
    </main>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px", textAlign: "center" }}>Loading...</div>}>
      <LeaderboardContent />
    </Suspense>
  );
}
