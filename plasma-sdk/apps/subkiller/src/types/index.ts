export interface Subscription {
  id: string;
  name: string;
  sender: string;
  email: string;
  estimatedCost: number;
  frequency: 'monthly' | 'yearly' | 'weekly' | 'unknown';
  category: SubscriptionCategory;
  lastSeen: Date;
  firstSeen: Date;
  emailCount: number;
  unsubscribeUrl?: string;
  managementUrl?: string;
  logoUrl?: string;
  status: 'active' | 'cancelling' | 'cancelled';
}

export type SubscriptionCategory = 
  | 'streaming'
  | 'software'
  | 'gaming'
  | 'news'
  | 'fitness'
  | 'food'
  | 'shopping'
  | 'finance'
  | 'education'
  | 'social'
  | 'productivity'
  | 'other';

export interface ScanResult {
  subscriptions: Subscription[];
  totalEstimatedMonthly: number;
  totalEstimatedYearly: number;
  scannedEmails: number;
  scanDuration: number;
}

export interface PaymentStatus {
  hasPaid: boolean;
  txHash?: string;
  paidAt?: Date;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: Date;
  snippet: string;
  listUnsubscribe?: string;
}

export interface CategorizeRequest {
  subscriptions: Partial<Subscription>[];
}

export interface CategorizeResponse {
  subscriptions: Subscription[];
}
