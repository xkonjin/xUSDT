/**
 * Wheel Spin Game Component
 * 
 * Chance-based game - spin the wheel for multipliers.
 */

"use client";

import { useState } from "react";
import { GameWrapper, GameWrapperChildProps } from "./GameWrapper";
import { Button } from "../ui/Button";

const SEGMENTS = 8;
const MULTIPLIERS = [1.0, 1.5, 2.0, 2.5, 3.0];

function WheelSpinGameContent(props: GameWrapperChildProps) {
  const { seed, onSubmitResult, isSubmitting } = props;
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ segment: number; multiplier: number } | null>(null);

  const spinWheel = () => {
    if (spinning) return;

    setSpinning(true);

    // Use seed for deterministic but random result
    const rng = (seed: number) => {
      let value = seed;
      return () => {
        value = (value * 9301 + 49297) % 233280;
        return value / 233280;
      };
    };

    const random = rng(seed);
    const segment = Math.floor(random() * SEGMENTS) + 1;
    const multiplier = MULTIPLIERS[Math.floor(random() * MULTIPLIERS.length)];

    // Simulate spinning animation
    setTimeout(() => {
      setResult({ segment, multiplier });
      setSpinning(false);

      // Submit result
      onSubmitResult({
        segment,
        multiplier,
      });
    }, 2000);
  };

  return (
    <div style={{ textAlign: "center", padding: "32px" }}>
      <h3 style={{ marginBottom: "16px" }}>Wheel Spin</h3>
      <p style={{ opacity: 0.7, marginBottom: "24px" }}>
        Spin the wheel for multipliers!
      </p>

      <div
        style={{
          width: "300px",
          height: "300px",
          margin: "0 auto 24px",
          borderRadius: "50%",
          backgroundColor: spinning ? "#f3f4f6" : "#e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "24px",
          fontWeight: 600,
          border: "4px solid #d1d5db",
          position: "relative",
          transition: spinning ? "transform 2s" : "none",
          transform: spinning ? "rotate(3600deg)" : "rotate(0deg)",
        }}
      >
        {spinning ? (
          <div>Spinning...</div>
        ) : result ? (
          <div>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>
              {result.multiplier}x
            </div>
            <div style={{ fontSize: "14px", opacity: 0.7 }}>
              Segment {result.segment}
            </div>
          </div>
        ) : (
          <div style={{ opacity: 0.5 }}>Ready to spin</div>
        )}
      </div>

      {!result && (
        <Button
          onClick={spinWheel}
          variant="primary"
          disabled={spinning || isSubmitting}
        >
          {spinning ? "Spinning..." : "Spin Wheel"}
        </Button>
      )}

      {result && (
        <div>
          <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
            You got: {result.multiplier}x multiplier!
          </div>
          {isSubmitting && (
            <p style={{ opacity: 0.7 }}>Calculating points...</p>
          )}
        </div>
      )}
    </div>
  );
}

export function WheelSpinGame() {
  return (
    <GameWrapper
      gameType="wheel_spin"
      gameName="Wheel Spin"
      onComplete={(result) => {
        console.log("Game completed:", result);
      }}
    >
      {(props) => <WheelSpinGameContent {...props} />}
    </GameWrapper>
  );
}

