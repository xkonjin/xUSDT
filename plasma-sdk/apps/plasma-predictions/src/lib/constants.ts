import { PLASMA_MAINNET_CHAIN_ID, USDT0_ADDRESS } from "@plasma-pay/core";

export { PLASMA_MAINNET_CHAIN_ID, USDT0_ADDRESS };

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export const GASLESS_ROUTER_ADDRESS =
  process.env.NEXT_PUBLIC_GASLESS_ROUTER || "";

export const CTF_ADDRESS = process.env.NEXT_PUBLIC_CTF_ADDRESS || "";

export const AMM_FACTORY_ADDRESS =
  process.env.NEXT_PUBLIC_AMM_FACTORY || "";

export const MARKET_CATEGORIES = [
  { id: "all", label: "All", emoji: "🔥" },
  { id: "politics", label: "Politics", emoji: "🗳️" },
  { id: "crypto", label: "Crypto", emoji: "₿" },
  { id: "sports", label: "Sports", emoji: "⚽" },
  { id: "tech", label: "Tech", emoji: "💻" },
  { id: "entertainment", label: "Entertainment", emoji: "🎬" },
  { id: "science", label: "Science", emoji: "🔬" },
  { id: "finance", label: "Finance", emoji: "📈" },
] as const;

export const SLIPPAGE_OPTIONS = [
  { value: 0.5, label: "0.5%" },
  { value: 1, label: "1%" },
  { value: 2, label: "2%" },
  { value: 5, label: "5%" },
] as const;

export const QUICK_AMOUNTS = [5, 10, 25, 50, 100] as const;

export const MIN_BET_AMOUNT = 1_000_000; // 1 USDT0 (6 decimals)
export const MAX_BET_AMOUNT = 10_000_000_000; // 10,000 USDT0

export const USDT0_DECIMALS = 6;

export function formatUSDT(amount: bigint | number): string {
  const value =
    typeof amount === "bigint"
      ? Number(amount) / 10 ** USDT0_DECIMALS
      : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseUSDT(amount: string | number): bigint {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return BigInt(Math.floor(value * 10 ** USDT0_DECIMALS));
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatPrice(price: number): string {
  return `${Math.round(price * 100)}¢`;
}

export function formatTimeLeft(endDate: string): string {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();

  if (diff < 0) return "Ended";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 30) {
    const months = Math.floor(days / 30);
    return `${months}mo left`;
  }
  if (days > 0) return `${days}d left`;
  if (hours > 0) return `${hours}h left`;
  return "< 1h left";
}

export function formatVolume(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

export function formatAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
