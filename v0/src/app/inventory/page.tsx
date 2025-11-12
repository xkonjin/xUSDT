/**
 * Player Inventory Page
 * 
 * Displays player's owned toys with 3-slot equip system.
 * Players can equip/unequip toys to gain bonuses in games.
 * 
 * Mobile-optimized with drag-and-drop support for slot management.
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ToyIcon } from "../../components/icons/ToyIcons";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { getCurrentAccount, connectWallet } from "../../lib/wallet";

interface Toy {
  token_id: number;
  toy_type_id: number;
  toy_name: string;
  rarity: string;
  stats: Record<string, number>;
  mint_number: number;
  is_equipped: boolean;
}

interface InventoryData {
  equipped: {
    1: Toy | null;
    2: Toy | null;
    3: Toy | null;
  };
  owned: Toy[];
}

interface ToyBonus {
  toy_type_id: number;
  toy_name: string;
  multiplier: number;
  game_types: string[];
}

function InventoryContent() {
  const router = useRouter();
  const [account, setAccount] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [equipping, setEquipping] = useState<number | null>(null);
  const [gamesOfDay, setGamesOfDay] = useState<any[]>([]);
  const [toyBonuses, setToyBonuses] = useState<ToyBonus[]>([]);
  const [allToyBonuses, setAllToyBonuses] = useState<ToyBonus[]>([]);

  useEffect(() => {
    checkWallet();
    loadGamesOfDay();
  }, []);

  useEffect(() => {
    if (account) {
      loadInventory();
    }
  }, [account]);

  const checkWallet = async () => {
    try {
      const addr = await getCurrentAccount();
      setAccount(addr);
    } catch {
      // Wallet not connected
    }
  };

  const handleConnectWallet = async () => {
    try {
      const addr = await connectWallet();
      setAccount(addr);
    } catch (err: any) {
      alert(err.message || "Failed to connect wallet");
    }
  };

  const loadGamesOfDay = async () => {
    try {
      const response = await fetch("/api/game/games-of-the-day");
      if (response.ok) {
        const data = await response.json();
        setGamesOfDay(data.games_of_the_day || []);
        setToyBonuses(data.toy_bonuses || []);
        setAllToyBonuses(data.all_toy_bonuses || []);
      }
    } catch (error) {
      console.error("Failed to load games of the day:", error);
    }
  };

  const loadInventory = async () => {
    if (!account) return;

    try {
      const response = await fetch(`/api/game/players/${account}/inventory`);
      if (response.ok) {
        const data = await response.json();
        setInventory(data);
      }
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate squad benefits
  const calculateSquadBenefits = () => {
    if (!inventory) return { baseMultiplier: 1.0, dailyMultipliers: {} };
    
    let baseMultiplier = 1.0;
    const dailyMultipliers: Record<string, number> = {};
    
    // Calculate base multiplier from equipped toys' stats
    Object.values(inventory.equipped).forEach((toy) => {
      if (toy) {
        const totalStats = Object.values(toy.stats || {}).reduce((sum, val) => sum + (val || 0), 0);
        baseMultiplier += totalStats * 0.01; // 1% per stat point
      }
    });
    
    // Calculate daily multipliers for each game of the day
    gamesOfDay.forEach((game: any) => {
      let maxMultiplier = 1.0;
      Object.values(inventory.equipped).forEach((toy) => {
        if (toy) {
          const bonus = allToyBonuses.find(
            (b) => b.toy_type_id === toy.toy_type_id && b.game_types.includes(game.id)
          );
          if (bonus && bonus.multiplier > maxMultiplier) {
            maxMultiplier = bonus.multiplier;
          }
        }
      });
      dailyMultipliers[game.id] = maxMultiplier;
    });
    
    return { baseMultiplier, dailyMultipliers };
  };

  const getToyBonusForGame = (toyTypeId: number, gameId: string) => {
    return allToyBonuses.find(
      (b) => b.toy_type_id === toyTypeId && b.game_types.includes(gameId)
    );
  };

  const handleEquip = async (tokenId: number, slotNumber: number) => {
    if (!account) return;

    setEquipping(tokenId);

    try {
      const response = await fetch(`/api/game/players/${account}/inventory/equip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token_id: tokenId,
          slot_number: slotNumber,
        }),
      });

      if (response.ok) {
        await loadInventory();
      } else {
        const error = await response.json();
        alert(error.detail || "Failed to equip toy");
      }
    } catch (err: any) {
      alert(err.message || "Failed to equip toy");
    } finally {
      setEquipping(null);
    }
  };

  const handleUnequip = async (tokenId: number) => {
    if (!account) return;

    try {
      const response = await fetch(`/api/game/players/${account}/inventory/unequip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_id: tokenId }),
      });

      if (response.ok) {
        await loadInventory();
      } else {
        const error = await response.json();
        alert(error.detail || "Failed to unequip toy");
      }
    } catch (err: any) {
      alert(err.message || "Failed to unequip toy");
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      common: "#767676",
      rare: "#60a5fa",
      epic: "#a855f7",
      legendary: "#f59e0b",
    };
    return colors[rarity] || "#767676";
  };

  if (!account) {
    return (
      <main className="xui-container" style={{ paddingTop: 32 }}>
        <Card>
          <div style={{ textAlign: "center", padding: "32px" }}>
            <h2 style={{ marginBottom: "16px" }}>Connect Your Wallet</h2>
            <p style={{ opacity: 0.7, marginBottom: "24px" }}>
              Connect your Rabby wallet to view your toy inventory
            </p>
            <Button onClick={handleConnectWallet} variant="primary">
              Connect Rabby Wallet
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="xui-container" style={{ paddingTop: 32 }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 className="xui-card-title" style={{ fontSize: 28, marginBottom: "8px" }}>
          My Inventory & Squad
        </h1>
        <p style={{ opacity: 0.7, fontSize: "14px" }}>
          Equip up to 3 toys to boost your game performance. Match toys to Games of the Day for maximum bonuses!
        </p>
      </div>

      {/* Games of the Day */}
      {gamesOfDay.length > 0 && (
        <Card style={{ marginBottom: "24px", backgroundColor: "#f0f9ff", border: "1px solid #bae6fd" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px", color: "#0369a1" }}>
            ⭐ Games of the Day
          </h3>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
            {gamesOfDay.map((game: any) => (
              <div
                key={game.id}
                style={{
                  padding: "8px 12px",
                  backgroundColor: "white",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>{game.icon}</span>
                <span>{game.name}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "12px", color: "#075985", opacity: 0.8 }}>
            Equip toys with bonuses matching these games to maximize your points!
          </p>
        </Card>
      )}

      {/* Squad Benefits Preview */}
      {inventory && gamesOfDay.length > 0 && (
        <Card style={{ marginBottom: "24px", backgroundColor: "#fef3c7", border: "1px solid #fcd34d" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px", color: "#92400e" }}>
            📊 Your Squad Benefits
          </h3>
          {(() => {
            const benefits = calculateSquadBenefits();
            const equippedCount = Object.values(inventory.equipped).filter((t) => t !== null).length;
            return (
              <div style={{ fontSize: "14px", color: "#78350f" }}>
                <p style={{ margin: "0 0 8px 0" }}>
                  <strong>Equipped Toys:</strong> {equippedCount}/3
                </p>
                <p style={{ margin: "0 0 8px 0" }}>
                  <strong>Base Multiplier:</strong> {benefits.baseMultiplier.toFixed(2)}x (from stats)
                </p>
                {gamesOfDay.length > 0 && (
                  <div>
                    <strong>Daily Bonuses:</strong>
                    <ul style={{ margin: "4px 0 0 0", paddingLeft: "20px" }}>
                      {gamesOfDay.map((game: any) => (
                        <li key={game.id} style={{ marginBottom: "4px" }}>
                          {game.name}: {benefits.dailyMultipliers[game.id]?.toFixed(2) || "1.00"}x
                          {benefits.dailyMultipliers[game.id] === 1.0 && (
                            <span style={{ fontSize: "12px", opacity: 0.7 }}>
                              {" "}(no matching toys)
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })()}
        </Card>
      )}

      {/* Equipped Slots */}
      <Card style={{ marginBottom: "24px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
          Equipped Toys (3 slots)
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "16px",
          }}
        >
          {[1, 2, 3].map((slotNum) => {
            const toy = inventory?.equipped[slotNum as keyof typeof inventory.equipped];
            return (
              <div
                key={slotNum}
                style={{
                  border: "2px dashed #ccc",
                  borderRadius: "12px",
                  padding: "16px",
                  textAlign: "center",
                  minHeight: "160px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: toy ? undefined : "rgba(0,0,0,0.02)",
                }}
              >
                {toy ? (
                  <>
                    <ToyIcon name={toy.toy_name.toLowerCase().replace(/\s+/g, "-")} size={60} />
                    <div style={{ marginTop: "8px", fontSize: "12px", fontWeight: 600 }}>
                      {toy.toy_name}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: getRarityColor(toy.rarity),
                        marginTop: "4px",
                      }}
                    >
                      {toy.rarity.toUpperCase()}
                    </div>
                    <Button
                      onClick={() => handleUnequip(toy.token_id)}
                      variant="outline"
                      style={{ marginTop: "8px", fontSize: "11px", padding: "4px 8px" }}
                    >
                      Unequip
                    </Button>
                  </>
                ) : (
                  <div style={{ opacity: 0.4, fontSize: "12px" }}>Slot {slotNum}</div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Owned Toys */}
      <Card>
        <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
          Owned Toys ({inventory?.owned.length || 0})
        </h3>
        {loading ? (
          <div style={{ textAlign: "center", padding: "32px" }}>Loading...</div>
        ) : inventory && inventory.owned.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "16px",
            }}
          >
            {inventory.owned.map((toy) => {
              // Match by toy_type_id (proper way)
              const toyBonus = allToyBonuses.find((b) => 
                b.toy_type_id === toy.toy_type_id
              );
              const affectsGamesOfDay = toyBonus && gamesOfDay.some((g: any) =>
                toyBonus.game_types.includes(g.id)
              );
              
              return (
                <div
                  key={toy.token_id}
                  style={{
                    border: `2px solid ${getRarityColor(toy.rarity)}`,
                    borderRadius: "12px",
                    padding: "12px",
                    textAlign: "center",
                    backgroundColor: toy.is_equipped ? "rgba(96,165,250,0.1)" : undefined,
                    position: "relative",
                  }}
                >
                  {affectsGamesOfDay && (
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        fontSize: "16px",
                      }}
                      title="This toy has bonuses for Games of the Day"
                    >
                      ⭐
                    </div>
                  )}
                  <ToyIcon name={toy.toy_name.toLowerCase().replace(/\s+/g, "-")} size={50} />
                  <div style={{ marginTop: "8px", fontSize: "11px", fontWeight: 600 }}>
                    {toy.toy_name}
                  </div>
                  <div
                    style={{
                      fontSize: "9px",
                      color: getRarityColor(toy.rarity),
                      marginTop: "4px",
                    }}
                  >
                    {toy.rarity.toUpperCase()} #{toy.mint_number}
                  </div>
                  
                  {/* Show stats */}
                  {Object.keys(toy.stats || {}).length > 0 && (
                    <div style={{ marginTop: "6px", fontSize: "9px", opacity: 0.7 }}>
                      {Object.entries(toy.stats || {})
                        .slice(0, 2)
                        .map(([key, val]) => `${key}: ${val}`)
                        .join(", ")}
                    </div>
                  )}
                  
                  {/* Show which games this toy affects */}
                  {toyBonus && toyBonus.game_types.length > 0 && (
                    <div style={{ marginTop: "6px", fontSize: "9px", color: "#0369a1" }}>
                      Affects: {toyBonus.game_types.join(", ")}
                      {toyBonus.multiplier > 1.0 && (
                        <span style={{ fontWeight: 600 }}> ({toyBonus.multiplier}x)</span>
                      )}
                    </div>
                  )}
                  
                  {!toy.is_equipped && (
                    <div style={{ marginTop: "8px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {[1, 2, 3].map((slotNum) => (
                        <Button
                          key={slotNum}
                          onClick={() => handleEquip(toy.token_id, slotNum)}
                          disabled={equipping === toy.token_id}
                          variant="outline"
                          style={{ fontSize: "10px", padding: "4px 8px", flex: 1 }}
                        >
                          Slot {slotNum}
                        </Button>
                      ))}
                    </div>
                  )}
                  {toy.is_equipped && (
                    <div style={{ marginTop: "8px", fontSize: "10px", opacity: 0.7 }}>
                      Equipped
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "32px", opacity: 0.6 }}>
            No toys owned. Visit the{" "}
            <a href="/store" style={{ color: "#60a5fa", textDecoration: "underline" }}>
              Toy Store
            </a>{" "}
            to purchase toys!
          </div>
        )}
      </Card>
    </main>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px", textAlign: "center" }}>Loading...</div>}>
      <InventoryContent />
    </Suspense>
  );
}

