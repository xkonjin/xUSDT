/**
 * Claim Token API
 * 
 * Handles individual claim operations:
 * - GET /api/claims/[token] - Get claim details by token
 * - POST /api/claims/[token] - Execute the claim
 */

import { NextResponse } from 'next/server';
import { prisma, hashClaimToken, notifications as notifyHelpers } from '@plasma-pay/db';
import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { USDT0_ADDRESS, PLASMA_MAINNET_RPC, plasmaMainnet } from '@plasma-pay/core';
import { getValidatedRelayerKey } from '@/lib/validation';

// ABI for USDT0 token functions
const USDT0_ABI = [
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
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Escrow/Treasury address that holds claimed funds
const ESCROW_ADDRESS = process.env.MERCHANT_ADDRESS || process.env.NEXT_PUBLIC_MERCHANT_ADDRESS;

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/claims/[token]
 * 
 * Retrieves details of a claim by its token.
 * The token is hashed to look up the claim (we never store plain tokens).
 */
export async function GET(
  request: Request,
  context: RouteParams
) {
  try {
    const { token } = await context.params;

    // Hash the token to look up the claim
    const tokenHash = hashClaimToken(token);

    const claim = await prisma.claim.findUnique({
      where: { tokenHash },
    });

    if (!claim) {
      return NextResponse.json(
        { error: 'Claim not found or invalid token' },
        { status: 404 }
      );
    }

    // Check if expired
    if (claim.status === 'pending' && new Date() > claim.expiresAt) {
      await prisma.claim.update({
        where: { id: claim.id },
        data: { status: 'expired' },
      });
      claim.status = 'expired';
    }

    return NextResponse.json({
      success: true,
      claim: {
        id: claim.id,
        senderAddress: claim.senderAddress,
        senderEmail: claim.senderEmail,
        recipientEmail: claim.recipientEmail,
        recipientPhone: claim.recipientPhone,
        amount: claim.amount,
        currency: claim.currency,
        memo: claim.memo,
        status: claim.status,
        claimedBy: claim.claimedBy,
        claimedAt: claim.claimedAt?.toISOString(),
        txHash: claim.txHash,
        expiresAt: claim.expiresAt.toISOString(),
        createdAt: claim.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get claim error:', error);
    return NextResponse.json(
      { error: 'Failed to get claim' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/claims/[token]
 * 
 * Executes the claim - transfers the funds to the claimer's wallet.
 * The claimer must be authenticated and provide their wallet address.
 * 
 * Request body:
 * - claimerAddress: The wallet address to receive the funds
 */
export async function POST(
  request: Request,
  context: RouteParams
) {
  try {
    const { token } = await context.params;
    const body = await request.json();
    const { claimerAddress } = body;

    // Validate relayer key with proper error handling
    const { key: RELAYER_KEY, error: relayerError } = getValidatedRelayerKey();
    if (!RELAYER_KEY || relayerError) {
      console.error('[claims] Relayer key validation failed');
      return NextResponse.json(
        { error: relayerError || 'Payment service configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    // Validate claimer address
    if (!claimerAddress || !claimerAddress.startsWith('0x')) {
      return NextResponse.json(
        { error: 'claimerAddress is required' },
        { status: 400 }
      );
    }

    // Hash token and look up claim
    const tokenHash = hashClaimToken(token);

    const claim = await prisma.claim.findUnique({
      where: { tokenHash },
    });

    if (!claim) {
      return NextResponse.json(
        { error: 'Claim not found or invalid token' },
        { status: 404 }
      );
    }

    // Check status
    if (claim.status !== 'pending') {
      return NextResponse.json(
        { error: `Claim is ${claim.status}` },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date() > claim.expiresAt) {
      await prisma.claim.update({
        where: { id: claim.id },
        data: { status: 'expired' },
      });
      return NextResponse.json(
        { error: 'Claim has expired' },
        { status: 400 }
      );
    }

    // Validate escrow address is configured
    if (!ESCROW_ADDRESS) {
      return NextResponse.json(
        { error: 'Escrow address not configured' },
        { status: 500 }
      );
    }

    // Set up blockchain clients
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

    // Calculate amount in atomic units (6 decimals for USDT0)
    const amountInUnits = BigInt(Math.floor(claim.amount * 1_000_000));

    // Check escrow has sufficient balance
    const escrowBalance = await publicClient.readContract({
      address: USDT0_ADDRESS,
      abi: USDT0_ABI,
      functionName: 'balanceOf',
      args: [ESCROW_ADDRESS as Address],
    });

    if (escrowBalance < amountInUnits) {
      return NextResponse.json(
        { error: 'Insufficient escrow balance. Please contact support.' },
        { status: 500 }
      );
    }

    // Transfer from escrow to claimer using a simple transfer
    // The RELAYER wallet must be the owner/operator of the escrow address
    // or the escrow must have approved the RELAYER
    // For MVP: We assume RELAYER IS the escrow (MERCHANT_ADDRESS == RELAYER wallet)
    const txHash = await walletClient.writeContract({
      address: USDT0_ADDRESS,
      abi: USDT0_ABI,
      functionName: 'transfer',
      args: [
        claimerAddress as Address,
        amountInUnits,
      ],
    });

    // Wait for confirmation
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

    // Update claim status
    await prisma.claim.update({
      where: { id: claim.id },
      data: {
        status: 'claimed',
        claimedBy: claimerAddress,
        claimedAt: new Date(),
        txHash,
      },
    });

    // Notify sender that the claim was completed
    if (claim.senderEmail) {
      await notifyHelpers.create({
        recipientEmail: claim.senderEmail,
        recipientAddress: claim.senderAddress,
        type: 'payment_completed',
        title: 'Payment Claimed',
        body: `Your payment of $${claim.amount} USDT0 was claimed!`,
        data: {
          claimId: claim.id,
          txHash,
          claimedBy: claimerAddress,
        },
        relatedType: 'claim',
        relatedId: claim.id,
      });
    }

    return NextResponse.json({
      success: true,
      txHash,
      blockNumber: receipt.blockNumber.toString(),
      amount: claim.amount,
      claimedBy: claimerAddress,
    });
  } catch (error) {
    console.error('Execute claim error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Claim failed' },
      { status: 500 }
    );
  }
}

