/**
 * Toy Catalog Definitions
 * 
 * This file defines all available toy types for the Trillionaire Toy Store Game.
 * Each toy has a name, description, base price, icon component name, and stat categories.
 * 
 * Toys are minted as NFTs on Plasma with random rarity tiers and generated stats.
 * Maximum 10 mints per toy type for scarcity.
 */

export interface ToyType {
  /** Unique toy type ID */
  id: number;
  /** Display name */
  name: string;
  /** Description for the toy */
  description: string;
  /** Base price in USDT0 atomic units (6 decimals) */
  basePriceUsdt0: number;
  /** Icon component name (matches ToyIcons.tsx) */
  iconName: string;
  /** Stat categories this toy type has */
  statCategories: string[];
  /** Rarity distribution percentages */
  rarityDistribution: {
    common: number;
    rare: number;
    epic: number;
    legendary: number;
  };
  /** Maximum mints allowed for this toy type */
  maxMintPerType: number;
}

/**
 * Toy catalog - 20 unique toy types with varied pricing and stats
 * 
 * Pricing ranges from 0.01 USDT0 (10,000 atomic) to 1.0 USDT0 (1,000,000 atomic)
 * Each toy has 3-5 stat categories that affect game performance
 */
export const TOY_CATALOG: ToyType[] = [
  {
    id: 1,
    name: "Robot",
    description: "A classic robot companion with mechanical precision",
    basePriceUsdt0: 100_000, // 0.1 USDT0
    iconName: "robot",
    statCategories: ["Speed", "Power", "Precision"],
    rarityDistribution: { common: 60, rare: 25, epic: 10, legendary: 5 },
    maxMintPerType: 10,
  },
  {
    id: 2,
    name: "Teddy Bear",
    description: "A cuddly teddy bear that brings comfort and luck",
    basePriceUsdt0: 50_000, // 0.05 USDT0
    iconName: "teddy-bear",
    statCategories: ["Luck", "Defense", "Magic"],
    rarityDistribution: { common: 60, rare: 25, epic: 10, legendary: 5 },
    maxMintPerType: 10,
  },
  {
    id: 3,
    name: "Race Car",
    description: "A speedy race car built for velocity and performance",
    basePriceUsdt0: 150_000, // 0.15 USDT0
    iconName: "race-car",
    statCategories: ["Speed", "Power", "Precision"],
    rarityDistribution: { common: 60, rare: 25, epic: 10, legendary: 5 },
    maxMintPerType: 10,
  },
  {
    id: 4,
    name: "Magic Wand",
    description: "A mystical wand that channels magical energy",
    basePriceUsdt0: 200_000, // 0.2 USDT0
    iconName: "magic-wand",
    statCategories: ["Magic", "Luck", "Power"],
    rarityDistribution: { common: 60, rare: 25, epic: 10, legendary: 5 },
    maxMintPerType: 10,
  },
  {
    id: 5,
    name: "Space Ship",
    description: "An interstellar vessel exploring the cosmos",
    basePriceUsdt0: 300_000, // 0.3 USDT0
    iconName: "space-ship",
    statCategories: ["Speed", "Magic", "Power", "Defense"],
    rarityDistribution: { common: 60, rare: 25, epic: 10, legendary: 5 },
    maxMintPerType: 10,
  },
  {
    id: 6,
    name: "Dragon",
    description: "A fierce dragon guardian with ancient power",
    basePriceUsdt0: 500_000, // 0.5 USDT0
    iconName: "dragon",
    statCategories: ["Power", "Magic", "Defense", "Speed"],
    rarityDistribution: { common: 60, rare: 25, epic: 10, legendary: 5 },
    maxMintPerType: 10,
  },
  {
    id: 7,
    name: "Unicorn",
    description: "A magical unicorn radiating pure luck and magic",
    basePriceUsdt0: 400_000, // 0.4 USDT0
    iconName: "unicorn",
    statCategories: ["Luck", "Magic", "Speed"],
    rarityDistribution: { common: 60, rare: 25, epic: 10, legendary: 5 },
    maxMintPerType: 10,
  },
  {
    id: 8,
    name: "Pirate Ship",
    description: "A treasure-hunting pirate ship on the high seas",
    basePriceUsdt0: 250_000, // 0.25 USDT0
    iconName: "pirate-ship",
    statCategories: ["Luck", "Power", "Defense"],
    rarityDistribution: { common: 60, rare: 25, epic: 10, legendary: 5 },
    maxMintPerType: 10,
  },
  {
    id: 9,
    name: "Castle",
    description: "A fortified castle providing strong defense",
    basePriceUsdt0: 350_000, // 0.35 USDT0
    iconName: "castle",
    statCategories: ["Defense", "Power", "Magic"],
    rarityDistribution: { common: 60, rare: 25, epic: 10, legendary: 5 },
    maxMintPerType: 10,
  },
  {
    id: 10,
    name: "Treasure Chest",
    description: "A mysterious chest filled with luck and fortune",
    basePriceUsdt0: 180_000, // 0.18 USDT0
    iconName: "treasure-chest",
    statCategories: ["Luck", "Magic"],
    rarityDistribution: { common: 60, rare: 25, epic: 10, legendary: 5 },
    maxMintPerType: 10,
  },
  {
    id: 11,
    name: "Ninja",
    description: "A stealthy ninja warrior with precision and speed",
    basePriceUsdt0: 220_000, // 0.22 USDT0
    iconName: "ninja",
    statCategories: ["Speed", "Precision", "Power"],
    rarityDistribution: { common: 60, rare: 25, epic: 10, legendary: 5 },
    maxMintPerType: 10,
  },
  {
    id: 12,
    name: "Wizard",
    description: "A wise wizard mastering arcane magic",
    basePriceUsdt0: 280_000, // 0.28 USDT0
    iconName: "wizard",
    statCategories: ["Magic", "Power", "Luck"],
    rarityDistribution: { common: 60, rare: 25, epic: 10, legendary: 5 },
    maxMintPerType: 10,
  },
  {
    id: 13,
    name: "Knight",
    description: "A valiant knight in shining armor",
    basePriceUsdt0: 240_000, // 0.24 USDT0
    iconName: "knight",
    statCategories: ["Defense", "Power", "Precision"],
    rarityDistribution: { common: 60, rare: 25, epic: 10, legendary: 5 },
    maxMintPerType: 10,
  },
  {
    id: 14,
    name: "Phoenix",
    description: "A legendary phoenix reborn from flames",
    basePriceUsdt0: 600_000, // 0.6 USDT0
    iconName: "phoenix",
    statCategories: ["Magic", "Power", "Speed", "Luck"],
    rarityDistribution: { common: 60, rare: 25, epic: 10, legendary: 5 },
    maxMintPerType: 10,
  },
  {
    id: 15,
    name: "Samurai",
    description: "An honorable samurai warrior with unmatched precision",
    basePriceUsdt0: 320_000, // 0.32 USDT0
    iconName: "samurai",
    statCategories: ["Precision", "Power", "Defense"],
    rarityDistribution: { common: 60, rare: 25, epic: 10, legendary: 5 },
    maxMintPerType: 10,
  },
  {
    id: 16,
    name: "Mermaid",
    description: "A mystical mermaid with enchanting magic",
    basePriceUsdt0: 270_000, // 0.27 USDT0
    iconName: "mermaid",
    statCategories: ["Magic", "Luck", "Speed"],
    rarityDistribution: { common: 60, rare: 25, epic: 10, legendary: 5 },
    maxMintPerType: 10,
  },
  {
    id: 17,
    name: "Golem",
    description: "A powerful stone golem with immense defense",
    basePriceUsdt0: 380_000, // 0.38 USDT0
    iconName: "golem",
    statCategories: ["Defense", "Power", "Precision"],
    rarityDistribution: { common: 60, rare: 25, epic: 10, legendary: 5 },
    maxMintPerType: 10,
  },
  {
    id: 18,
    name: "Fairy",
    description: "A tiny fairy with incredible luck and magic",
    basePriceUsdt0: 160_000, // 0.16 USDT0
    iconName: "fairy",
    statCategories: ["Luck", "Magic", "Speed"],
    rarityDistribution: { common: 60, rare: 25, epic: 10, legendary: 5 },
    maxMintPerType: 10,
  },
  {
    id: 19,
    name: "Cyborg",
    description: "A futuristic cyborg with enhanced abilities",
    basePriceUsdt0: 450_000, // 0.45 USDT0
    iconName: "cyborg",
    statCategories: ["Speed", "Power", "Precision", "Defense"],
    rarityDistribution: { common: 60, rare: 25, epic: 10, legendary: 5 },
    maxMintPerType: 10,
  },
  {
    id: 20,
    name: "Crystal Ball",
    description: "A mystical crystal ball revealing fortune and magic",
    basePriceUsdt0: 10_000, // 0.01 USDT0 (entry-level toy)
    iconName: "crystal-ball",
    statCategories: ["Luck", "Magic"],
    rarityDistribution: { common: 60, rare: 25, epic: 10, legendary: 5 },
    maxMintPerType: 10,
  },
];

/**
 * Get toy type by ID
 */
export function getToyTypeById(id: number): ToyType | undefined {
  return TOY_CATALOG.find((toy) => toy.id === id);
}

/**
 * Get toy type by icon name
 */
export function getToyTypeByIconName(iconName: string): ToyType | undefined {
  return TOY_CATALOG.find((toy) => toy.iconName === iconName);
}

/**
 * Rarity tier definitions with multipliers
 */
export const RARITY_TIERS = {
  common: {
    name: "Common",
    multiplier: 1.0,
    color: "#767676", // Gray
  },
  rare: {
    name: "Rare",
    multiplier: 1.5,
    color: "#00A699", // Teal
  },
  epic: {
    name: "Epic",
    multiplier: 2.0,
    color: "#FF5A5F", // Coral
  },
  legendary: {
    name: "Legendary",
    multiplier: 3.0,
    color: "#FFD700", // Gold
  },
} as const;

/**
 * Stat category definitions
 */
export const STAT_CATEGORIES = {
  Speed: {
    name: "Speed",
    description: "Increases reaction time and movement speed",
    icon: "⚡",
  },
  Power: {
    name: "Power",
    description: "Increases damage and strength",
    icon: "💪",
  },
  Precision: {
    name: "Precision",
    description: "Improves accuracy and timing",
    icon: "🎯",
  },
  Defense: {
    name: "Defense",
    description: "Reduces damage taken",
    icon: "🛡️",
  },
  Magic: {
    name: "Magic",
    description: "Enhances magical abilities and bonuses",
    icon: "✨",
  },
  Luck: {
    name: "Luck",
    description: "Increases chance-based outcomes",
    icon: "🍀",
  },
} as const;

/**
 * Calculate price in USDT0 (human-readable)
 */
export function formatPriceUsdt0(atomicUnits: number): string {
  return (atomicUnits / 1_000_000).toFixed(2);
}

/**
 * Parse USDT0 price to atomic units
 */
export function parsePriceUsdt0(usdt0: string | number): number {
  const num = typeof usdt0 === "string" ? parseFloat(usdt0) : usdt0;
  return Math.floor(num * 1_000_000);
}

