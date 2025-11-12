/**
 * Individual Game Page
 * 
 * Renders the specific game component based on gameId route parameter.
 */

"use client";

import { Suspense } from "react";
import { ReactionTimeGame } from "../../../components/games/ReactionTimeGame";
import { DiceRollGame } from "../../../components/games/DiceRollGame";
import { Card } from "../../../components/ui/Card";

const GAME_COMPONENTS: Record<string, React.ComponentType> = {
  reaction_time: ReactionTimeGame,
  dice_roll: DiceRollGame,
  // Add more games as they're created
};

function GamePageContent({ gameId }: { gameId: string }) {
  const GameComponent = GAME_COMPONENTS[gameId];

  if (!GameComponent) {
    return (
      <main className="xui-container" style={{ paddingTop: 32 }}>
        <Card>
          <div style={{ textAlign: "center", padding: "32px" }}>
            <h2 style={{ marginBottom: "16px" }}>Game Not Found</h2>
            <p style={{ opacity: 0.7 }}>
              The game "{gameId}" is not available yet.
            </p>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="xui-container" style={{ paddingTop: 32 }}>
      <GameComponent />
    </main>
  );
}

export default function GamePage({ params }: { params: { gameId: string } }) {
  return (
    <Suspense fallback={<div style={{ padding: "32px", textAlign: "center" }}>Loading game...</div>}>
      <GamePageContent gameId={params.gameId} />
    </Suspense>
  );
}

