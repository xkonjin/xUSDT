import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, type Address, type Hex, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { USDT0_ADDRESS, PLASMA_MAINNET_RPC } from '@plasma-pay/core';
import { plasmaMainnet } from '@plasma-pay/core';
import { getValidatedRelayerKey } from '@/lib/validation';
import { withRateLimit, getClientIP, getRouteType } from '@/lib/rate-limiter-redis';

// Server-side amount limits (in USDT0 with 6 decimals)
const MIN_AMOUNT = parseUnits('0.01', 6); // $0.01 minimum
const MAX_AMOUNT = parseUnits('10000', 6); // $10,000 maximum

// PRODUCTION MODE: Mock mode is disabled for production
// All payments are real on Plasma Chain
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

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
    // Rate limiting check (Redis-based for production)
    const ip = getClientIP(request);
    const routeType = getRouteType('/api/submit-transfer');

    // Try Redis rate limiter first, fallback to permissive if unavailable
    try {
      // Dynamic import to avoid build issues if @vercel/kv not installed
      const rateLimitModule = await import('@/lib/rate-limiter-redis');
      const { allowed, response: rateLimitResponse } = await rateLimitModule.withRateLimit(request, 'payment');

      if (!allowed && rateLimitResponse) {
        return rateLimitResponse;
      }
    } catch (rateLimitError) {
      console.warn('[submit-transfer] Redis rate limiter unavailable, proceeding:', rateLimitError);
      // Fallback: Continue without rate limiting (graceful degradation)
    }

    // PRODUCTION VALIDATION: Ensure we're not in mock mode
    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      console.error('[submit-transfer] CRITICAL: Mock mode enabled in production!');
      if (IS_PRODUCTION) {
        return NextResponse.json(
          { error: 'Payment service configuration error. Please contact support.' },
          { status: 500 }
        );
      }
      // Only allow mock mode in development
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

    // Server-side amount validation
    const amount = BigInt(value);
    if (amount < MIN_AMOUNT) {
      return NextResponse.json(
        { error: 'Amount is below the minimum of $0.01' },
        { status: 400 }
      );
    }
    if (amount > MAX_AMOUNT) {
      return NextResponse.json(
        { error: 'Amount exceeds the maximum of $10,000' },
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
