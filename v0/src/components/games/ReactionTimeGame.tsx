/**
 * Reaction Time Game Component
 * 
 * Player clicks when the color changes from red to green.
 * Measures reaction time in milliseconds.
 */

"use client";

import { useState, useEffect } from "react";
import { GameWrapper, GameWrapperChildProps } from "./GameWrapper";
import { Button } from "../ui/Button";

function ReactionTimeGameContent(props: GameWrapperChildProps) {
  const { seed, onSubmitResult, isSubmitting } = props;
  const [color, setColor] = useState<"red" | "green" | "waiting">("waiting");
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [canClick, setCanClick] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Initialize random delay based on seed
  useEffect(() => {
    if (!gameStarted) return;

    // Use seed to create deterministic but random delay
    const delay = 1000 + (seed % 3000); // 1-4 seconds

    const timer = setTimeout(() => {
      setColor("green");
      setCanClick(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [seed, gameStarted]);

  const startGame = () => {
    setGameStarted(true);
    setColor("red");
    setCanClick(false);
    setReactionTime(null);
  };

  const handleClick = () => {
    if (!canClick || isSubmitting) return;

    const clickTime = Date.now();
    const startTime = props.startTime;
    const delay = 1000 + (seed % 3000);
    const reactionTimeMs = clickTime - startTime - delay;

    setReactionTime(reactionTimeMs);
    setCanClick(false);

    // Submit result
    onSubmitResult({
      reaction_time_ms: Math.max(0, reactionTimeMs),
    });
  };

  if (!gameStarted) {
    return (
      <div style={{ textAlign: "center", padding: "32px" }}>
        <h3 style={{ marginBottom: "16px" }}>Reaction Time Challenge</h3>
        <p style={{ opacity: 0.7, marginBottom: "24px" }}>
          Click when the screen turns green!
        </p>
        <Button onClick={startGame} variant="primary">
          Start Game
        </Button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: "32px" }}>
      <div
        style={{
          width: "100%",
          height: "300px",
          backgroundColor:
            color === "red"
              ? "#ef4444"
              : color === "green"
              ? "#22c55e"
              : "#6b7280",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "24px",
          cursor: canClick ? "pointer" : "not-allowed",
          transition: "background-color 0.3s",
          userSelect: "none",
          touchAction: "manipulation",
        }}
        onClick={handleClick}
      >
        {color === "waiting" && (
          <div style={{ color: "white", fontSize: "24px", fontWeight: 600 }}>
            Get Ready...
          </div>
        )}
        {color === "red" && (
          <div style={{ color: "white", fontSize: "24px", fontWeight: 600 }}>
            Wait for Green...
          </div>
        )}
        {color === "green" && (
          <div style={{ color: "white", fontSize: "24px", fontWeight: 600 }}>
            CLICK NOW!
          </div>
        )}
      </div>

      {reactionTime !== null && (
        <div style={{ marginTop: "16px" }}>
          <p style={{ fontSize: "18px", fontWeight: 600 }}>
            Reaction Time: {reactionTime}ms
          </p>
          {isSubmitting && <p style={{ opacity: 0.7 }}>Submitting...</p>}
        </div>
      )}
    </div>
  );
}

export function ReactionTimeGame() {
  return (
    <GameWrapper
      gameType="reaction_time"
      gameName="Reaction Time"
      onComplete={(result) => {
        console.log("Game completed:", result);
        // Could navigate to results page
      }}
    >
      {(props) => <ReactionTimeGameContent {...props} />}
    </GameWrapper>
  );
}
