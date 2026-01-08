/**
 * Claims API
 * 
 * Handles creating and listing claims for unregistered recipients.
 * When a user sends money to someone who doesn't have a wallet yet,
 * we create a "claim" that holds the payment authorization until
 * the recipient signs up and claims it.
 * 
 * Endpoints:
 * - POST /api/claims - Create a new claim (hold payment)
 * - GET /api/claims - List claims created by a user
 */

import { NextResponse } from 'next/server';
import { prisma, generateClaimToken, hashClaimToken, notifications as notifyHelpers } from '@plasma-pay/db';
import type { Address } from 'viem';

/**
 * POST /api/claims
 * 
 * Creates a new claim for an unregistered recipient.
 * The sender provides a signed authorization, and we hold it until the recipient claims.
 * 
 * Request body:
 * - senderAddress: Sender's wallet address
 * - senderEmail: Optional sender email
 * - recipientEmail: Recipient's email (for claim notification)
 * - recipientPhone: Alternative - recipient's phone
 * - authorization: The signed EIP-3009 authorization (JSON)
 * - amount: Amount being sent
 * - memo: Optional memo
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      senderAddress,
      senderEmail,
      recipientEmail,
      recipientPhone,
      authorization,
      amount,
      memo,
    } = body;

    // Validate required fields
    if (!senderAddress) {
      return NextResponse.json(
        { error: 'senderAddress is required' },
        { status: 400 }
      );
    }

    if (!recipientEmail && !recipientPhone) {
      return NextResponse.json(
        { error: 'recipientEmail or recipientPhone is required' },
        { status: 400 }
      );
    }

    if (!authorization) {
      return NextResponse.json(
        { error: 'authorization is required' },
        { status: 400 }
      );
    }

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Generate a secure claim token
    const token = generateClaimToken();
    const tokenHash = hashClaimToken(token);

    // Create the claim (expires in 30 days)
    const claim = await prisma.claim.create({
      data: {
        tokenHash,
        senderAddress,
        senderEmail,
        recipientEmail: recipientEmail?.toLowerCase(),
        recipientPhone,
        authorization: JSON.stringify(authorization),
        amount: parseFloat(amount),
        currency: 'USDT0',
        memo,
        status: 'pending',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Generate claim URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
    const claimUrl = `${baseUrl}/claim/${token}`;

    // Create notification for recipient
    if (recipientEmail) {
      await notifyHelpers.create({
        recipientEmail: recipientEmail.toLowerCase(),
        type: 'claim_available',
        title: 'You received money!',
        body: `${senderEmail || senderAddress.slice(0, 6) + '...'} sent you $${amount} USDT0`,
        data: {
          claimId: claim.id,
          amount,
          senderAddress,
          claimUrl,
        },
        relatedType: 'claim',
        relatedId: claim.id,
      });
    }

    return NextResponse.json({
      success: true,
      claim: {
        id: claim.id,
        senderAddress: claim.senderAddress,
        recipientEmail: claim.recipientEmail,
        recipientPhone: claim.recipientPhone,
        amount: claim.amount,
        currency: claim.currency,
        memo: claim.memo,
        status: claim.status,
        expiresAt: claim.expiresAt.toISOString(),
        createdAt: claim.createdAt.toISOString(),
      },
      // IMPORTANT: Only return the token on creation - it cannot be retrieved later
      claimUrl,
      token,
    });
  } catch (error) {
    console.error('Create claim error:', error);
    return NextResponse.json(
      { error: 'Failed to create claim' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/claims
 * 
 * Lists claims created by a sender.
 * 
 * Query params:
 * - address: The sender's wallet address (required)
 * - status: Optional filter by status
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const status = searchParams.get('status');

    if (!address) {
      return NextResponse.json(
        { error: 'address query parameter is required' },
        { status: 400 }
      );
    }

    // Build query
    const where: {
      senderAddress: string;
      status?: string;
    } = {
      senderAddress: address,
    };

    if (status) {
      where.status = status;
    }

    const claims = await prisma.claim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      claims: claims.map(c => ({
        id: c.id,
        senderAddress: c.senderAddress,
        recipientEmail: c.recipientEmail,
        recipientPhone: c.recipientPhone,
        amount: c.amount,
        currency: c.currency,
        memo: c.memo,
        status: c.status,
        claimedBy: c.claimedBy,
        claimedAt: c.claimedAt?.toISOString(),
        txHash: c.txHash,
        expiresAt: c.expiresAt.toISOString(),
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('List claims error:', error);
    return NextResponse.json(
      { error: 'Failed to list claims' },
      { status: 500 }
    );
  }
}

