/**
 * Payment Request Actions API
 * 
 * Handles actions on individual payment requests:
 * - GET /api/requests/[id] - Get request details
 * - POST /api/requests/[id] - Pay a request
 * - DELETE /api/requests/[id] - Decline a request
 */

import { NextResponse } from 'next/server';
import { prisma, notifications as notifyHelpers } from '@plasma-pay/db';
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
 * GET /api/requests/[id]
 * 
 * Retrieves details of a specific payment request.
 */
export async function GET(
  request: Request,
  context: RouteParams
) {
  try {
    const { id } = await context.params;

    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id },
    });

    if (!paymentRequest) {
      return NextResponse.json(
        { error: 'Payment request not found' },
        { status: 404 }
      );
    }

    // Check if expired
    if (paymentRequest.status === 'pending' && new Date() > paymentRequest.expiresAt) {
      await prisma.paymentRequest.update({
        where: { id },
        data: { status: 'expired' },
      });
      paymentRequest.status = 'expired';
    }

    return NextResponse.json({
      success: true,
      request: {
        id: paymentRequest.id,
        fromAddress: paymentRequest.fromAddress,
        fromEmail: paymentRequest.fromEmail,
        toIdentifier: paymentRequest.toIdentifier,
        toAddress: paymentRequest.toAddress,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        memo: paymentRequest.memo,
        status: paymentRequest.status,
        expiresAt: paymentRequest.expiresAt.toISOString(),
        paidAt: paymentRequest.paidAt?.toISOString(),
        txHash: paymentRequest.txHash,
        createdAt: paymentRequest.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get request error:', error);
    return NextResponse.json(
      { error: 'Failed to get payment request' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/requests/[id]
 * 
 * Pays a payment request.
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
      console.error('[requests] Relayer key validation failed');
      return NextResponse.json(
        { error: relayerError || 'Payment service configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    // Fetch payment request
    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id },
    });

    if (!paymentRequest) {
      return NextResponse.json(
        { error: 'Payment request not found' },
        { status: 404 }
      );
    }

    // Check status
    if (paymentRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Payment request is ${paymentRequest.status}` },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date() > paymentRequest.expiresAt) {
      await prisma.paymentRequest.update({
        where: { id },
        data: { status: 'expired' },
      });
      return NextResponse.json(
        { error: 'Payment request has expired' },
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

    // Validate amount matches request
    const expectedValue = BigInt(Math.floor(paymentRequest.amount * 1e6));
    const actualValue = BigInt(value);
    if (actualValue < expectedValue) {
      return NextResponse.json(
        { error: `Payment amount must be at least ${paymentRequest.amount} USDT0` },
        { status: 400 }
      );
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

    // Execute the transfer to the requester
    const txHash = await walletClient.writeContract({
      address: USDT0_ADDRESS,
      abi: TRANSFER_WITH_AUTH_ABI,
      functionName: 'transferWithAuthorization',
      args: [
        from as Address,
        paymentRequest.fromAddress as Address,
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

    // Update request status
    await prisma.paymentRequest.update({
      where: { id },
      data: {
        status: 'paid',
        paidAt: new Date(),
        txHash,
      },
    });

    // Send notification to requester
    if (paymentRequest.fromEmail) {
      await notifyHelpers.create({
        recipientEmail: paymentRequest.fromEmail,
        recipientAddress: paymentRequest.fromAddress,
        type: 'payment_completed',
        title: 'Payment Received',
        body: `Your request for $${paymentRequest.amount} USDT0 has been paid!`,
        data: {
          requestId: paymentRequest.id,
          txHash,
          amount: paymentRequest.amount,
        },
        relatedType: 'payment_request',
        relatedId: paymentRequest.id,
      });
    }

    return NextResponse.json({
      success: true,
      txHash,
      blockNumber: receipt.blockNumber.toString(),
      paidTo: paymentRequest.fromAddress,
      amount: paymentRequest.amount,
    });
  } catch (error) {
    console.error('Pay request error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment failed' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/requests/[id]
 * 
 * Declines a payment request.
 * 
 * Request body:
 * - declinerAddress: Must be the toAddress or match toIdentifier
 * - reason: Optional decline reason
 */
export async function DELETE(
  request: Request,
  context: RouteParams
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { declinerAddress, declinerEmail, reason } = body;

    // Fetch request
    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id },
    });

    if (!paymentRequest) {
      return NextResponse.json(
        { error: 'Payment request not found' },
        { status: 404 }
      );
    }

    // Verify authority to decline
    const isAuthorized = 
      paymentRequest.toAddress?.toLowerCase() === declinerAddress?.toLowerCase() ||
      paymentRequest.toIdentifier.toLowerCase() === declinerEmail?.toLowerCase() ||
      paymentRequest.toIdentifier.toLowerCase() === declinerAddress?.toLowerCase();

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized - only the recipient can decline this request' },
        { status: 403 }
      );
    }

    // Check status
    if (paymentRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot decline - request is ${paymentRequest.status}` },
        { status: 400 }
      );
    }

    // Update status
    await prisma.paymentRequest.update({
      where: { id },
      data: {
        status: 'declined',
        declinedAt: new Date(),
        declineReason: reason,
      },
    });

    // Notify requester
    if (paymentRequest.fromEmail) {
      await notifyHelpers.create({
        recipientEmail: paymentRequest.fromEmail,
        recipientAddress: paymentRequest.fromAddress,
        type: 'request_declined',
        title: 'Request Declined',
        body: `Your request for $${paymentRequest.amount} USDT0 was declined`,
        data: {
          requestId: paymentRequest.id,
          reason,
        },
        relatedType: 'payment_request',
        relatedId: paymentRequest.id,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment request declined',
    });
  } catch (error) {
    console.error('Decline request error:', error);
    return NextResponse.json(
      { error: 'Failed to decline payment request' },
      { status: 500 }
    );
  }
}

