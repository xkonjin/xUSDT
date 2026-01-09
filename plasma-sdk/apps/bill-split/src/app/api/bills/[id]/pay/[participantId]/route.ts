/**
 * Bill Participant Payment API
 * 
 * Processes payment from a participant using gasless transfer.
 * Supports two modes:
 * 1. Gasless API (preferred): Uses Plasma's gasless relayer via PLASMA_RELAYER_SECRET
 * 2. Direct relay (fallback): Uses RELAYER_PRIVATE_KEY to submit on-chain
 */

import { NextResponse } from 'next/server';
import { prisma } from '@plasma-pay/db';
import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { USDT0_ADDRESS, PLASMA_MAINNET_RPC, plasmaMainnet } from '@plasma-pay/core';
import { PLASMA_GASLESS_API } from '@plasma-pay/gasless';

// Configuration - check for gasless API first, then direct relayer
const PLASMA_RELAYER_SECRET = process.env.PLASMA_RELAYER_SECRET;
const RELAYER_KEY = process.env.RELAYER_PRIVATE_KEY as Hex | undefined;

// Test mode: Override recipient address (allows testing with single wallet)
const TEST_PAYMENT_RECIPIENT = process.env.TEST_PAYMENT_RECIPIENT as Address | undefined;

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

    // Validate relayer is available
    if (!PLASMA_RELAYER_SECRET && !RELAYER_KEY) {
      return NextResponse.json(
        { error: 'Relayer not configured. Set PLASMA_RELAYER_SECRET or RELAYER_PRIVATE_KEY.' },
        { status: 503 }
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

    let txHash: Hex | undefined;

    // Determine recipient (test mode can override for single-wallet testing)
    const recipientAddress = TEST_PAYMENT_RECIPIENT || bill.creatorAddress;
    
    if (TEST_PAYMENT_RECIPIENT) {
      console.log('[bill-pay] TEST MODE: Overriding recipient', {
        original: bill.creatorAddress,
        override: TEST_PAYMENT_RECIPIENT,
      });
    }

    // === MODE 1: Gasless API (preferred) ===
    if (PLASMA_RELAYER_SECRET) {
      console.log('[bill-pay] Using Plasma gasless API');
      
      // Reconstruct 65-byte signature from v, r, s
      const rClean = (r as string).replace(/^0x/, '').padStart(64, '0');
      const sClean = (s as string).replace(/^0x/, '').padStart(64, '0');
      const vHex = (v < 27 ? v + 27 : v).toString(16).padStart(2, '0');
      const signature = `0x${rClean}${sClean}${vHex}`;

      const gaslessResponse = await fetch(`${PLASMA_GASLESS_API}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': PLASMA_RELAYER_SECRET,
        },
        body: JSON.stringify({
          authorization: {
            from,
            to: recipientAddress,
            value: value.toString(),
            validAfter,
            validBefore,
            nonce,
          },
          signature,
        }),
      });

      if (!gaslessResponse.ok) {
        const errorData = await gaslessResponse.json().catch(() => ({}));
        
        // If gasless fails but we have a direct relayer, fall through
        if (RELAYER_KEY) {
          console.log('[bill-pay] Gasless API failed, falling back to direct relay');
        } else {
          return NextResponse.json(
            { error: errorData.error || 'Gasless submission failed' },
            { status: gaslessResponse.status }
          );
        }
      } else {
        const result = await gaslessResponse.json();
        txHash = result.txHash as Hex;
      }
    }

    // === MODE 2: Direct relay (fallback) ===
    if (!txHash && RELAYER_KEY) {
      console.log('[bill-pay] Using direct on-chain relay');
      
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

      // Execute transfer to recipient (bill creator or test override)
      txHash = await walletClient.writeContract({
        address: USDT0_ADDRESS,
        abi: TRANSFER_WITH_AUTH_ABI,
        functionName: 'transferWithAuthorization',
        args: [
          from as Address,
          recipientAddress as Address,
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
    }

    if (!txHash) {
      return NextResponse.json(
        { error: 'No relayer available to execute payment' },
        { status: 503 }
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
    });
  } catch (error) {
    console.error('Bill payment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment failed' },
      { status: 500 }
    );
  }
}

