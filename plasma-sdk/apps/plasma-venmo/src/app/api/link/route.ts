import { NextRequest, NextResponse } from 'next/server';
import { isAddress, parseUnits } from 'viem';
import crypto from 'crypto';

/**
 * Payment Link API Route
 * Generates shareable payment links for Plenmo
 */

const API_AUTH_SECRET = process.env.API_AUTH_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://plenmo.app';

interface LinkRequest {
  recipient: string;
  amount: string;
  note?: string;
  expiresIn?: number; // seconds
}

interface LinkData {
  id: string;
  recipient: string;
  amount: string;
  note?: string;
  createdAt: number;
  expiresAt?: number;
}

// In-memory store (replace with database in production)
const linkStore = new Map<string, LinkData>();

export async function POST(request: NextRequest) {
  try {
    // Verify API authentication (optional for link generation)
    // Parse request body
    const body: LinkRequest = await request.json();
    const { recipient, amount, note, expiresIn } = body;

    // Validate required fields
    if (!recipient || !amount) {
      return NextResponse.json(
        { error: 'Recipient and amount are required' },
        { status: 400 }
      );
    }

    // Validate recipient address
    if (!isAddress(recipient)) {
      return NextResponse.json(
        { error: 'Invalid recipient address' },
        { status: 400 }
      );
    }

    // Validate amount
    try {
      const amountBN = parseUnits(amount, 6);
      if (amountBN <= 0n) {
        throw new Error('Amount must be positive');
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Generate unique link ID using crypto
    const linkId = crypto.randomBytes(16).toString('hex');

    // Calculate expiration
    const createdAt = Date.now();
    const expiresAt = expiresIn ? createdAt + expiresIn * 1000 : undefined;

    // Store link data
    const linkData: LinkData = {
      id: linkId,
      recipient,
      amount,
      note,
      createdAt,
      expiresAt,
    };

    linkStore.set(linkId, linkData);

    // Generate link URL
    const linkUrl = `${BASE_URL}/pay/${linkId}`;
    const shortUrl = `plenmo.app/p/${linkId}`;

    return NextResponse.json({
      success: true,
      linkId,
      url: linkUrl,
      shortUrl,
      recipient,
      amount,
      note,
      expiresAt,
      qrCode: `${BASE_URL}/api/qr?url=${encodeURIComponent(linkUrl)}`,
    });
  } catch (error) {
    console.error('Link generation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate link';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get link ID from query params
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('id');

    if (!linkId) {
      return NextResponse.json(
        { error: 'Link ID required' },
        { status: 400 }
      );
    }

    // Retrieve link data
    const linkData = linkStore.get(linkId);

    if (!linkData) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    // Check if expired
    if (linkData.expiresAt && Date.now() > linkData.expiresAt) {
      linkStore.delete(linkId);
      return NextResponse.json(
        { error: 'Link expired' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      ...linkData,
    });
  } catch (error) {
    console.error('Link retrieval error:', error);
    const message = error instanceof Error ? error.message : 'Failed to retrieve link';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify API authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${API_AUTH_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get link ID from query params
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('id');

    if (!linkId) {
      return NextResponse.json(
        { error: 'Link ID required' },
        { status: 400 }
      );
    }

    // Delete link
    const deleted = linkStore.delete(linkId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Link deleted',
    });
  } catch (error) {
    console.error('Link deletion error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete link';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
