/**
 * ZKP2P Types - Fiat on-ramp integration
 */

export type PaymentPlatform = 
  | 'venmo'
  | 'zelle'
  | 'revolut'
  | 'wise'
  | 'cashapp'
  | 'paypal';

export interface ZKP2PConfig {
  /** Base URL for ZKP2P (default: https://www.zkp2p.xyz) */
  baseUrl?: string;
  /** Default payment platform */
  defaultPlatform?: PaymentPlatform;
  /** Callback URL after payment completion */
  callbackUrl?: string;
}

export interface OnrampRequest {
  /** Amount in USD to on-ramp */
  amount: string;
  /** Recipient wallet address */
  recipient: string;
  /** Payment platform to use */
  platform: PaymentPlatform;
  /** Optional reference ID for tracking */
  referenceId?: string;
}

export interface OnrampResponse {
  /** Deep link URL to ZKP2P */
  url: string;
  /** QR code data URL */
  qrCode?: string;
  /** Estimated time to completion (minutes) */
  estimatedTime: number;
  /** Reference ID for tracking */
  referenceId: string;
}

export interface OnrampStatus {
  /** Reference ID */
  referenceId: string;
  /** Current status */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** Amount in USD */
  amount: string;
  /** Amount in USDT0 received */
  receivedAmount?: string;
  /** Transaction hash on Plasma */
  txHash?: string;
  /** Timestamp of status update */
  updatedAt: string;
  /** Error message if failed */
  error?: string;
}

export interface PlatformInfo {
  id: PaymentPlatform;
  name: string;
  icon: string;
  minAmount: string;
  maxAmount: string;
  estimatedTime: string;
  available: boolean;
  regions: string[];
}

export const PLATFORM_INFO: Record<PaymentPlatform, PlatformInfo> = {
  venmo: {
    id: 'venmo',
    name: 'Venmo',
    icon: '💜',
    minAmount: '1',
    maxAmount: '4999',
    estimatedTime: '5-10 min',
    available: true,
    regions: ['US'],
  },
  zelle: {
    id: 'zelle',
    name: 'Zelle',
    icon: '💵',
    minAmount: '1',
    maxAmount: '2000',
    estimatedTime: '5-10 min',
    available: true,
    regions: ['US'],
  },
  revolut: {
    id: 'revolut',
    name: 'Revolut',
    icon: '🔵',
    minAmount: '1',
    maxAmount: '10000',
    estimatedTime: '5-15 min',
    available: true,
    regions: ['EU', 'UK', 'US'],
  },
  wise: {
    id: 'wise',
    name: 'Wise',
    icon: '🌍',
    minAmount: '1',
    maxAmount: '10000',
    estimatedTime: '10-30 min',
    available: true,
    regions: ['Global'],
  },
  cashapp: {
    id: 'cashapp',
    name: 'Cash App',
    icon: '💚',
    minAmount: '1',
    maxAmount: '7500',
    estimatedTime: '5-10 min',
    available: true,
    regions: ['US', 'UK'],
  },
  paypal: {
    id: 'paypal',
    name: 'PayPal',
    icon: '🅿️',
    minAmount: '1',
    maxAmount: '10000',
    estimatedTime: '10-20 min',
    available: true,
    regions: ['Global'],
  },
};
