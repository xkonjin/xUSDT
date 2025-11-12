/**
 * My Predictions Page
 * 
 * Mobile-friendly page showing user's prediction history and status.
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { getCurrentAccount, connectWallet } from "../../../lib/wallet";

interface Prediction {
  id: string;
  market_id: string;
  market_question: string;
  outcome: string;
  bet_amount_usdt0: number;
  status: string;
  created_at: string;
  resolved_at?: string;
  outcome_result?: string;
  profit_loss?: number;
  resolved_price?: number;
}

function MyPredictionsContent() {
  const router = useRouter();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkWallet();
  }, []);

  useEffect(() => {
    if (account) {
      loadPredictions();
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

  const loadPredictions = async () => {
    if (!account) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/polymarket/predictions?user_address=${account}&limit=100`);
      
      if (!response.ok) {
        throw new Error("Failed to load predictions");
      }

      const data = await response.json();
      setPredictions(data);
    } catch (err) {
      console.error("Error loading predictions:", err);
      setError(err instanceof Error ? err.message : "Failed to load predictions");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const formatAmount = (amount: number) => {
    return (amount / 1_000_000).toFixed(2);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "#f59e0b",
      placed: "#3b82f6",
      filled: "#10b981",
      resolved: "#10b981",
      cancelled: "#ef4444",
      failed: "#ef4444",
    };
    return colors[status] || "#6b7280";
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (!account) {
    return (
      <main className="xui-container" style={{ paddingTop: 32, paddingBottom: 80 }}>
        <Card>
          <div style={{ padding: "32px 16px", textAlign: "center" }}>
            <p style={{ color: "var(--palantir-text-secondary)", marginBottom: "16px" }}>
              Connect your wallet to view your predictions
            </p>
            <Button
              onClick={async () => {
                const addr = await connectWallet();
                setAccount(addr);
              }}
              variant="primary"
            >
              Connect Wallet
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="xui-container" style={{ paddingTop: 32, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ marginBottom: "40px", textAlign: "center" }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: "12px", letterSpacing: "-0.02em", color: "var(--palantir-text-primary)" }}>
          My Predictions
        </h1>
        <p style={{ color: "var(--palantir-text-secondary)", fontSize: "16px" }}>
          Your betting history and results
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: "center", padding: "48px 16px" }}>
          <p style={{ color: "var(--palantir-text-secondary)" }}>Loading predictions...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card style={{ marginBottom: "24px", borderColor: "#ef4444" }}>
          <div style={{ padding: "16px", textAlign: "center" }}>
            <p style={{ color: "#ef4444", marginBottom: "12px" }}>{error}</p>
            <Button onClick={loadPredictions} variant="outline" style={{ fontSize: "14px" }}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Predictions List */}
      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {predictions.length === 0 ? (
            <Card>
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <p style={{ color: "var(--palantir-text-secondary)", marginBottom: "16px" }}>No predictions yet</p>
                <Button
                  onClick={() => router.push("/predictions")}
                  variant="primary"
                >
                  Browse Markets
                </Button>
              </div>
            </Card>
          ) : (
            predictions.map((prediction) => (
              <Card key={prediction.id}>
                <div style={{ padding: "20px" }}>
                  {/* Market Question */}
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      marginBottom: "12px",
                      lineHeight: "1.4",
                      color: "var(--palantir-text-primary)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {prediction.market_question}
                  </h3>

                  {/* Prediction Details */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "12px" }}>
                    <div>
                      <span style={{ color: "var(--palantir-text-muted)", fontSize: "13px" }}>Outcome: </span>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--palantir-text-primary)" }}>
                        {prediction.outcome}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "var(--palantir-text-muted)", fontSize: "13px" }}>Amount: </span>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--palantir-text-primary)" }}>
                        {formatAmount(prediction.bet_amount_usdt0)} USDT0
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: getStatusColor(prediction.status),
                      }}
                    />
                    <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--palantir-text-primary)" }}>
                      {getStatusLabel(prediction.status)}
                    </span>
                    {prediction.resolved_at && (
                      <span style={{ fontSize: "12px", color: "var(--palantir-text-muted)", marginLeft: "auto" }}>
                        {formatDate(prediction.resolved_at)}
                      </span>
                    )}
                  </div>

                  {/* Result */}
                  {prediction.status === "resolved" && prediction.profit_loss !== undefined && (
                    <div
                      style={{
                        padding: "12px",
                        borderRadius: "8px",
                        background: prediction.profit_loss >= 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        border: `1px solid ${prediction.profit_loss >= 0 ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                        marginTop: "12px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "13px", color: "var(--palantir-text-secondary)" }}>Result:</span>
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: prediction.profit_loss >= 0 ? "#10b981" : "#ef4444",
                          }}
                        >
                          {prediction.profit_loss >= 0 ? "+" : ""}
                          {formatAmount(prediction.profit_loss * 1_000_000)} USDT0
                        </span>
                      </div>
                      {prediction.outcome_result && (
                        <div style={{ fontSize: "12px", color: "var(--palantir-text-muted)", marginTop: "4px" }}>
                          Outcome: {prediction.outcome_result}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Created Date */}
                  <div style={{ fontSize: "12px", color: "var(--palantir-text-muted)", marginTop: "12px" }}>
                    Placed: {formatDate(prediction.created_at)}
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

export default function MyPredictionsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MyPredictionsContent />
    </Suspense>
  );
}

