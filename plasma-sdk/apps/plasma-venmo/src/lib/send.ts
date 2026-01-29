import type { Address, Hex } from 'viem';
import { parseUnits } from 'viem';
import type { PlasmaEmbeddedWallet } from '@plasma-pay/privy-auth';
import {
  createTransferParams,
  buildTransferAuthorizationTypedData,
} from '@plasma-pay/gasless';
import {
  PLASMA_MAINNET_CHAIN_ID,
  USDT0_ADDRESS,
} from '@plasma-pay/core';
import { withRetry, isRetryableError } from './retry';
import { splitSignature } from './crypto';

interface SendMoneyOptions {
  recipientIdentifier: string;
  amount: string;
  memo?: string;
  senderEmail?: string;
}

interface SendMoneyResult {
  success: boolean;
  txHash?: string;
  claimUrl?: string;
  needsClaim?: boolean;
  error?: string;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') return fallback;
  const data = error as { message?: string; error?: string };
  return data.message || data.error || fallback;
};

export async function sendMoney(
  wallet: PlasmaEmbeddedWallet,
  options: SendMoneyOptions
): Promise<SendMoneyResult> {
  const { recipientIdentifier, amount, memo, senderEmail } = options;

  // Step 1: Try to resolve recipient
  const resolveResponse = await fetch('/api/resolve-recipient', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: recipientIdentifier }),
  });

  if (!resolveResponse.ok) {
    const error = await resolveResponse.json().catch(() => ({}));
    return { success: false, error: getErrorMessage(error, 'Failed to resolve recipient') };
  }

  const resolveData = await resolveResponse.json();

  // Step 2: Check if recipient needs a claim link (not registered)
  if (resolveData.needsClaim) {
    return await createClaimForUnregisteredRecipient(
      wallet,
      recipientIdentifier,
      amount,
      memo,
      senderEmail
    );
  }

  const recipientAddress = resolveData.address as Address;
  const amountInUnits = parseUnits(amount, 6);

  // Step 3: Create transfer params and sign
  const params = createTransferParams(
    wallet.address,
    recipientAddress,
    amountInUnits
  );

  const typedData = buildTransferAuthorizationTypedData(params, {
    chainId: PLASMA_MAINNET_CHAIN_ID,
    tokenAddress: USDT0_ADDRESS,
  });

  const signature = await wallet.signTypedData(typedData);
  const { v, r, s } = splitSignature(signature);

  // Step 4: Submit transfer with retry
  // Generate a unique idempotency key based on the nonce and timestamp
  // This ensures retries use the same key but different transactions get different keys
  const idempotencyKey = `${params.nonce}-${Date.now()}`;
  
  try {
    const result = await withRetry(
      async () => {
        const submitResponse = await fetch('/api/submit-transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: params.from,
            to: params.to,
            value: params.value.toString(),
            validAfter: params.validAfter,
            validBefore: params.validBefore,
            nonce: params.nonce,
            v,
            r,
            s,
            idempotencyKey,
          }),
        });

        if (!submitResponse.ok) {
          const error = await submitResponse.json().catch(() => ({}));
          const errorMessage = error.message || 'Failed to submit transfer';
          throw new Error(errorMessage);
        }

        return await submitResponse.json();
      },
      {
        maxAttempts: 3,
        retryOn: isRetryableError,
      }
    );

    return { success: true, txHash: result.txHash };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to submit transfer' 
    };
  }
}

/**
 * Create a claim for an unregistered recipient
 * The funds are held in escrow until the recipient signs up and claims them
 */
async function createClaimForUnregisteredRecipient(
  wallet: PlasmaEmbeddedWallet,
  recipientIdentifier: string,
  amount: string,
  memo?: string,
  senderEmail?: string
): Promise<SendMoneyResult> {
  const amountInUnits = parseUnits(amount, 6);
  
  // Get escrow/treasury address from env
  const escrowAddress = process.env.NEXT_PUBLIC_MERCHANT_ADDRESS as Address;
  
  if (!escrowAddress) {
    console.warn('[send] NEXT_PUBLIC_MERCHANT_ADDRESS not configured - claim links unavailable');
    return { 
      success: false, 
      error: 'Claim links are currently unavailable. Please send to a registered user or wallet address.' 
    };
  }

  // Create transfer to escrow
  const params = createTransferParams(
    wallet.address,
    escrowAddress,
    amountInUnits
  );

  const typedData = buildTransferAuthorizationTypedData(params, {
    chainId: PLASMA_MAINNET_CHAIN_ID,
    tokenAddress: USDT0_ADDRESS,
  });

  // Sign the authorization
  const signature = await wallet.signTypedData(typedData);
  const { v, r, s } = splitSignature(signature);

  // Determine if recipient is email or phone
  const isEmail = recipientIdentifier.includes('@');
  const recipientEmail = isEmail ? recipientIdentifier : undefined;
  const recipientPhone = !isEmail ? recipientIdentifier : undefined;

  // Create claim with the signed authorization
  const claimResponse = await fetch('/api/claims', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      senderAddress: wallet.address,
      senderEmail,
      recipientEmail,
      recipientPhone,
      authorization: {
        from: params.from,
        to: params.to,
        value: params.value.toString(),
        validAfter: params.validAfter,
        validBefore: params.validBefore,
        nonce: params.nonce,
        v,
        r,
        s,
      },
      amount,
      memo,
    }),
  });

  if (!claimResponse.ok) {
    const error = await claimResponse.json().catch(() => ({}));
    return { success: false, error: getErrorMessage(error, 'Failed to create claim') };
  }

  const claimResult = await claimResponse.json();
  
  // Now submit the transfer to escrow
  const submitResponse = await fetch('/api/submit-transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      value: params.value.toString(),
      validAfter: params.validAfter,
      validBefore: params.validBefore,
      nonce: params.nonce,
      v,
      r,
      s,
    }),
  });

  if (!submitResponse.ok) {
    const error = await submitResponse.json().catch(() => ({}));
    return { success: false, error: getErrorMessage(error, 'Transfer to escrow failed') };
  }

  // Trigger notification email
  if (recipientEmail) {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientEmail,
        type: 'claim_available',
        data: {
          amount,
          senderAddress: wallet.address,
          senderEmail,
          claimUrl: claimResult.claimUrl,
          memo,
        },
      }),
    }).catch(console.error);
  }

  return { 
    success: true, 
    needsClaim: true,
    claimUrl: claimResult.claimUrl,
  };
}

// Note: splitSignature is imported from './crypto' which re-exports from @plasma-pay/core
