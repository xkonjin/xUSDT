/**
 * Memory Match Game Component
 * 
 * Player matches pairs of cards by clicking them.
 * Skill-based game requiring memory.
 */

"use client";

import { useState, useEffect } from "react";
import { GameWrapper, GameWrapperChildProps } from "./GameWrapper";
import { Button } from "../ui/Button";

interface Card {
  id: number;
  value: number;
  flipped: boolean;
  matched: boolean;
}

function MemoryMatchGameContent(props: GameWrapperChildProps) {
  const { seed, difficulty, onSubmitResult, isSubmitting } = props;
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [pairsMatched, setPairsMatched] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [moves, setMoves] = useState(0);

  // Initialize game based on seed and difficulty
  useEffect(() => {
    if (!gameStarted) return;

    const pairs = 4 + difficulty; // 5-9 pairs
    const cardValues: number[] = [];
    
    // Generate pairs using seed
    const rng = (seed: number) => {
      let value = seed;
      return () => {
        value = (value * 9301 + 49297) % 233280;
        return value / 233280;
      };
    };

    const random = rng(seed);
    
    for (let i = 0; i < pairs; i++) {
      cardValues.push(i, i); // Add pair
    }

    // Shuffle using seed
    const shuffled = [...cardValues].sort(() => random() - 0.5);

    const newCards: Card[] = shuffled.map((value, index) => ({
      id: index,
      value,
      flipped: false,
      matched: false,
    }));

    setCards(newCards);
    setPairsMatched(0);
    setMoves(0);
    setFlippedCards([]);
  }, [seed, difficulty, gameStarted]);

  const handleCardClick = (cardId: number) => {
    if (isSubmitting || flippedCards.length >= 2) return;

    const card = cards[cardId];
    if (card.flipped || card.matched) return;

    const newCards = [...cards];
    newCards[cardId].flipped = true;
    setCards(newCards);

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(moves + 1);
      const [firstId, secondId] = newFlipped;
      const firstCard = cards[firstId];
      const secondCard = cards[secondId];

      setTimeout(() => {
        if (firstCard.value === secondCard.value) {
          // Match found
          const updatedCards = [...cards];
          updatedCards[firstId].matched = true;
          updatedCards[secondId].matched = true;
          setCards(updatedCards);
          setPairsMatched(pairsMatched + 1);

          // Check if game complete
          if (pairsMatched + 1 >= cards.length / 2) {
            onSubmitResult({
              pairs_matched: pairsMatched + 1,
              moves,
              time_ms: Date.now() - props.startTime,
            });
          }
        } else {
          // No match, flip back
          const updatedCards = [...cards];
          updatedCards[firstId].flipped = false;
          updatedCards[secondId].flipped = false;
          setCards(updatedCards);
        }
        setFlippedCards([]);
      }, 1000);
    }
  };

  if (!gameStarted) {
    return (
      <div style={{ textAlign: "center", padding: "32px" }}>
        <h3 style={{ marginBottom: "16px" }}>Memory Match</h3>
        <p style={{ opacity: 0.7, marginBottom: "24px" }}>
          Match pairs of cards! Remember their positions.
        </p>
        <Button onClick={() => setGameStarted(true)} variant="primary">
          Start Game
        </Button>
      </div>
    );
  }

  const gridSize = Math.ceil(Math.sqrt(cards.length));

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
          Pairs Matched: {pairsMatched} / {cards.length / 2}
        </div>
        <div style={{ fontSize: "14px", opacity: 0.7 }}>Moves: {moves}</div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gap: "8px",
          maxWidth: "500px",
          margin: "0 auto",
        }}
      >
        {cards.map((card) => (
          <div
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            style={{
              aspectRatio: "1",
              backgroundColor: card.matched
                ? "#22c55e"
                : card.flipped
                ? "#60a5fa"
                : "#e5e7eb",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: 600,
              cursor: card.matched ? "default" : "pointer",
              transition: "all 0.3s",
              userSelect: "none",
              touchAction: "manipulation",
            }}
          >
            {card.flipped || card.matched ? card.value : "?"}
          </div>
        ))}
      </div>

      {isSubmitting && (
        <div style={{ textAlign: "center", marginTop: "24px", opacity: 0.7 }}>
          Submitting result...
        </div>
      )}
    </div>
  );
}

export function MemoryMatchGame() {
  return (
    <GameWrapper
      gameType="memory_match"
      gameName="Memory Match"
      onComplete={(result) => {
        console.log("Game completed:", result);
      }}
    >
      {(props) => <MemoryMatchGameContent {...props} />}
    </GameWrapper>
  );
}

