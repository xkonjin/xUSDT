/**
 * Play Games Page
 * 
 * Game selection page where players can choose which game to play.
 * Shows daily bonuses and allows wager selection.
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ReactionTimeGame } from "../../components/games/ReactionTimeGame";
import { DiceRollGame } from "../../components/games/DiceRollGame";
import { MemoryMatchGame } from "../../components/games/MemoryMatchGame";
import { PrecisionClickGame } from "../../components/games/PrecisionClickGame";
import { PatternRecognitionGame } from "../../components/games/PatternRecognitionGame";
import { CardDrawGame } from "../../components/games/CardDrawGame";
import { WheelSpinGame } from "../../components/games/WheelSpinGame";
import { getCurrentAccount } from "../../lib/wallet";

const GAME_TYPES = [
  {
    id: "reaction_time",
    name: "Reaction Time",
    description: "Click when the screen turns green!",
    icon: "⚡",
    category: "skill",
  },
  {
    id: "dice_roll",
    name: "Dice Roll",
    description: "Roll the dice and test your luck",
    icon: "🎲",
    category: "chance",
  },
  {
    id: "memory_match",
    name: "Memory Match",
    description: "Match pairs of cards",
    icon: "🧠",
    category: "skill",
  },
  {
    id: "precision_click",
    name: "Precision Click",
    description: "Click numbers in sequence",
    icon: "🎯",
    category: "skill",
  },
  {
    id: "pattern_recognition",
    name: "Pattern Recognition",
    description: "Complete the pattern",
    icon: "🔍",
    category: "skill",
  },
  {
    id: "card_draw",
    name: "Card Draw",
    description: "Draw a card and see your luck",
    icon: "🃏",
    category: "chance",
  },
  {
    id: "wheel_spin",
    name: "Wheel Spin",
    description: "Spin the wheel for multipliers",
    icon: "🎡",
    category: "chance",
  },
];

function PlayContent() {
  const router = useRouter();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [gamesOfDay, setGamesOfDay] = useState<any[]>([]);
  const [toyBonuses, setToyBonuses] = useState<any[]>([]);

  useEffect(() => {
    checkWallet();
    loadGamesOfDay();
  }, []);

  const checkWallet = async () => {
    try {
      const addr = await getCurrentAccount();
      setAccount(addr);
    } catch {
      // Wallet not connected
    }
  };

  const loadGamesOfDay = async () => {
    try {
      const response = await fetch("/api/game/games-of-the-day");
      if (response.ok) {
        const data = await response.json();
        setGamesOfDay(data.games_of_the_day || []);
        setToyBonuses(data.toy_bonuses || []);
      }
    } catch (error) {
      console.error("Failed to load games of the day:", error);
    }
  };

  if (selectedGame === "reaction_time") {
    return (
      <div>
        <Button
          onClick={() => setSelectedGame(null)}
          variant="outline"
          style={{ marginBottom: "16px" }}
        >
          ← Back to Games
        </Button>
        <ReactionTimeGame />
      </div>
    );
  }

  if (selectedGame === "dice_roll") {
    return (
      <div>
        <Button
          onClick={() => setSelectedGame(null)}
          variant="outline"
          style={{ marginBottom: "16px" }}
        >
          ← Back to Games
        </Button>
        <DiceRollGame />
      </div>
    );
  }

  if (selectedGame === "memory_match") {
    return (
      <div>
        <Button
          onClick={() => setSelectedGame(null)}
          variant="outline"
          style={{ marginBottom: "16px" }}
        >
          ← Back to Games
        </Button>
        <MemoryMatchGame />
      </div>
    );
  }

  if (selectedGame === "precision_click") {
    return (
      <div>
        <Button
          onClick={() => setSelectedGame(null)}
          variant="outline"
          style={{ marginBottom: "16px" }}
        >
          ← Back to Games
        </Button>
        <PrecisionClickGame />
      </div>
    );
  }

  if (selectedGame === "pattern_recognition") {
    return (
      <div>
        <Button
          onClick={() => setSelectedGame(null)}
          variant="outline"
          style={{ marginBottom: "16px" }}
        >
          ← Back to Games
        </Button>
        <PatternRecognitionGame />
      </div>
    );
  }

  if (selectedGame === "card_draw") {
    return (
      <div>
        <Button
          onClick={() => setSelectedGame(null)}
          variant="outline"
          style={{ marginBottom: "16px" }}
        >
          ← Back to Games
        </Button>
        <CardDrawGame />
      </div>
    );
  }

  if (selectedGame === "wheel_spin") {
    return (
      <div>
        <Button
          onClick={() => setSelectedGame(null)}
          variant="outline"
          style={{ marginBottom: "16px" }}
        >
          ← Back to Games
        </Button>
        <WheelSpinGame />
      </div>
    );
  }

  return (
    <main className="xui-container" style={{ paddingTop: 32 }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 className="xui-card-title" style={{ fontSize: 28, marginBottom: "8px" }}>
          Play Games
        </h1>
        <p style={{ opacity: 0.7, fontSize: "14px" }}>
          Choose a game to play and earn points
        </p>
      </div>

      {/* Games of the Day - Featured prominently */}
      {gamesOfDay.length > 0 && (
        <Card 
          style={{ 
            marginBottom: "24px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <span style={{ fontSize: "32px" }}>⭐</span>
            <div>
              <h3 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>
                Games of the Day
              </h3>
              <p style={{ fontSize: "14px", opacity: 0.9, margin: "4px 0 0 0" }}>
                Play these games with matching toys for maximum bonuses!
              </p>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "16px" }}>
            {gamesOfDay.map((game: any) => {
              const gameInfo = GAME_TYPES.find((g) => g.id === game.id);
              return (
                <div
                  key={game.id}
                  style={{
                    padding: "12px 16px",
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "24px" }}>{game.icon}</span>
                  <span>{game.name}</span>
                </div>
              );
            })}
          </div>

          {toyBonuses.length > 0 && (
            <div>
              <p style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px" }}>
                Toys with bonuses for today's games:
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {toyBonuses.slice(0, 5).map((bonus: any) => (
                  <div
                    key={bonus.toy_type_id}
                    style={{
                      padding: "6px 10px",
                      backgroundColor: "rgba(255, 255, 255, 0.25)",
                      borderRadius: "6px",
                      fontSize: "13px",
                    }}
                  >
                    {bonus.toy_name}: <strong>{bonus.multiplier}x</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Info Card explaining the system */}
      <Card style={{ marginBottom: "24px", backgroundColor: "#f0f9ff", border: "1px solid #bae6fd" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px", color: "#0369a1" }}>
          💡 How Toys Affect Games
        </h3>
        <div style={{ fontSize: "14px", color: "#075985", lineHeight: "1.6" }}>
          <p style={{ margin: "0 0 8px 0" }}>
            <strong>Base Bonus:</strong> All equipped toys provide a base multiplier based on their stats (1% per stat point).
          </p>
          <p style={{ margin: "0 0 8px 0" }}>
            <strong>Daily Bonuses:</strong> Only toys with bonuses matching the "Games of the Day" provide additional multipliers.
          </p>
          <p style={{ margin: 0 }}>
            <strong>Strategy:</strong> Equip toys that match today's featured games to maximize your points! Check your inventory to see which toys affect which games.
          </p>
        </div>
      </Card>

      {/* Game Selection */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        {GAME_TYPES.map((game) => {
          const isGameOfDay = gamesOfDay.some((g: any) => g.id === game.id);
          return (
            <Card
              key={game.id}
              style={{
                textAlign: "center",
                cursor: account ? "pointer" : "not-allowed",
                opacity: account ? 1 : 0.6,
                border: isGameOfDay ? "2px solid #667eea" : undefined,
                position: "relative",
              }}
              onClick={() => account && setSelectedGame(game.id)}
            >
              {isGameOfDay && (
                <div
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    fontSize: "20px",
                  }}
                >
                  ⭐
                </div>
              )}
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>
                {game.icon}
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "6px" }}>
                {game.name}
              </h3>
              <p style={{ fontSize: "14px", opacity: 0.7, marginBottom: "12px" }}>
                {game.description}
              </p>
              {isGameOfDay && (
                <div
                  style={{
                    fontSize: "12px",
                    padding: "4px 8px",
                    backgroundColor: "#667eea",
                    color: "white",
                    borderRadius: "4px",
                    display: "inline-block",
                    marginBottom: "8px",
                    fontWeight: 600,
                  }}
                >
                  Game of the Day
                </div>
              )}
              <div
                style={{
                  fontSize: "12px",
                  padding: "4px 8px",
                  backgroundColor: game.category === "skill" ? "#dbeafe" : "#fef3c7",
                  borderRadius: "4px",
                  display: "inline-block",
                }}
              >
                {game.category === "skill" ? "Skill" : "Chance"}
              </div>
            </Card>
          );
        })}
      </div>

      {!account && (
        <Card style={{ marginTop: "24px", textAlign: "center" }}>
          <p style={{ opacity: 0.7 }}>
            Connect your wallet to start playing games
          </p>
        </Card>
      )}
    </main>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px", textAlign: "center" }}>Loading...</div>}>
      <PlayContent />
    </Suspense>
  );
}
