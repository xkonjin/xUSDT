/**
 * Plasma Pay API Client for Telegram WebApp
 * 
 * Connects to the Plasma Venmo backend API.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://plasma-venmo.vercel.app';

export interface SendMoneyParams {
  from: string;
  to: string;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
  v: number;
  r: string;
  s: string;
}

export interface PaymentRequest {
  id: string;
  fromAddress: string;
  toIdentifier: string;
  amount: number;
  memo?: string;
  status: string;
  expiresAt: string;
}

export interface Stream {
  id: string;
  sender: string;
  recipient: string;
  depositAmount: string;
  withdrawnAmount: string;
  startTime: number;
  endTime: number;
  active: boolean;
}

export interface ReferralStats {
  totalReferred: number;
  pendingRewards: number;
  paidRewards: number;
  totalEarned: number;
}

export interface UserSettings {
  referralCode: string;
  displayName?: string;
}

class TelegramAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // User Settings & Referrals
  async getUserSettings(address: string): Promise<{ settings: UserSettings }> {
    return this.request(`/api/user-settings?address=${address}`);
  }

  async getReferralStats(address: string): Promise<{ stats: ReferralStats }> {
    return this.request(`/api/referrals?address=${address}`);
  }

  async createReferral(referrerAddress: string, refereeAddress: string): Promise<void> {
    await this.request('/api/referrals', {
      method: 'POST',
      body: JSON.stringify({
        referrerAddress,
        refereeAddress,
        source: 'telegram',
      }),
    });
  }

  // Payments
  async submitTransfer(params: SendMoneyParams): Promise<{ txHash: string }> {
    return this.request('/api/relay', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async resolveRecipient(identifier: string): Promise<{ address: string; type: string }> {
    return this.request('/api/resolve-recipient', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  }

  // Payment Requests
  async createPaymentRequest(data: {
    fromAddress: string;
    toIdentifier: string;
    amount: number;
    memo?: string;
  }): Promise<{ request: PaymentRequest }> {
    return this.request('/api/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPaymentRequests(address: string): Promise<{ requests: PaymentRequest[] }> {
    return this.request(`/api/requests?address=${address}`);
  }

  // Streams
  async getStreams(address: string, role: 'sending' | 'receiving'): Promise<{ streams: Stream[] }> {
    return this.request(`/api/streams?address=${address}&role=${role}`);
  }

  async withdrawFromStream(streamId: string, recipientAddress: string): Promise<{ txHash: string; amount: string }> {
    return this.request('/api/streams/withdraw', {
      method: 'POST',
      body: JSON.stringify({ streamId, recipientAddress }),
    });
  }

  // Transaction History
  async getTransactions(address: string): Promise<{ transactions: any[] }> {
    return this.request(`/api/history?address=${address}`);
  }

  // Balance
  async getBalance(address: string): Promise<{ balance: string; formatted: string }> {
    // For now, query directly from chain
    // In production, could cache this in backend
    return { balance: '0', formatted: '0.00' };
  }

  // Share Links
  async createShareLink(data: {
    creatorAddress: string;
    type: string;
    targetUrl?: string;
    targetData?: any;
    channel?: string;
  }): Promise<{ shareUrl: string }> {
    return this.request('/api/share-links', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new TelegramAPI();
export default api;
