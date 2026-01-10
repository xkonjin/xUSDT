/**
 * Plasma Pay Mobile API Client
 * 
 * Connects to the Plasma Venmo API for all payment operations.
 */

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://plasma-venmo.vercel.app';

export interface SendMoneyParams {
  from: string;
  to: string;
  amount: string;
  memo?: string;
}

export interface ClaimParams {
  token: string;
  claimerAddress: string;
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
  email?: string;
}

export interface Transaction {
  id: string;
  type: 'sent' | 'received';
  amount: string;
  counterparty: string;
  timestamp: number;
  txHash: string;
}

class PlasmaAPI {
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

  // User Settings
  async getUserSettings(address: string): Promise<{ settings: UserSettings }> {
    return this.request(`/api/user-settings?address=${address}`);
  }

  async updateUserSettings(data: Partial<UserSettings> & { walletAddress: string }): Promise<{ settings: UserSettings }> {
    return this.request('/api/user-settings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Referrals
  async getReferralStats(address: string): Promise<{ stats: ReferralStats }> {
    return this.request(`/api/referrals?address=${address}`);
  }

  async createReferral(data: {
    referrerAddress: string;
    refereeAddress: string;
    source?: string;
  }): Promise<{ success: boolean }> {
    return this.request('/api/referrals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Transaction History
  async getTransactions(address: string): Promise<{ transactions: Transaction[] }> {
    return this.request(`/api/history?address=${address}`);
  }

  // Claims
  async getClaim(token: string): Promise<{ claim: any }> {
    return this.request(`/api/claims/${token}`);
  }

  async executeClaim(token: string, claimerAddress: string): Promise<{ txHash: string }> {
    return this.request(`/api/claims/${token}`, {
      method: 'POST',
      body: JSON.stringify({ claimerAddress }),
    });
  }

  // Payment Links
  async getPaymentLink(id: string): Promise<{ paymentLink: any }> {
    return this.request(`/api/payment-links/${id}`);
  }

  async payPaymentLink(id: string, payerAddress: string): Promise<{ txHash: string }> {
    return this.request(`/api/payment-links/${id}`, {
      method: 'POST',
      body: JSON.stringify({ payerAddress }),
    });
  }

  // Submit Transfer (gasless)
  async submitTransfer(data: {
    from: string;
    to: string;
    value: string;
    validAfter: number;
    validBefore: number;
    nonce: string;
    v: number;
    r: string;
    s: string;
  }): Promise<{ txHash: string }> {
    return this.request('/api/relay', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Gas Sponsorship Check
  async checkGasEligibility(address: string): Promise<{
    eligible: boolean;
    stats: {
      txCount: number;
      txLimit: number;
      remaining: number;
    };
  }> {
    return this.request(`/api/gas-sponsorship?address=${address}`);
  }

  // Share Links
  async createShareLink(data: {
    creatorAddress: string;
    type: string;
    targetUrl?: string;
    targetData?: any;
    channel?: string;
  }): Promise<{ link: any; shareUrl: string }> {
    return this.request('/api/share-links', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new PlasmaAPI();
export default api;
