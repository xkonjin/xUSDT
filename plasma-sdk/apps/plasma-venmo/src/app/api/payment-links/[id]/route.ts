/**
 * Payment Link Detail API
 * 
 * Handles individual payment link operations:
 * - GET /api/payment-links/[id] - Get payment link details
 * - POST /api/payment-links/[id]/pay - Process payment on a link
 * - DELETE /api/payment-links/[id] - Cancel a payment link
 */

import { NextResponse } from 'next/server';
import { prisma } from '@plasma-pay/db';
import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { USDT0_ADDRESS, PLASMA_MAINNET_RPC, plasmaMainnet } from '@plasma-pay/core';
import { getValidatedRelayerKey } from '@/lib/validation';

// ABI for transferWithAuthorization
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

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/payment-links/[id]
 * 
 * Retrieves details of a specific payment link.
 * Used by the pay page to display link information.
 */
export async function GET(
  request: Request,
  context: RouteParams
) {
  try {
    const { id } = await context.params;

    // Fetch payment link from database
    const paymentLink = await prisma.paymentLink.findUnique({
      where: { id },
    });

    if (!paymentLink) {
      return NextResponse.json(
        { error: 'Payment link not found' },
        { status: 404 }
      );
    }

    // Check if expired
    if (paymentLink.expiresAt && new Date() > paymentLink.expiresAt) {
      // Update status if expired
      if (paymentLink.status === 'active') {
        await prisma.paymentLink.update({
          where: { id },
          data: { status: 'expired' },
        });
        paymentLink.status = 'expired';
      }
    }

    // Generate URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';

    return NextResponse.json({
      success: true,
      paymentLink: {
        id: paymentLink.id,
        creatorAddress: paymentLink.creatorAddress,
        creatorEmail: paymentLink.creatorEmail,
        amount: paymentLink.amount,
        currency: paymentLink.currency,
        memo: paymentLink.memo,
        status: paymentLink.status,
        paidBy: paymentLink.paidBy,
        paidAt: paymentLink.paidAt?.toISOString(),
        txHash: paymentLink.txHash,
        expiresAt: paymentLink.expiresAt?.toISOString(),
        createdAt: paymentLink.createdAt.toISOString(),
        url: `${baseUrl}/pay/${paymentLink.id}`,
      },
    });
  } catch (error) {
    console.error('Get payment link error:', error);
    return NextResponse.json(
      { error: 'Failed to get payment link' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payment-links/[id]
 * 
 * Processes a payment for a payment link.
 * Executes the EIP-3009 transferWithAuthorization.
 * 
 * Request body:
 * - from: Payer's wallet address
 * - value: Amount being paid (in smallest units)
 * - validAfter: Authorization start time
 * - validBefore: Authorization end time
 * - nonce: Unique nonce for this authorization
 * - v, r, s: Signature components
 */
export async function POST(
  request: Request,
  context: RouteParams
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // Validate relayer key with proper error handling
    const { key: RELAYER_KEY, error: relayerError } = getValidatedRelayerKey();
    if (!RELAYER_KEY || relayerError) {
      console.error('[payment-links] Relayer key validation failed');
      return NextResponse.json(
        { error: relayerError || 'Payment service configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    // Use optimistic locking to prevent duplicate payments
    // First, try to atomically update status from 'active' to 'processing'
    const updateResult = await prisma.paymentLink.updateMany({
      where: { 
        id,
        status: 'active', // Only update if still active
      },
      data: { 
        status: 'processing',
        updatedAt: new Date(),
      },
    });

    // If no rows updated, the link was already being processed or paid
    if (updateResult.count === 0) {
      const existingLink = await prisma.paymentLink.findUnique({
        where: { id },
      });

      if (!existingLink) {
        return NextResponse.json(
          { error: 'Payment link not found' },
          { status: 404 }
        );
      }

      if (existingLink.status === 'paid') {
        return NextResponse.json(
          { error: 'This payment link has already been paid' },
          { status: 400 }
        );
      }

      if (existingLink.status === 'processing') {
        return NextResponse.json(
          { error: 'Payment is already being processed. Please wait.' },
          { status: 409 }
        );
      }

      if (existingLink.status === 'expired') {
        return NextResponse.json(
          { error: 'Payment link has expired' },
          { status: 400 }
        );
      }

      if (existingLink.status === 'cancelled') {
        return NextResponse.json(
          { error: 'Payment link has been cancelled' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: `Payment link is ${existingLink.status}` },
        { status: 400 }
      );
    }

    // Fetch the full payment link data
    const paymentLink = await prisma.paymentLink.findUnique({
      where: { id },
    });

    if (!paymentLink) {
      return NextResponse.json(
        { error: 'Payment link not found' },
        { status: 404 }
      );
    }

    // Check expiration
    if (paymentLink.expiresAt && new Date() > paymentLink.expiresAt) {
      await prisma.paymentLink.update({
        where: { id },
        data: { status: 'expired' },
      });
      return NextResponse.json(
        { error: 'Payment link has expired' },
        { status: 400 }
      );
    }

    // Extract payment data
    const { from, value, validAfter, validBefore, nonce, v, r, s } = body;

    // Validate required fields
    if (!from || !value || !nonce || v === undefined || !r || !s) {
      return NextResponse.json(
        { error: 'Missing required payment parameters' },
        { status: 400 }
      );
    }

    // Validate amount matches link amount (if specified)
    if (paymentLink.amount !== null) {
      const expectedValue = BigInt(Math.floor(paymentLink.amount * 1e6));
      const actualValue = BigInt(value);
      if (actualValue < expectedValue) {
        return NextResponse.json(
          { error: `Payment amount must be at least ${paymentLink.amount} USDT0` },
          { status: 400 }
        );
      }
    }

    // Validate authorization timing
    const now = Math.floor(Date.now() / 1000);
    if (now < validAfter || now > validBefore) {
      return NextResponse.json(
        { error: 'Authorization expired or not yet valid' },
        { status: 400 }
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

    // Execute the transfer
    const txHash = await walletClient.writeContract({
      address: USDT0_ADDRESS,
      abi: TRANSFER_WITH_AUTH_ABI,
      functionName: 'transferWithAuthorization',
      args: [
        from as Address,
        paymentLink.creatorAddress as Address,
        BigInt(value),
        BigInt(validAfter),
        BigInt(validBefore),
        nonce as Hex,
        v,
        r as Hex,
        s as Hex,
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

    // Update payment link status
    await prisma.paymentLink.update({
      where: { id },
      data: {
        status: 'paid',
        paidBy: from,
        paidAt: new Date(),
        txHash,
      },
    });

    return NextResponse.json({
      success: true,
      txHash,
      blockNumber: receipt.blockNumber.toString(),
      paidTo: paymentLink.creatorAddress,
      amount: value,
    });
  } catch (error) {
    console.error('Pay link error:', error);
    
    // Reset status back to 'active' if payment failed
    // This allows the user to retry the payment
    try {
      const { id } = await context.params;
      await prisma.paymentLink.update({
        where: { id },
        data: { status: 'active' },
      });
    } catch (resetError) {
      console.error('Failed to reset payment link status:', resetError);
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment failed' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/payment-links/[id]
 * 
 * Cancels an active payment link.
 * Only the creator can cancel their own links.
 * 
 * Request body:
 * - creatorAddress: Must match the link's creator
 */
export async function DELETE(
  request: Request,
  context: RouteParams
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { creatorAddress } = body;

    // Fetch payment link
    const paymentLink = await prisma.paymentLink.findUnique({
      where: { id },
    });

    if (!paymentLink) {
      return NextResponse.json(
        { error: 'Payment link not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (paymentLink.creatorAddress.toLowerCase() !== creatorAddress?.toLowerCase()) {
      return NextResponse.json(
        { error: 'Unauthorized - only the creator can cancel this link' },
        { status: 403 }
      );
    }

    // Check if already paid
    if (paymentLink.status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot cancel a paid link' },
        { status: 400 }
      );
    }

    // Update status to cancelled
    await prisma.paymentLink.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment link cancelled',
    });
  } catch (error) {
    console.error('Cancel payment link error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel payment link' },
      { status: 500 }
    );
  }
}

