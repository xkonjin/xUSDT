/**
 * Telegram Wallet Connection API
 * 
 * POST /api/telegram/connect
 * Saves the mapping between a Telegram user and their Plasma wallet.
 * 
 * Called from the /connect page after the user connects their wallet.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@plasma-pay/db';
import { isAddress } from 'viem';

/**
 * POST - Connect Telegram user to wallet
 * 
 * Body:
 * - telegramUserId: Telegram user ID (as string)
 * - telegramUsername: Optional Telegram username
 * - walletAddress: Plasma wallet address
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { telegramUserId, telegramUsername, walletAddress } = body;
    
    // Validate required fields
    if (!telegramUserId || !walletAddress) {
      return NextResponse.json(
        { error: 'telegramUserId and walletAddress are required' },
        { status: 400 }
      );
    }
    
    // Validate wallet address format
    if (!isAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }
    
    // Upsert the mapping (create or update)
    const wallet = await prisma.telegramWallet.upsert({
      where: { telegramUserId: String(telegramUserId) },
      update: {
        walletAddress,
        telegramUsername: telegramUsername || undefined,
      },
      create: {
        telegramUserId: String(telegramUserId),
        walletAddress,
        telegramUsername: telegramUsername || undefined,
      },
    });
    
    console.log(`Telegram user ${telegramUserId} connected wallet ${walletAddress}`);
    
    return NextResponse.json({
      success: true,
      wallet: {
        telegramUserId: wallet.telegramUserId,
        walletAddress: wallet.walletAddress,
      },
    });
  } catch (error) {
    console.error('Failed to connect wallet:', error);
    return NextResponse.json(
      { error: 'Failed to connect wallet' },
      { status: 500 }
    );
  }
}

/**
 * GET - Get wallet for Telegram user
 * 
 * Query params:
 * - telegramUserId: Telegram user ID
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramUserId = searchParams.get('telegramUserId');
    
    if (!telegramUserId) {
      return NextResponse.json(
        { error: 'telegramUserId is required' },
        { status: 400 }
      );
    }
    
    const wallet = await prisma.telegramWallet.findUnique({
      where: { telegramUserId },
    });
    
    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      wallet: {
        telegramUserId: wallet.telegramUserId,
        walletAddress: wallet.walletAddress,
        telegramUsername: wallet.telegramUsername,
      },
    });
  } catch (error) {
    console.error('Failed to get wallet:', error);
    return NextResponse.json(
      { error: 'Failed to get wallet' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Disconnect wallet from Telegram user
 * 
 * Body:
 * - telegramUserId: Telegram user ID
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { telegramUserId } = body;
    
    if (!telegramUserId) {
      return NextResponse.json(
        { error: 'telegramUserId is required' },
        { status: 400 }
      );
    }
    
    await prisma.telegramWallet.delete({
      where: { telegramUserId: String(telegramUserId) },
    }).catch(() => null); // Ignore if not found
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to disconnect wallet:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect wallet' },
      { status: 500 }
    );
  }
}

