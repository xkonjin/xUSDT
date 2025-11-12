/**
 * Card Draw Game Component
 * 
 * Simple chance-based game - draw a card and see your luck.
 */

"use client";

import { useState } from "react";
import { GameWrapper, GameWrapperChildProps } from "./GameWrapper";
import { Button } from "../ui/Button";

const SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;
const CARD_NAMES: Record<number, string> = {
  1: "Ace",
  11: "Jack",
  12: "Queen",
  13: "King",
};

function CardDrawGameContent(props: GameWrapperChildProps) {
  const { seed, onSubmitResult, isSubmitting } = props;
  const [cardDrawn, setCardDrawn] = useState(false);
  const [cardValue, setCardValue] = useState<number | null>(null);
  const [cardSuit, setCardSuit] = useState<string | null>(null);

  const drawCard = () => {
    // Use seed for deterministic but random result
    const rng = (seed: number) => {
      let value = seed;
      return () => {
        value = (value * 9301 + 49297) % 233280;
        return value / 233280;
      };
    };

    const random = rng(seed);
    const value = Math.floor(random() * 13) + 1; // 1-13
    const suit = SUITS[Math.floor(random() * SUITS.length)];

    setCardValue(value);
    setCardSuit(suit);
    setCardDrawn(true);

    // Submit result immediately
    onSubmitResult({
      card_value: value,
      suit,
    });
  };

  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case "hearts":
        return "♥";
      case "diamonds":
        return "♦";
      case "clubs":
        return "♣";
      case "spades":
        return "♠";
      default:
        return "";
    }
  };

  const getSuitColor = (suit: string) => {
    return suit === "hearts" || suit === "diamonds" ? "#ef4444" : "#1f2937";
  };

  return (
    <div style={{ textAlign: "center", padding: "32px" }}>
      <h3 style={{ marginBottom: "16px" }}>Card Draw</h3>
      <p style={{ opacity: 0.7, marginBottom: "24px" }}>
        Draw a card and test your luck!
      </p>

      {!cardDrawn ? (
        <div>
          <div
            style={{
              width: "200px",
              height: "280px",
              margin: "0 auto 24px",
              backgroundColor: "#f3f4f6",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "48px",
              border: "3px solid #d1d5db",
            }}
          >
            ?
          </div>
          <Button onClick={drawCard} variant="primary" disabled={isSubmitting}>
            Draw Card
          </Button>
        </div>
      ) : (
        <div>
          <div
            style={{
              width: "200px",
              height: "280px",
              margin: "0 auto 24px",
              backgroundColor: "white",
              borderRadius: "12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: 700,
              border: "3px solid #d1d5db",
              color: getSuitColor(cardSuit!),
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "8px" }}>
              {getSuitSymbol(cardSuit!)}
            </div>
            <div>
              {CARD_NAMES[cardValue!] || cardValue}
            </div>
          </div>
          <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
            You drew: {CARD_NAMES[cardValue!] || cardValue} of {cardSuit}
          </div>
          {isSubmitting && (
            <p style={{ opacity: 0.7 }}>Calculating points...</p>
          )}
        </div>
      )}
    </div>
  );
}

export function CardDrawGame() {
  return (
    <GameWrapper
      gameType="card_draw"
      gameName="Card Draw"
      onComplete={(result) => {
        console.log("Game completed:", result);
      }}
    >
      {(props) => <CardDrawGameContent {...props} />}
    </GameWrapper>
  );
}

