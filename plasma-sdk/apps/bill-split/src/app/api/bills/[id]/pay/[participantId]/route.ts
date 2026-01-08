/**
 * Bill Participant Payment API
 * 
 * Processes payment from a participant.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@plasma-pay/db';
import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { USDT0_ADDRESS, PLASMA_MAINNET_RPC, plasmaMainnet } from '@plasma-pay/core';

// Relayer key
const RELAYER_KEY = process.env.RELAYER_PRIVATE_KEY as Hex | undefined;

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
  params: Promise<{ id: string; participantId: string }>;
}

/**
 * POST /api/bills/[id]/pay/[participantId]
 * 
 * Processes a participant's payment.
 */
export async function POST(
  request: Request,
  context: RouteParams
) {
  try {
    const { id: billId, participantId } = await context.params;
    const body = await request.json();

    // Validate relayer
    if (!RELAYER_KEY) {
      return NextResponse.json(
        { error: 'Relayer not configured' },
        { status: 500 }
      );
    }

    // Fetch bill and participant
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: { participants: true },
    });

    if (!bill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    const participant = bill.participants.find(p => p.id === participantId);
    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    if (participant.paid) {
      return NextResponse.json(
        { error: 'Already paid' },
        { status: 400 }
      );
    }

    // Extract payment data
    const { from, value, validAfter, validBefore, nonce, v, r, s } = body;

    if (!from || !value || !nonce || v === undefined || !r || !s) {
      return NextResponse.json(
        { error: 'Missing payment parameters' },
        { status: 400 }
      );
    }

    // Validate amount
    const expectedValue = BigInt(Math.floor(participant.share * 1e6));
    const actualValue = BigInt(value);
    if (actualValue < expectedValue) {
      return NextResponse.json(
        { error: `Amount must be at least ${participant.share} USDT0` },
        { status: 400 }
      );
    }

    // Validate timing
    const now = Math.floor(Date.now() / 1000);
    if (now < validAfter || now > validBefore) {
      return NextResponse.json(
        { error: 'Authorization expired' },
        { status: 400 }
      );
    }

    // Set up clients
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

    // Execute transfer to bill creator
    const txHash = await walletClient.writeContract({
      address: USDT0_ADDRESS,
      abi: TRANSFER_WITH_AUTH_ABI,
      functionName: 'transferWithAuthorization',
      args: [
        from as Address,
        bill.creatorAddress as Address,
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

    // Update participant status
    await prisma.billParticipant.update({
      where: { id: participantId },
      data: {
        paid: true,
        paidAt: new Date(),
        txHash,
      },
    });

    // Check if all participants have paid
    const updatedBill = await prisma.bill.findUnique({
      where: { id: billId },
      include: { participants: true },
    });

    if (updatedBill && updatedBill.participants.every(p => p.paid)) {
      await prisma.bill.update({
        where: { id: billId },
        data: { status: 'completed' },
      });
    }

    return NextResponse.json({
      success: true,
      txHash,
      blockNumber: receipt.blockNumber.toString(),
    });
  } catch (error) {
    console.error('Bill payment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment failed' },
      { status: 500 }
    );
  }
}

