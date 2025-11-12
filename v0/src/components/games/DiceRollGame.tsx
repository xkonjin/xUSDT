/**
 * Dice Roll Game Component
 * 
 * Simple chance-based game - roll a dice and get points.
 */

"use client";

import { useState } from "react";
import { GameWrapper, GameWrapperChildProps } from "./GameWrapper";
import { Button } from "../ui/Button";

function DiceRollGameContent(props: GameWrapperChildProps) {
  const { seed, onSubmitResult, isSubmitting } = props;
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [rolled, setRolled] = useState(false);

  // Generate dice value based on seed
  const rollDice = () => {
    // Use seed for deterministic but random result
    const value = (seed % 6) + 1;
    setDiceValue(value);
    setRolled(true);

    // Submit result immediately
    onSubmitResult({
      dice_value: value,
    });
  };

  return (
    <div style={{ textAlign: "center", padding: "32px" }}>
      <h3 style={{ marginBottom: "16px" }}>Dice Roll</h3>
      <p style={{ opacity: 0.7, marginBottom: "24px" }}>
        Roll the dice and test your luck!
      </p>

      <div
        style={{
          width: "150px",
          height: "150px",
          margin: "0 auto 24px",
          backgroundColor: "#f3f4f6",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "64px",
          fontWeight: 700,
          border: "3px solid #d1d5db",
        }}
      >
        {diceValue || "?"}
      </div>

      {!rolled && (
        <Button onClick={rollDice} variant="primary" disabled={isSubmitting}>
          Roll Dice
        </Button>
      )}

      {rolled && (
        <div>
          <p style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
            You rolled: {diceValue}
          </p>
          {isSubmitting && <p style={{ opacity: 0.7 }}>Calculating points...</p>}
        </div>
      )}
    </div>
  );
}

export function DiceRollGame() {
  return (
    <GameWrapper
      gameType="dice_roll"
      gameName="Dice Roll"
      onComplete={(result) => {
        console.log("Game completed:", result);
      }}
    >
      {(props) => <DiceRollGameContent {...props} />}
    </GameWrapper>
  );
}
