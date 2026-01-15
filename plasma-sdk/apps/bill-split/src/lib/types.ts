import type { Address } from 'viem';

export interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  assignedToParticipantIds: string[];
}

export interface Participant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  color: string;
  share: number;
  assignedItemIds: string[];
  paid: boolean;
  paidAt?: Date;
  txHash?: string;
}

export interface Bill {
  id: string;
  title: string;
  creatorAddress: Address;
  items: BillItem[];
  participants: Participant[];
  subtotal: number;
  tax: number;
  taxPercent: number;
  tip: number;
  tipPercent: number;
  total: number;
  currency: string;
  receiptImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'active' | 'completed';
}

export interface PaymentLink {
  billId: string;
  participantId: string;
  amount: number;
  token: string;
  url: string;
  expiresAt: Date;
}

export interface ReceiptScanResult {
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
  merchant?: string;
  date?: string;
  confidence: number;
}

export const SUPPORTED_TOKENS = [
  { symbol: 'USDT0', name: 'USDT0 (Plasma)', chainId: 9745, address: '0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb', native: true },
  { symbol: 'ETH', name: 'Ethereum', chainId: 1, address: '0x0000000000000000000000000000000000000000', native: false },
  { symbol: 'USDC', name: 'USDC (Ethereum)', chainId: 1, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', native: false },
  { symbol: 'USDT', name: 'USDT (Ethereum)', chainId: 1, address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', native: false },
  { symbol: 'SOL', name: 'Solana', chainId: 0, address: '', native: false },
  { symbol: 'USDC', name: 'USDC (Base)', chainId: 8453, address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', native: false },
] as const;

// Splitzy participant colors - teal brand palette
export const PARTICIPANT_COLORS = [
  '#14b8a6', // teal (brand primary)
  '#fb7185', // coral
  '#fbbf24', // amber
  '#a78bfa', // violet
  '#34d399', // emerald
  '#fb923c', // orange
  '#f472b6', // pink
  '#38bdf8', // sky
] as const;
