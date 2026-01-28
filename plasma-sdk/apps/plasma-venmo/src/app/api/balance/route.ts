import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, isAddress, formatUnits, type Address } from 'viem';
import { defineChain } from 'viem';

/**
 * Balance API Route
 * Returns USDT0 balance for a given address
 */

const USDT0_ADDRESS = process.env.NEXT_PUBLIC_USDT0_ADDRESS as Address | undefined;
const PLASMA_RPC = process.env.NEXT_PUBLIC_PLASMA_RPC;

// Define Plasma chain
const plasmaChain = defineChain({
  id: 9745,
  name: 'Plasma',
  nativeCurrency: {
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [PLASMA_RPC || 'https://rpc.plasma.to'],
    },
  },
});

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

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
    if (!isAddress(address)) {
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

    // Initialize client
    const client = createPublicClient({
      chain: plasmaChain,
      transport: http(PLASMA_RPC),
    });

    // Get balance and token info
    const [balance, decimals, symbol, name] = await Promise.all([
      client.readContract({
        address: USDT0_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as Address],
      }),
      client.readContract({
        address: USDT0_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'decimals',
      }),
      client.readContract({
        address: USDT0_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'symbol',
      }),
      client.readContract({
        address: USDT0_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'name',
      }),
    ]);

    // Format balance
    const formattedBalance = formatUnits(balance, decimals);

    return NextResponse.json({
      address,
      balance: balance.toString(),
      formattedBalance,
      decimals,
      symbol,
      name,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Balance check error:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
