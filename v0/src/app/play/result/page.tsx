/**
 * Game Result Page
 * 
 * Displays game results with points earned and multipliers.
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import Link from "next/link";

function GameResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    // Get result from URL params or localStorage
    const resultParam = searchParams.get("result");
    if (resultParam) {
      try {
        setResult(JSON.parse(decodeURIComponent(resultParam)));
      } catch {
        // Invalid result
      }
    } else {
      // Try localStorage
      const stored = localStorage.getItem("lastGameResult");
      if (stored) {
        try {
          setResult(JSON.parse(stored));
        } catch {
          // Invalid result
        }
      }
    }
  }, [searchParams]);

  if (!result) {
    return (
      <main className="xui-container" style={{ paddingTop: 32 }}>
        <Card>
          <div style={{ textAlign: "center", padding: "32px" }}>
            <h2 style={{ marginBottom: "16px" }}>No Game Result</h2>
            <p style={{ opacity: 0.7, marginBottom: "24px" }}>
              No game result found. Play a game to see your results here.
            </p>
            <Link href="/play">
              <Button variant="primary">Play Games</Button>
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="xui-container" style={{ paddingTop: 32 }}>
      <Card>
        <div style={{ textAlign: "center", padding: "32px" }}>
          <div
            style={{
              fontSize: "48px",
              marginBottom: "16px",
            }}
          >
            🎉
          </div>
          <h1 style={{ fontSize: "32px", marginBottom: "8px" }}>Game Complete!</h1>
          <p style={{ opacity: 0.7, marginBottom: "32px" }}>
            Here's how you did
          </p>

          <div
            style={{
              backgroundColor: "#f3f4f6",
              borderRadius: "12px",
              padding: "24px",
              marginBottom: "24px",
            }}
          >
            <div style={{ fontSize: "36px", fontWeight: 700, color: "#60a5fa", marginBottom: "8px" }}>
              {result.points_earned?.toLocaleString() || 0} Points
            </div>
            <div style={{ fontSize: "14px", opacity: 0.7 }}>
              Base Points: {result.base_points || 0}
            </div>
          </div>

          <div style={{ marginBottom: "24px", textAlign: "left", maxWidth: "400px", margin: "0 auto 24px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px" }}>
              Multipliers Applied:
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ opacity: 0.7 }}>Toy Bonus:</span>
                <span style={{ fontWeight: 600 }}>
                  {result.toy_bonus_multiplier?.toFixed(2) || "1.00"}x
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ opacity: 0.7 }}>Daily Bonus:</span>
                <span style={{ fontWeight: 600 }}>
                  {result.daily_bonus_multiplier?.toFixed(2) || "1.00"}x
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ opacity: 0.7 }}>Wager Bonus:</span>
                <span style={{ fontWeight: 600 }}>
                  {result.wager_multiplier?.toFixed(2) || "1.00"}x
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/play">
              <Button variant="primary">Play Again</Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="outline">View Leaderboard</Button>
            </Link>
          </div>
        </div>
      </Card>
    </main>
  );
}

export default function GameResultPage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px", textAlign: "center" }}>Loading...</div>}>
      <GameResultContent />
    </Suspense>
  );
}
