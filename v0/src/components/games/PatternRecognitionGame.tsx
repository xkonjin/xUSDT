/**
 * Pattern Recognition Game Component
 * 
 * Player completes a pattern by selecting the correct shape.
 * Skill-based game requiring pattern recognition.
 */

"use client";

import { useState, useEffect } from "react";
import { GameWrapper, GameWrapperChildProps } from "./GameWrapper";
import { Button } from "../ui/Button";

type Shape = "circle" | "square" | "triangle";

function PatternRecognitionGameContent(props: GameWrapperChildProps) {
  const { seed, difficulty, onSubmitResult, isSubmitting } = props;
  const [pattern, setPattern] = useState<Shape[]>([]);
  const [userPattern, setUserPattern] = useState<Shape[]>([]);
  const [showPattern, setShowPattern] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);

  // Generate pattern based on seed
  useEffect(() => {
    if (!gameStarted) return;

    const length = 4 + difficulty; // 5-9 shapes
    const rng = (seed: number) => {
      let value = seed;
      return () => {
        value = (value * 9301 + 49297) % 233280;
        return value / 233280;
      };
    };

    const random = rng(seed);
    const shapes: Shape[] = ["circle", "square", "triangle"];
    const newPattern: Shape[] = [];

    for (let i = 0; i < length; i++) {
      newPattern.push(shapes[Math.floor(random() * shapes.length)]);
    }

    setPattern(newPattern);
    setUserPattern([]);
    setShowPattern(true);
    setGameComplete(false);

    // Hide pattern after 3 seconds
    setTimeout(() => {
      setShowPattern(false);
    }, 3000);
  }, [seed, difficulty, gameStarted]);

  const handleShapeClick = (shape: Shape) => {
    if (isSubmitting || gameComplete || showPattern) return;

    const newUserPattern = [...userPattern, shape];
    setUserPattern(newUserPattern);

    if (newUserPattern.length === pattern.length) {
      const correct = newUserPattern.every((s, i) => s === pattern[i]);
      setGameComplete(true);
      onSubmitResult({
        pattern: newUserPattern,
        correct,
        time_ms: Date.now() - props.startTime,
      });
    }
  };

  const renderShape = (shape: Shape, size: number = 60) => {
    const style: React.CSSProperties = {
      width: size,
      height: size,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    };

    switch (shape) {
      case "circle":
        return (
          <div
            style={{
              ...style,
              borderRadius: "50%",
              backgroundColor: "#60a5fa",
            }}
          />
        );
      case "square":
        return (
          <div
            style={{
              ...style,
              backgroundColor: "#a855f7",
            }}
          />
        );
      case "triangle":
        return (
          <div
            style={{
              ...style,
              width: 0,
              height: 0,
              borderLeft: `${size / 2}px solid transparent`,
              borderRight: `${size / 2}px solid transparent`,
              borderBottom: `${size}px solid #22c55e`,
              backgroundColor: "transparent",
            }}
          />
        );
    }
  };

  if (!gameStarted) {
    return (
      <div style={{ textAlign: "center", padding: "32px" }}>
        <h3 style={{ marginBottom: "16px" }}>Pattern Recognition</h3>
        <p style={{ opacity: 0.7, marginBottom: "24px" }}>
          Memorize the pattern and recreate it!
        </p>
        <Button onClick={() => setGameStarted(true)} variant="primary">
          Start Game
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px", textAlign: "center" }}>
      {showPattern ? (
        <div>
          <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "24px" }}>
            Memorize this pattern:
          </div>
          <div
            style={{
              display: "flex",
              gap: "16px",
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: "24px",
            }}
          >
            {pattern.map((shape, index) => (
              <div key={index}>{renderShape(shape, 50)}</div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
            Recreate the pattern:
          </div>
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: "24px",
              minHeight: "80px",
            }}
          >
            {userPattern.map((shape, index) => (
              <div key={index}>{renderShape(shape, 40)}</div>
            ))}
          </div>
          <div style={{ marginBottom: "24px" }}>
            Progress: {userPattern.length} / {pattern.length}
          </div>
          <div
            style={{
              display: "flex",
              gap: "16px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {(["circle", "square", "triangle"] as Shape[]).map((shape) => (
              <button
                key={shape}
                onClick={() => handleShapeClick(shape)}
                style={{
                  padding: "16px",
                  border: "2px solid #d1d5db",
                  borderRadius: "12px",
                  backgroundColor: "white",
                  cursor: "pointer",
                  minWidth: "80px",
                  minHeight: "80px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  touchAction: "manipulation",
                }}
              >
                {renderShape(shape, 40)}
              </button>
            ))}
          </div>
        </div>
      )}

      {gameComplete && (
        <div style={{ marginTop: "24px", fontSize: "18px", fontWeight: 600 }}>
          {isSubmitting ? "Submitting..." : "Pattern complete!"}
        </div>
      )}
    </div>
  );
}

export function PatternRecognitionGame() {
  return (
    <GameWrapper
      gameType="pattern_recognition"
      gameName="Pattern Recognition"
      onComplete={(result) => {
        console.log("Game completed:", result);
      }}
    >
      {(props) => <PatternRecognitionGameContent {...props} />}
    </GameWrapper>
  );
}

