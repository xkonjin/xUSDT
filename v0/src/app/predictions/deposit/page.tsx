/**
 * Deposit Page
 * 
 * Mobile-first deposit interface using x402 payment protocol.
 * Users can deposit USDT0 which gets converted to USDC in the background.
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { connectWallet, getCurrentAccount } from "../../../lib/wallet";
import { formatUnits, parseUnits } from "ethers";

function DepositContent() {
  const router = useRouter();
  const [account, setAccount] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>("10");
  const [depositing, setDepositing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [depositId, setDepositId] = useState<string | null>(null);

  useEffect(() => {
    checkWallet();
  }, []);

  const checkWallet = async () => {
    try {
      const addr = await getCurrentAccount();
      setAccount(addr);
    } catch {
      // Wallet not connected
    }
  };

  const handleDeposit = async () => {
    if (!account) {
      try {
        const addr = await connectWallet();
        setAccount(addr);
        if (!addr) {
          setError("Please connect your wallet to deposit");
          return;
        }
      } catch (err) {
        setError(`Wallet connection failed: ${err instanceof Error ? err.message : String(err)}`);
        return;
      }
    }

    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid deposit amount");
      return;
    }

    setDepositing(true);
    setError(null);
    setSuccess(false);

    try {
      // Convert to atomic units (6 decimals for USDT0)
      const amountAtomic = parseUnits(depositAmount, 6).toString();

      // Generate x402 payment invoice
      // In a real implementation, this would use the x402 payment flow
      // For now, we'll call the deposit endpoint directly
      const response = await fetch("/api/polymarket/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "payment-submitted",
          invoiceId: `deposit-${Date.now()}`,
          chosenOption: {
            network: "plasma",
            chainId: 369,
            token: process.env.NEXT_PUBLIC_USDT0_ADDRESS || "0x0000000000000000000000000000000000000000",
            tokenSymbol: "USDT0",
            amount: amountAtomic,
            decimals: 6,
            from: account,
            to: process.env.NEXT_PUBLIC_MERCHANT_ADDRESS || "0x0000000000000000000000000000000000000000",
            scheme: "eip3009-transfer-with-auth",
            nonce: `0x${Math.random().toString(16).slice(2).padStart(64, "0")}`,
            deadline: Math.floor(Date.now() / 1000) + 600,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.error || "Failed to process deposit");
      }

      const result = await response.json();
      setSuccess(true);
      setDepositId(result.receipt?.deposit_id || null);
      
      // Redirect to predictions page after 2 seconds
      setTimeout(() => {
        router.push("/predictions");
      }, 2000);
    } catch (err) {
      console.error("Error processing deposit:", err);
      setError(err instanceof Error ? err.message : "Failed to process deposit");
    } finally {
      setDepositing(false);
    }
  };

  return (
    <main className="xui-container" style={{ paddingTop: 32, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ marginBottom: "40px", textAlign: "center" }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: "12px", letterSpacing: "-0.02em", color: "var(--palantir-text-primary)" }}>
          Deposit USDT0
        </h1>
        <p style={{ color: "var(--palantir-text-secondary)", fontSize: 16 }}>
          Deposit USDT0 to start betting. Conversion to USDC happens automatically.
        </p>
      </div>

      {/* Wallet Connection */}
      {!account && (
        <Card style={{ marginBottom: "24px", background: "rgba(59, 130, 246, 0.05)", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
          <div style={{ padding: "24px", textAlign: "center" }}>
            <p style={{ color: "var(--palantir-text-secondary)", marginBottom: "16px", fontSize: 15 }}>
              Connect your wallet to deposit
            </p>
            <Button onClick={checkWallet} variant="primary" style={{ minWidth: "200px" }}>
              Connect Wallet
            </Button>
          </div>
        </Card>
      )}

      {/* Deposit Form */}
      {account && !success && (
        <>
          <Card style={{ marginBottom: "24px" }}>
            <div style={{ padding: "24px" }}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: "8px", color: "var(--palantir-text-secondary)" }}>
                  Your Wallet
                </label>
                <p style={{ fontSize: 14, color: "var(--palantir-text-secondary)", fontFamily: "monospace" }}>
                  {account.slice(0, 6)}...{account.slice(-4)}
                </p>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: "8px", color: "var(--palantir-text-secondary)" }}>
                  Deposit Amount (USDT0)
                </label>
                <Input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => {
                    setDepositAmount(e.target.value);
                    setError(null);
                  }}
                  placeholder="10.00"
                  min="0.01"
                  step="0.01"
                  style={{ fontSize: 20, fontWeight: 600, textAlign: "center", padding: "16px" }}
                />
                <p style={{ fontSize: 12, color: "var(--palantir-text-muted)", marginTop: "8px", textAlign: "center" }}>
                  Minimum: 0.01 USDT0
                </p>
              </div>

              <div style={{ padding: "16px", background: "rgba(59, 130, 246, 0.05)", borderRadius: "8px", marginBottom: "20px", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: 13, color: "var(--palantir-text-secondary)" }}>You deposit:</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--palantir-text-primary)" }}>{depositAmount} USDT0</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "var(--palantir-text-secondary)" }}>You receive:</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--palantir-text-primary)" }}>~{depositAmount} USDC</span>
                </div>
                <p style={{ fontSize: 11, color: "var(--palantir-text-muted)", marginTop: "8px", textAlign: "center" }}>
                  Conversion happens automatically in the background
                </p>
              </div>

              {error && (
                <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", marginBottom: "16px" }}>
                  <p style={{ color: "#ef4444", fontSize: 13, textAlign: "center" }}>{error}</p>
                </div>
              )}

              <Button
                onClick={handleDeposit}
                variant="primary"
                disabled={depositing || !depositAmount}
                style={{ width: "100%", minHeight: "56px", fontSize: 16, fontWeight: 600 }}
              >
                {depositing ? "Processing Deposit..." : "Deposit USDT0"}
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* Success State */}
      {success && (
        <Card style={{ marginBottom: "24px", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
          <div style={{ padding: "32px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: "16px" }}>✓</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: "8px", color: "var(--palantir-text-primary)", letterSpacing: "-0.01em" }}>
              Deposit Successful!
            </h2>
            <p style={{ color: "var(--palantir-text-secondary)", fontSize: 14, marginBottom: "16px" }}>
              Your deposit is being converted to USDC. You'll be able to bet shortly.
            </p>
            {depositId && (
              <p style={{ fontSize: 12, color: "var(--palantir-text-muted)", fontFamily: "monospace" }}>
                ID: {depositId.slice(0, 8)}...
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Back Button */}
      <div style={{ textAlign: "center", marginTop: "24px" }}>
        <Button onClick={() => router.back()} variant="outline" style={{ minWidth: "120px" }}>
          ← Back
        </Button>
      </div>
    </main>
  );
}

export default function DepositPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DepositContent />
    </Suspense>
  );
}

