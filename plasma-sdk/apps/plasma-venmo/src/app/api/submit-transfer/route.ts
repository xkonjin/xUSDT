import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { USDT0_ADDRESS, PLASMA_MAINNET_RPC } from '@plasma-pay/core';
import { plasmaMainnet } from '@plasma-pay/core';
import { getValidatedRelayerKey } from '@/lib/validation';

const isMockMode = process.env.NEXT_PUBLIC_MOCK_AUTH === "true";

const TRANSFER_WITH_AUTH_ABI = [
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    name: 'transferWithAuthorization',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export async function POST(request: Request) {
  try {
    // Handle mock mode first before any other checks
    if (isMockMode) {
      return NextResponse.json({
        success: true,
        txHash: `0xmock${Date.now().toString(16)}`,
        mock: true,
      });
    }

    // Validate relayer key with proper error handling
    const { key: RELAYER_KEY, error: relayerError } = getValidatedRelayerKey();
    if (!RELAYER_KEY || relayerError) {
      console.error('[submit-transfer] Relayer key validation failed');
      return NextResponse.json(
        { error: relayerError || 'Payment service configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { from, to, value, validAfter, validBefore, nonce, v, r, s } = body;

    if (!from || !to || !value || !nonce || v === undefined || !r || !s) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    if (now < validAfter || now > validBefore) {
      return NextResponse.json(
        { error: 'Authorization expired or not yet valid' },
        { status: 400 }
      );
    }

    const account = privateKeyToAccount(RELAYER_KEY);

    const walletClient = createWalletClient({
      account,
      chain: plasmaMainnet,
      transport: http(PLASMA_MAINNET_RPC),
    });

    const publicClient = createPublicClient({
      chain: plasmaMainnet,
      transport: http(PLASMA_MAINNET_RPC),
    });

    const txHash = await walletClient.writeContract({
      address: USDT0_ADDRESS,
      abi: TRANSFER_WITH_AUTH_ABI,
      functionName: 'transferWithAuthorization',
      args: [
        from as Address,
        to as Address,
        BigInt(value),
        BigInt(validAfter),
        BigInt(validBefore),
        nonce as Hex,
        v,
        r as Hex,
        s as Hex,
      ],
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 30000,
    });

    if (receipt.status !== 'success') {
      return NextResponse.json(
        { error: 'Transaction reverted' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      txHash,
      blockNumber: receipt.blockNumber.toString(),
    });
  } catch (error) {
    console.error('Submit transfer error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transfer failed' },
      { status: 500 }
    );
  }
}
