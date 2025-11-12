/**
 * Precision Click Game Component
 * 
 * Player clicks numbers in sequence as fast as possible.
 * Skill-based game requiring precision and speed.
 */

"use client";

import { useState, useEffect } from "react";
import { GameWrapper, GameWrapperChildProps } from "./GameWrapper";
import { Button } from "../ui/Button";

function PrecisionClickGameContent(props: GameWrapperChildProps) {
  const { seed, difficulty, onSubmitResult, isSubmitting } = props;
  const [sequence, setSequence] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);

  // Generate sequence based on seed
  useEffect(() => {
    if (!gameStarted) return;

    const length = 5 + difficulty; // 6-10 numbers
    const rng = (seed: number) => {
      let value = seed;
      return () => {
        value = (value * 9301 + 49297) % 233280;
        return value / 233280;
      };
    };

    const random = rng(seed);
    const newSequence: number[] = [];
    
    for (let i = 0; i < length; i++) {
      newSequence.push(Math.floor(random() * 9) + 1);
    }

    setSequence(newSequence);
    setCurrentIndex(0);
    setGameComplete(false);
  }, [seed, difficulty, gameStarted]);

  const handleNumberClick = (number: number) => {
    if (isSubmitting || gameComplete) return;

    if (number === sequence[currentIndex]) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);

      if (nextIndex >= sequence.length) {
        setGameComplete(true);
        onSubmitResult({
          sequence: sequence,
          time_ms: Date.now() - props.startTime,
        });
      }
    } else {
      // Wrong number clicked - game over
      onSubmitResult({
        sequence: sequence.slice(0, currentIndex),
        time_ms: Date.now() - props.startTime,
        completed: false,
      });
    }
  };

  if (!gameStarted) {
    return (
      <div style={{ textAlign: "center", padding: "32px" }}>
        <h3 style={{ marginBottom: "16px" }}>Precision Click</h3>
        <p style={{ opacity: 0.7, marginBottom: "24px" }}>
          Click numbers in the sequence shown. Be fast and precise!
        </p>
        <Button onClick={() => setGameStarted(true)} variant="primary">
          Start Game
        </Button>
      </div>
    );
  }

  if (gameComplete) {
    return (
      <div style={{ textAlign: "center", padding: "32px" }}>
        <div style={{ fontSize: "24px", fontWeight: 600, marginBottom: "16px", color: "#22c55e" }}>
          Complete!
        </div>
        {isSubmitting && <p style={{ opacity: 0.7 }}>Submitting result...</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: "32px", textAlign: "center" }}>
      <div style={{ marginBottom: "32px" }}>
        <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
          Click: {sequence[currentIndex]}
        </div>
        <div style={{ fontSize: "14px", opacity: 0.7 }}>
          Progress: {currentIndex} / {sequence.length}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
          maxWidth: "300px",
          margin: "0 auto",
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            style={{
              padding: "24px",
              fontSize: "24px",
              fontWeight: 600,
              backgroundColor: num === sequence[currentIndex] ? "#60a5fa" : "#f3f4f6",
              color: num === sequence[currentIndex] ? "white" : "#1f2937",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              transition: "all 0.2s",
              minHeight: "60px",
              touchAction: "manipulation",
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.95)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PrecisionClickGame() {
  return (
    <GameWrapper
      gameType="precision_click"
      gameName="Precision Click"
      onComplete={(result) => {
        console.log("Game completed:", result);
      }}
    >
      {(props) => <PrecisionClickGameContent {...props} />}
    </GameWrapper>
  );
}

