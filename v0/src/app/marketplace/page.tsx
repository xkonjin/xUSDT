/**
 * Marketplace Page
 * 
 * Browse and purchase toys from other players.
 * Also allows selling toys to the merchant.
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ToyIcon } from "../../components/icons/ToyIcons";
import { getCurrentAccount, connectWallet } from "../../lib/wallet";

interface MarketplaceListing {
  id: number;
  token_id: number;
  toy_name: string;
  rarity: string;
  stats: Record<string, number>;
  mint_number: number;
  price_usdt0: number;
  seller_address: string;
  listed_at: string;
}

function MarketplaceContent() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    checkWallet();
    loadListings();
  }, []);

  const checkWallet = async () => {
    try {
      const addr = await getCurrentAccount();
      setAccount(addr);
    } catch {
      // Wallet not connected
    }
  };

  const loadListings = async () => {
    setLoading(true);
    try {
      // For now, return empty - marketplace API would go here
      // const response = await fetch("/api/game/marketplace/listings");
      // if (response.ok) {
      //   const data = await response.json();
      //   setListings(data.listings || []);
      // }
      setListings([]);
    } catch (error) {
      console.error("Failed to load listings:", error);
    } finally {
      setLoading(false);
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

  return (
    <main className="xui-container" style={{ paddingTop: 32 }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 className="xui-card-title" style={{ fontSize: 28, marginBottom: "8px" }}>
          Marketplace
        </h1>
        <p style={{ opacity: 0.7, fontSize: "14px" }}>
          Buy and sell toys with other players
        </p>
      </div>

      {/* Wallet Connection */}
      {!account && (
        <Card style={{ marginBottom: "24px" }}>
          <div style={{ textAlign: "center", padding: "16px" }}>
            <p style={{ opacity: 0.7, marginBottom: "12px" }}>
              Connect your wallet to buy and sell toys
            </p>
            <Button onClick={async () => {
              const addr = await connectWallet();
              setAccount(addr);
            }} variant="primary">
              Connect Wallet
            </Button>
          </div>
        </Card>
      )}

      {/* Listings */}
      {loading ? (
        <Card>
          <div style={{ textAlign: "center", padding: "32px" }}>Loading...</div>
        </Card>
      ) : listings.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "32px", opacity: 0.6 }}>
            No toys listed for sale yet. Check back soon!
          </div>
        </Card>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "16px",
          }}
        >
          {listings.map((listing) => (
            <Card key={listing.id}>
              <div style={{ textAlign: "center", padding: "16px" }}>
                <ToyIcon
                  name={listing.toy_name.toLowerCase().replace(/\s+/g, "-")}
                  size={80}
                />
                <h3 style={{ fontSize: "16px", fontWeight: 600, marginTop: "12px" }}>
                  {listing.toy_name}
                </h3>
                <div
                  style={{
                    fontSize: "12px",
                    color: getRarityColor(listing.rarity),
                    marginTop: "4px",
                    marginBottom: "8px",
                  }}
                >
                  {listing.rarity.toUpperCase()} #{listing.mint_number}
                </div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#60a5fa",
                    marginBottom: "12px",
                  }}
                >
                  {(listing.price_usdt0 / 1_000_000).toFixed(2)} USDT0
                </div>
                <Button variant="primary" style={{ width: "100%" }}>
                  Purchase
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card style={{ marginTop: "24px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px" }}>
          Marketplace Info
        </h3>
        <ul style={{ opacity: 0.7, fontSize: "14px", lineHeight: "1.8" }}>
          <li>1% merchant fee on all sales</li>
          <li>You can sell toys back to the merchant at a slightly lower price</li>
          <li>Dynamic pricing based on rarity and demand</li>
        </ul>
      </Card>
    </main>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px", textAlign: "center" }}>Loading...</div>}>
      <MarketplaceContent />
    </Suspense>
  );
}
