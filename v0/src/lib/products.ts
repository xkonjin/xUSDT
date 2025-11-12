/**
 * Product Catalog Data
 * 
 * This file defines the product catalog structure for the xUSDT payment demo.
 * Each product corresponds to a SKU in the merchant service and includes
 * metadata like name, description, price, and icon information.
 */

export interface Product {
  /** SKU identifier matching merchant service catalog */
  sku: string;
  /** Display name for the product */
  name: string;
  /** Product description */
  description: string;
  /** Price in atomic units (6 decimals) */
  amountAtomic: number;
  /** Price in USDT0 (human-readable) */
  price: number;
  /** Icon component name (used to load SVG) */
  iconName: string;
  /** Color theme for the product card */
  colorTheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

/**
 * Product catalog matching merchant_service.py SKU definitions
 * 
 * Products:
 * - premium: Premium API access (0.1 USDT0)
 * - vip-pass: VIP Access NFT (3.0 USDT0)
 * - default: Generic product fallback (0.01 USDT0)
 */
export const PRODUCTS: Product[] = [
  {
    sku: "premium",
    name: "Premium Access",
    description: "Unlock premium API features and exclusive content",
    amountAtomic: 100_000,
    price: 0.1,
    iconName: "premium",
    colorTheme: {
      primary: "#FF5A5F", // Airbnb coral
      secondary: "#FFB4B8", // Light coral
      accent: "#FFD3D5", // Very light coral
    },
  },
  {
    sku: "vip-pass",
    name: "VIP Pass",
    description: "VIP Access NFT with special privileges",
    amountAtomic: 3_000_000,
    price: 3.0,
    iconName: "vip-pass",
    colorTheme: {
      primary: "#00A699", // Airbnb teal
      secondary: "#66D4C7", // Light teal
      accent: "#B3E8E1", // Very light teal
    },
  },
  {
    sku: "default",
    name: "Standard Product",
    description: "Standard product access",
    amountAtomic: 10_000,
    price: 0.01,
    iconName: "default",
    colorTheme: {
      primary: "#767676", // Airbnb gray
      secondary: "#A8A8A8", // Light gray
      accent: "#D3D3D3", // Very light gray
    },
  },
];

/**
 * Get product by SKU
 */
export function getProductBySku(sku: string): Product | undefined {
  return PRODUCTS.find((p) => p.sku === sku);
}

/**
 * Get default product (fallback)
 */
export function getDefaultProduct(): Product {
  return PRODUCTS.find((p) => p.sku === "default") || PRODUCTS[0];
}

