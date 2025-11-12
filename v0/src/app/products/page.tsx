/**
 * Products Page
 * 
 * Displays the product catalog with Airbnb-style 3D icons.
 * Users can browse products and navigate to purchase them via the client page.
 */

"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PRODUCTS } from "../../lib/products";
import { ProductCard } from "../../components/ui/ProductCard";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function ProductsPage() {
  const router = useRouter();

  /**
   * Handle product purchase - navigate to client page with SKU pre-filled
   */
  const handlePurchase = (sku: string) => {
    // Navigate to client page with SKU parameter
    router.push(`/client?sku=${sku}`);
  };

  return (
    <main className="xui-grid" style={{ paddingTop: 16, paddingBottom: 32 }}>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ textAlign: "center", marginBottom: "32px" }}
      >
        <h1 className="xui-card-title" style={{ fontSize: 32, marginBottom: "8px" }}>
          Product Catalog
        </h1>
        <p style={{ opacity: 0.7, fontSize: "16px" }}>
          Browse our collection of digital products and services
        </p>
      </motion.div>

      {/* Product Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px",
          marginBottom: "32px",
        }}
      >
        {PRODUCTS.map((product) => (
          <ProductCard
            key={product.sku}
            product={product}
            onPurchase={handlePurchase}
          />
        ))}
      </div>

      {/* Info Card */}
      <Card title="How to Purchase" subtitle="Simple payment flow">
        <div style={{ display: "grid", gap: "12px" }}>
          <p style={{ opacity: 0.8, lineHeight: 1.6 }}>
            Click on any product card above to start the purchase process. You'll be redirected
            to the client page where you can connect your wallet and complete the payment using
            EIP-3009 on Plasma.
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Button variant="outline" onClick={() => router.push("/client")}>
              Go to Client Demo →
            </Button>
            <Button variant="ghost" onClick={() => router.push("/")}>
              ← Back to Home
            </Button>
          </div>
        </div>
      </Card>
    </main>
  );
}

