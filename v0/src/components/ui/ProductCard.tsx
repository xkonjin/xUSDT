/**
 * ProductCard Component
 * 
 * Displays a product card with Airbnb-style 3D icon, product information,
 * and purchase action. Designed to match Airbnb's 2025 design aesthetic
 * with soft shadows, rounded corners, and isometric icons.
 */

"use client";

import { motion } from "framer-motion";
import { Product } from "../../lib/products";
import { ProductIcon } from "../icons/ProductIcon";
import { Button } from "./Button";

interface ProductCardProps {
  /** Product data to display */
  product: Product;
  /** Callback when user clicks to purchase */
  onPurchase?: (sku: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ProductCard: Airbnb-style product card with 3D icon
 * 
 * Features:
 * - 3D isometric icon matching Airbnb style
 * - Soft shadows and rounded corners
 * - Color-themed card matching product
 * - Smooth hover animations
 * - Purchase action button
 */
export function ProductCard({ product, onPurchase, className = "" }: ProductCardProps) {
  const handlePurchase = () => {
    if (onPurchase) {
      onPurchase(product.sku);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`product-card ${className}`}
      style={{
        border: `1px solid ${product.colorTheme.secondary}40`,
        background: `linear-gradient(135deg, ${product.colorTheme.accent}20, ${product.colorTheme.secondary}10)`,
        borderRadius: "20px",
        padding: "24px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
        cursor: onPurchase ? "pointer" : "default",
        transition: "all 0.2s ease",
      }}
    >
      {/* Icon Container */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: "16px",
          padding: "12px",
        }}
      >
        <ProductIcon name={product.iconName} size={100} />
      </div>

      {/* Product Info */}
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <h3
          style={{
            fontSize: "20px",
            fontWeight: 600,
            marginBottom: "6px",
            color: product.colorTheme.primary,
          }}
        >
          {product.name}
        </h3>
        <p
          style={{
            fontSize: "14px",
            opacity: 0.7,
            marginBottom: "12px",
            lineHeight: 1.5,
          }}
        >
          {product.description}
        </p>
        <div
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: product.colorTheme.primary,
            marginTop: "8px",
          }}
        >
          {product.price.toFixed(2)} USDT0
        </div>
        <div
          style={{
            fontSize: "12px",
            opacity: 0.6,
            marginTop: "4px",
          }}
        >
          {product.amountAtomic.toLocaleString()} atomic units
        </div>
      </div>

      {/* Purchase Button */}
      {onPurchase && (
        <div style={{ marginTop: "16px" }}>
          <Button
            variant="primary"
            onClick={handlePurchase}
            style={{
              width: "100%",
              background: `linear-gradient(135deg, ${product.colorTheme.primary}, ${product.colorTheme.primary}dd)`,
              border: "none",
            }}
          >
            Purchase
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export default ProductCard;

