/**
 * Game Wrapper Component
 * 
 * Common wrapper for all game types that handles:
 * - Game state management
 * - Challenge fetching
 * - Result submission
 * - Error handling
 */

"use client";

import { useState, useEffect, ReactNode } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

interface GameWrapperProps {
  gameType: string;
  gameName: string;
  children: (props: GameWrapperChildProps) => ReactNode;
  onComplete?: (result: any) => void;
}

export interface GameWrapperChildProps {
  challengeId: string;
  seed: number;
  difficulty: number;
  startTime: number;
  onSubmitResult: (result: any) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

export function GameWrapper({
  gameType,
  gameName,
  children,
  onComplete,
}: GameWrapperProps) {
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [seed, setSeed] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<number>(1);
  const [startTime, setStartTime] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    // Get wallet address
    const checkWallet = async () => {
      try {
        const eth = (window as any).ethereum;
        if (eth) {
          const accounts = await eth.request({ method: "eth_accounts" });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          }
        }
      } catch {
        // Wallet not connected
      }
    };
    checkWallet();
  }, []);

  const startGame = async (difficultyLevel: number = 1) => {
    if (!account) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      setError(null);
      const response = await fetch("/api/game/games/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_address: account,
          game_type: gameType,
          difficulty: difficultyLevel,
          wager_type: "none", // Can be extended to support wagering
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start game");
      }

      const challenge = await response.json();
      setChallengeId(challenge.challenge_id);
      setSeed(challenge.seed);
      setDifficulty(difficultyLevel);
      setStartTime(Date.now());
    } catch (err: any) {
      setError(err.message || "Failed to start game");
    }
  };

  const submitResult = async (result: any) => {
    if (!challengeId) {
      setError("No active challenge");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/game/games/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: challengeId,
          result_data: {
            ...result,
            time_ms: Date.now() - startTime,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit result");
      }

      const gameResult = await response.json();
      
      if (onComplete) {
        onComplete(gameResult);
        // Store result for result page
        localStorage.setItem("lastGameResult", JSON.stringify(gameResult));
        // Navigate to result page
        window.location.href = `/play/result?result=${encodeURIComponent(JSON.stringify(gameResult))}`;
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit result");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!challengeId) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "32px" }}>
          <h2 style={{ marginBottom: "16px" }}>{gameName}</h2>
          <p style={{ opacity: 0.7, marginBottom: "24px" }}>
            Select difficulty level to start
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            {[1, 2, 3, 4, 5].map((level) => (
              <Button
                key={level}
                onClick={() => startGame(level)}
                variant="primary"
                disabled={!account}
              >
                Level {level}
              </Button>
            ))}
          </div>
          {!account && (
            <p style={{ marginTop: "16px", fontSize: "14px", opacity: 0.6 }}>
              Connect your wallet to play
            </p>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      {error && (
        <div style={{ padding: "12px", marginBottom: "16px", backgroundColor: "#fee", color: "#c00", borderRadius: "8px" }}>
          {error}
        </div>
      )}
      {children({
        challengeId,
        seed,
        difficulty,
        startTime,
        onSubmitResult: submitResult,
        isSubmitting,
        error,
      })}
    </Card>
  );
}
