import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

/**
 * Balance API Route
 * Returns USDT0 balance for a given address
 */

const USDT0_ADDRESS = process.env.NEXT_PUBLIC_USDT0_ADDRESS;
const PLASMA_RPC = process.env.NEXT_PUBLIC_PLASMA_RPC;

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

export async function GET(request: NextRequest) {
  try {
    // Get address from query params
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter required' },
        { status: 400 }
      );
    }

    // Validate address
    if (!ethers.isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    // Check if service is configured
    if (!USDT0_ADDRESS || !PLASMA_RPC) {
      return NextResponse.json(
        { error: 'Balance service not configured' },
        { status: 503 }
      );
    }

    // Initialize provider
    const provider = new ethers.JsonRpcProvider(PLASMA_RPC);

    // Initialize USDT0 contract
    const usdt0 = new ethers.Contract(USDT0_ADDRESS, ERC20_ABI, provider);

    // Get balance
    const balance = await usdt0.balanceOf(address);
    const decimals = await usdt0.decimals();
    const symbol = await usdt0.symbol();
    const name = await usdt0.name();

    // Format balance
    const formattedBalance = ethers.formatUnits(balance, decimals);

    return NextResponse.json({
      address,
      balance: balance.toString(),
      formattedBalance,
      decimals,
      symbol,
      name,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    console.error('Balance check error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch balance';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
