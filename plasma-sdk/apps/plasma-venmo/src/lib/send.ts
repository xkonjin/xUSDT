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
}

interface SendMoneyResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export async function sendMoney(
  wallet: PlasmaEmbeddedWallet,
  options: SendMoneyOptions
): Promise<SendMoneyResult> {
  const { recipientIdentifier, amount } = options;

  const resolveResponse = await fetch('/api/resolve-recipient', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: recipientIdentifier }),
  });

  if (!resolveResponse.ok) {
    const error = await resolveResponse.json();
    return { success: false, error: error.message || 'Failed to resolve recipient' };
  }

  const { address: recipientAddress } = await resolveResponse.json();

  const amountInUnits = parseUnits(amount, 6);

  const params = createTransferParams(
    wallet.address,
    recipientAddress as Address,
    amountInUnits
  );

  const typedData = buildTransferAuthorizationTypedData(params, {
    chainId: PLASMA_MAINNET_CHAIN_ID,
    tokenAddress: USDT0_ADDRESS,
  });

  const signature = await wallet.signTypedData(typedData);

  const { v, r, s } = splitSignature(signature);

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

function splitSignature(signature: Hex): { v: number; r: Hex; s: Hex } {
  const sig = signature.slice(2);
  const r = `0x${sig.slice(0, 64)}` as Hex;
  const s = `0x${sig.slice(64, 128)}` as Hex;
  let v = parseInt(sig.slice(128, 130), 16);
  if (v < 27) v += 27;
  return { v, r, s };
}
