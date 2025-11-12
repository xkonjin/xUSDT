/**
 * Player Onboarding Page
 * 
 * Guides new players through:
 * - Wallet connection
 * - Nickname registration
 * - Tutorial
 * - First toy purchase prompt
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { connectWallet, getCurrentAccount } from "../../lib/wallet";

function OnboardContent() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [account, setAccount] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    checkWallet();
  }, []);

  const checkWallet = async () => {
    try {
      const addr = await getCurrentAccount();
      setAccount(addr);
      if (addr) {
        // Check if player already registered
        const response = await fetch(`/api/game/players/${addr}`);
        if (response.ok) {
          const player = await response.json();
          if (player.nickname) {
            // Already onboarded, redirect
            router.push("/play");
          } else {
            setStep(2); // Skip to nickname step
          }
        }
      }
    } catch {
      // Wallet not connected
    }
  };

  const handleConnectWallet = async () => {
    try {
      const addr = await connectWallet();
      setAccount(addr);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
    }
  };

  const handleRegister = async () => {
    if (!nickname || nickname.length < 3 || nickname.length > 20) {
      setError("Nickname must be between 3 and 20 characters");
      return;
    }

    if (!account) {
      setError("Please connect your wallet first");
      return;
    }

    setRegistering(true);
    setError("");

    try {
      const response = await fetch("/api/game/players/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: account,
          nickname,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Registration failed");
      }

      setStep(3);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <main className="xui-container" style={{ paddingTop: 32, maxWidth: "600px", margin: "0 auto" }}>
      {/* Step 1: Connect Wallet */}
      {step === 1 && (
        <Card>
          <div style={{ textAlign: "center", padding: "32px" }}>
            <h1 style={{ fontSize: "28px", marginBottom: "12px" }}>
              Welcome to Trillionaire Toy Store!
            </h1>
            <p style={{ opacity: 0.7, marginBottom: "24px" }}>
              Connect your Rabby wallet to get started
            </p>
            {error && (
              <div style={{ color: "#ef4444", marginBottom: "16px", padding: "12px", backgroundColor: "#fee", borderRadius: "8px" }}>
                {error}
              </div>
            )}
            <Button onClick={handleConnectWallet} variant="primary" style={{ minWidth: "200px" }}>
              Connect Rabby Wallet
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Set Nickname */}
      {step === 2 && (
        <Card>
          <div style={{ padding: "32px" }}>
            <h2 style={{ fontSize: "24px", marginBottom: "12px" }}>Choose Your Nickname</h2>
            <p style={{ opacity: 0.7, marginBottom: "24px" }}>
              Pick a unique nickname that other players will see on the leaderboard
            </p>
            {error && (
              <div style={{ color: "#ef4444", marginBottom: "16px", padding: "12px", backgroundColor: "#fee", borderRadius: "8px" }}>
                {error}
              </div>
            )}
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter nickname (3-20 characters)"
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                marginBottom: "16px",
              }}
              maxLength={20}
            />
            <div style={{ display: "flex", gap: "12px" }}>
              <Button onClick={() => setStep(1)} variant="outline">
                Back
              </Button>
              <Button
                onClick={handleRegister}
                variant="primary"
                disabled={registering || nickname.length < 3}
                style={{ flex: 1 }}
              >
                {registering ? "Registering..." : "Continue"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Tutorial */}
      {step === 3 && (
        <Card>
          <div style={{ padding: "32px" }}>
            <h2 style={{ fontSize: "24px", marginBottom: "24px" }}>How to Play</h2>
            
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
                1. Buy Toys
              </h3>
              <p style={{ opacity: 0.7 }}>
                Visit the store to purchase rare toy NFTs. Each toy has unique stats and rarity.
              </p>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
                2. Equip Toys
              </h3>
              <p style={{ opacity: 0.7 }}>
                Equip up to 3 toys in your inventory to boost your game performance.
              </p>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
                3. Play Games
              </h3>
              <p style={{ opacity: 0.7 }}>
                Play skill and chance games to earn points. Toys and daily bonuses multiply your points!
              </p>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
                4. Climb Leaderboard
              </h3>
              <p style={{ opacity: 0.7 }}>
                Compete for weekly prizes in USDT0. Top 3 players win each week!
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
              <Button onClick={() => router.push("/store")} variant="outline" style={{ flex: 1 }}>
                Visit Store
              </Button>
              <Button onClick={() => router.push("/play")} variant="primary" style={{ flex: 1 }}>
                Start Playing
              </Button>
            </div>
          </div>
        </Card>
      )}
    </main>
  );
}

export default function OnboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px", textAlign: "center" }}>Loading...</div>}>
      <OnboardContent />
    </Suspense>
  );
}
