/**
 * Toy Store Page
 * 
 * Displays the toy catalog with Airbnb-style 3D icons.
 * Players can browse toys, see available mints, and purchase toys via EIP-3009 payments.
 * 
 * Mobile-optimized with touch-friendly interactions and Rabby wallet support.
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { TOY_CATALOG, formatPriceUsdt0, RARITY_TIERS } from "../../lib/toys";
import { ToyIcon } from "../../components/icons/ToyIcons";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { connectWallet, getCurrentAccount, switchToPlasmaChain } from "../../lib/wallet";
import { buildTransferWithAuthorization, fetchTokenNameAndVersion, splitSignature } from "../lib/eip3009";

interface ToyListing {
  id: number;
  name: string;
  description: string;
  base_price_usdt0: number;
  price_usdt0: number;
  icon_name: string;
  stat_categories: string[];
  rarity_distribution: {
    common: number;
    rare: number;
    epic: number;
    legendary: number;
  };
  current_mint_count: number;
  max_mint_per_type: number;
  available: boolean;
}

const DEFAULTS = {
  PLASMA_RPC: "https://rpc.plasma.to",
  PLASMA_CHAIN_ID: 9745,
  USDT0_ADDRESS: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
  MERCHANT_URL: "http://127.0.0.1:8000",
};

function ToyStoreContent() {
  const router = useRouter();
  const [toys, setToys] = useState<ToyListing[]>([]);
  const [account, setAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [error, setError] = useState<string>("");

  // Load toys from API
  useEffect(() => {
    loadToys();
    checkWallet();
  }, []);

  const loadToys = async () => {
    try {
      const response = await fetch("/api/game/toys");
      if (response.ok) {
        const data = await response.json();
        setToys(data);
      } else {
        // Fallback to catalog if API not available
        setToys(
          TOY_CATALOG.map((toy) => ({
            id: toy.id,
            name: toy.name,
            description: toy.description,
            base_price_usdt0: toy.basePriceUsdt0,
            price_usdt0: toy.basePriceUsdt0 / 1_000_000,
            icon_name: toy.iconName,
            stat_categories: toy.statCategories,
            rarity_distribution: toy.rarityDistribution,
            current_mint_count: 0, // Will be updated from API
            max_mint_per_type: toy.maxMintPerType,
            available: true,
          }))
        );
      }
    } catch (err) {
      // Fallback to catalog
      setToys(
        TOY_CATALOG.map((toy) => ({
          id: toy.id,
          name: toy.name,
          description: toy.description,
          base_price_usdt0: toy.basePriceUsdt0,
          price_usdt0: toy.basePriceUsdt0 / 1_000_000,
          icon_name: toy.iconName,
          stat_categories: toy.statCategories,
          rarity_distribution: toy.rarityDistribution,
          current_mint_count: 0,
          max_mint_per_type: toy.maxMintPerType,
          available: true,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

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
      // Switch to Plasma chain
      await switchToPlasmaChain();
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
    }
  };

  const handlePurchase = async (toyId: number) => {
    if (!account) {
      await handleConnectWallet();
      return;
    }

    setPurchasing(toyId);
    setError("");

    try {
      // Get invoice
      const invoiceResponse = await fetch(`/api/game/toys/${toyId}/invoice`);
      if (invoiceResponse.status !== 402) {
        throw new Error("Failed to get invoice");
      }

      const invoice = await invoiceResponse.json();
      const paymentOptions = invoice.paymentOptions || [];

      // Find Plasma option
      const plasmaOption = paymentOptions.find(
        (opt: any) => opt.network === "plasma"
      );

      if (!plasmaOption) {
        throw new Error("No Plasma payment option available");
      }

      // Build EIP-3009 signature
      const token = plasmaOption.token;
      const to = plasmaOption.recipient;
      const chainId = plasmaOption.chainId || DEFAULTS.PLASMA_CHAIN_ID;
      const deadline = plasmaOption.deadline;
      const nonce32 =
        plasmaOption.nonce?.startsWith("0x")
          ? plasmaOption.nonce
          : "0x" + plasmaOption.nonce;
      const validAfter = Math.floor(Date.now() / 1000) - 1;
      const validBefore = deadline;
      const value = Number(plasmaOption.amount);

      const { name, version } = await fetchTokenNameAndVersion(
        DEFAULTS.PLASMA_RPC,
        token
      ).catch(() => ({ name: "USDTe", version: "1" }));

      const typed = buildTransferWithAuthorization(
        name,
        version,
        chainId,
        token,
        account,
        to,
        value,
        validAfter,
        validBefore,
        nonce32
      );

      // Sign with wallet
      const eth = (window as any).ethereum;
      if (!eth) {
        throw new Error("No wallet found");
      }

      const sigHex = (await eth.request({
        method: "eth_signTypedData_v4",
        params: [account, JSON.stringify(typed)],
      })) as string;

      const { v, r, s } = splitSignature(sigHex);

      // Submit payment
      const paymentPayload = {
        type: "payment-submitted",
        invoiceId: invoice.invoiceId,
        chosenOption: {
          network: "plasma",
          chainId,
          token,
          amount: String(value),
          from: account,
          to,
          nonce: nonce32,
          deadline: validBefore,
          validAfter,
          validBefore,
        },
        signature: { v, r, s },
        scheme: "eip3009-transfer-with-auth",
      };

      const purchaseResponse = await fetch("/api/game/toys/purchase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          toy_type_id: toyId,
          payment: paymentPayload,
        }),
      });

      const result = await purchaseResponse.json();

      if (result.success) {
        // Success! Show success message and reload toys
        alert(
          `Toy purchased! Token ID: ${result.token_id}, Rarity: ${result.rarity}`
        );
        loadToys();
        router.push("/inventory");
      } else {
        throw new Error(result.error || "Purchase failed");
      }
    } catch (err: any) {
      setError(err.message || "Purchase failed");
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <main className="xui-grid" style={{ paddingTop: 16, paddingBottom: 32 }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ textAlign: "center", marginBottom: "32px" }}
      >
        <h1 className="xui-card-title" style={{ fontSize: 32, marginBottom: "8px" }}>
          Trillionaire Toy Store
        </h1>
        <p style={{ opacity: 0.7, fontSize: "16px" }}>
          Collect rare toys, compete in games, and climb the leaderboard
        </p>
      </motion.div>

      {/* Wallet Connection */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            {account ? (
              <div style={{ fontSize: "14px" }}>
                <strong>Connected:</strong> {account.slice(0, 6)}…{account.slice(-4)}
              </div>
            ) : (
              <div style={{ fontSize: "14px", opacity: 0.7 }}>
                Connect your wallet to purchase toys
              </div>
            )}
          </div>
          <Button
            onClick={handleConnectWallet}
            variant={account ? "outline" : "primary"}
            disabled={!!account}
          >
            {account ? "Wallet Connected" : "Connect Rabby Wallet"}
          </Button>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card>
          <div style={{ color: "#ef4444", padding: "12px" }}>{error}</div>
        </Card>
      )}

      {/* Toy Grid */}
      {loading ? (
        <Card>
          <div style={{ textAlign: "center", padding: "32px" }}>Loading toys...</div>
        </Card>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "24px",
          }}
        >
          {toys.map((toy) => (
            <motion.div
              key={toy.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <Card
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  borderColor: toy.available ? undefined : "#ef4444",
                  opacity: toy.available ? 1 : 0.6,
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "24px",
                    minHeight: "120px",
                  }}
                >
                  <ToyIcon name={toy.icon_name} size={100} />
                </div>

                {/* Toy Info */}
                <div style={{ flex: 1, textAlign: "center", marginBottom: "16px" }}>
                  <h3 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "6px" }}>
                    {toy.name}
                  </h3>
                  <p style={{ fontSize: "14px", opacity: 0.7, marginBottom: "12px" }}>
                    {toy.description}
                  </p>

                  {/* Availability */}
                  <div style={{ fontSize: "12px", opacity: 0.6, marginBottom: "8px" }}>
                    {toy.current_mint_count}/{toy.max_mint_per_type} minted
                  </div>

                  {/* Price */}
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: 700,
                      color: "#60a5fa",
                      marginTop: "8px",
                    }}
                  >
                    {toy.price_usdt0.toFixed(2)} USDT0
                  </div>

                  {/* Rarity Distribution */}
                  <div
                    style={{
                      fontSize: "11px",
                      opacity: 0.6,
                      marginTop: "8px",
                      display: "flex",
                      justifyContent: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    {Object.entries(toy.rarity_distribution).map(([rarity, percent]) => (
                      <span key={rarity}>
                        {rarity}: {percent}%
                      </span>
                    ))}
                  </div>
                </div>

                {/* Purchase Button */}
                <Button
                  onClick={() => handlePurchase(toy.id)}
                  disabled={!toy.available || purchasing === toy.id}
                  variant="primary"
                  style={{ width: "100%" }}
                >
                  {purchasing === toy.id
                    ? "Purchasing..."
                    : !toy.available
                    ? "Sold Out"
                    : "Purchase"}
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </main>
  );
}

export default function ToyStorePage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px", textAlign: "center" }}>Loading...</div>}>
      <ToyStoreContent />
    </Suspense>
  );
}

