/**
 * Daily Bonus Component
 * 
 * Displays current day's toy bonuses, countdown to next rotation,
 * and visual indicators for bonus multipliers.
 */

"use client";

import { useEffect, useState } from "react";
import { Card } from "./ui/Card";

interface DailyBonus {
  toy_type_id: number;
  toy_name: string;
  multiplier: number;
}

export function DailyBonus() {
  const [bonuses, setBonuses] = useState<DailyBonus[]>([]);
  const [timeUntilReset, setTimeUntilReset] = useState<string>("");

  useEffect(() => {
    loadBonuses();
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadBonuses = async () => {
    try {
      const response = await fetch("/api/game/daily-bonuses");
      if (response.ok) {
        const data = await response.json();
        setBonuses(data.bonuses || []);
      }
    } catch (err) {
      console.error("Failed to load daily bonuses:", err);
    }
  };

  const updateCountdown = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    setTimeUntilReset(`${hours}h ${minutes}m ${seconds}s`);
  };

  if (bonuses.length === 0) {
    return null;
  }

  return (
    <Card>
      <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
        Daily Bonuses
      </h3>
      <p style={{ fontSize: "12px", opacity: 0.7, marginBottom: "16px" }}>
        These toys get bonus multipliers today! Resets in {timeUntilReset}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {bonuses.slice(0, 5).map((bonus) => (
          <div
            key={bonus.toy_type_id}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              backgroundColor: "rgba(96,165,250,0.1)",
              fontSize: "12px",
            }}
          >
            <div style={{ fontWeight: 600 }}>{bonus.toy_name}</div>
            <div style={{ opacity: 0.7 }}>×{bonus.multiplier.toFixed(1)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

