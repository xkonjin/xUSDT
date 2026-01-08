// Import Plasma mainnet chain ID and USDT0 token address
import { USDT0_ADDRESS, PLASMA_MAINNET_CHAIN_ID } from '@plasma-pay/core';
import { buildTransferAuthorizationTypedData, createTransferParams } from '@plasma-pay/gasless';
import type { PaymentStatus } from '@/types';

// SubKiller payment: $0.99 one-time
export const SUBKILLER_PRICE = 990000n; // 0.99 USDT0 (6 decimals)
export const SUBKILLER_PRICE_DISPLAY = '$0.99';

// Merchant address for SubKiller payments
const MERCHANT_ADDRESS = process.env.NEXT_PUBLIC_MERCHANT_ADDRESS || '0x0000000000000000000000000000000000000000';

export interface PaymentRequest {
  from: string;
  signature: string;
  nonce: string;
  validAfter: number;
  validBefore: number;
}

/**
 * Create EIP-712 typed data for SubKiller payment authorization
 * Uses createTransferParams with positional arguments: (from, to, value, options)
 */
export function createPaymentTypedData(userAddress: string) {
  // createTransferParams expects (from, to, value, options) not an object
  const params = createTransferParams(
    userAddress as `0x${string}`,
    MERCHANT_ADDRESS as `0x${string}`,
    SUBKILLER_PRICE
  );

  return buildTransferAuthorizationTypedData(params, {
    chainId: PLASMA_MAINNET_CHAIN_ID,
    tokenAddress: USDT0_ADDRESS,
  });
}

export async function verifyPayment(invoiceId: string): Promise<PaymentStatus> {
  // Check with backend if payment has been processed
  const response = await fetch(`/api/pay/verify?invoiceId=${invoiceId}`);
  if (!response.ok) {
    return { hasPaid: false };
  }
  
  const data = await response.json();
  return {
    hasPaid: data.status === 'completed',
    txHash: data.txHash,
    paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
  };
}

export async function submitPayment(
  invoiceId: string,
  userAddress: string,
  signature: string,
  typedData: ReturnType<typeof createPaymentTypedData>
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const response = await fetch('/api/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invoiceId,
      type: 'payment-submitted',
      chosenOption: {
        network: 'plasma',
        chainId: PLASMA_MAINNET_CHAIN_ID,
        token: USDT0_ADDRESS,
        amount: SUBKILLER_PRICE.toString(),
        decimals: 6,
        recipient: MERCHANT_ADDRESS,
      },
      signature: splitSignature(signature),
      typedData,
      scheme: 'eip3009-transfer-with-auth',
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    return { success: false, error: data.error || 'Payment failed' };
  }

  return { success: true, txHash: data.txHash };
}

function splitSignature(signature: string): { v: number; r: string; s: string } {
  const sig = signature.startsWith('0x') ? signature.slice(2) : signature;
  const r = '0x' + sig.slice(0, 64);
  const s = '0x' + sig.slice(64, 128);
  const v = parseInt(sig.slice(128, 130), 16);
  return { v, r, s };
}
