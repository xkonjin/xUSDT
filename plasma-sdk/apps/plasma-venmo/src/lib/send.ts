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
    const error = await resolveResponse.json();
    return { success: false, error: error.message || 'Failed to resolve recipient' };
  }

  const resolveData = await resolveResponse.json();

  // Step 2: Check if recipient needs a claim link (not registered)
  if (resolveData.needsClaim) {
    // Create a claim for unregistered recipient
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

  // Step 4: Submit transfer
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
    const error = await submitResponse.json();
    return { success: false, error: error.message || 'Failed to submit transfer' };
  }

  const result = await submitResponse.json();
  return { success: true, txHash: result.txHash };
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
  
  // Get escrow/treasury address from env or use a default
  const escrowAddress = process.env.NEXT_PUBLIC_MERCHANT_ADDRESS as Address;
  
  if (!escrowAddress) {
    return { success: false, error: 'Escrow address not configured' };
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
    const error = await claimResponse.json();
    return { success: false, error: error.message || 'Failed to create claim' };
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
    const error = await submitResponse.json();
    return { success: false, error: error.message || 'Transfer to escrow failed' };
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
    }).catch(console.error); // Don't fail the whole operation if notification fails
  }

  return { 
    success: true, 
    needsClaim: true,
    claimUrl: claimResult.claimUrl,
  };
}

function splitSignature(signature: Hex): { v: number; r: Hex; s: Hex } {
  const sig = signature.slice(2);
  const r = `0x${sig.slice(0, 64)}` as Hex;
  const s = `0x${sig.slice(64, 128)}` as Hex;
  let v = parseInt(sig.slice(128, 130), 16);
  if (v < 27) v += 27;
  return { v, r, s };
}
