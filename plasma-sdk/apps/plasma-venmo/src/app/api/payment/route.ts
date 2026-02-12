import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

/**
 * Payment API Route
 * Handles payment processing with EIP-3009 authorization
 */

const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
const USDT0_ADDRESS = process.env.NEXT_PUBLIC_USDT0_ADDRESS;
const PLASMA_RPC = process.env.NEXT_PUBLIC_PLASMA_RPC;
const API_AUTH_SECRET = process.env.API_AUTH_SECRET;

// EIP-3009 ABI
const EIP3009_ABI = [
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external',
  'function receiveWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external',
];

interface PaymentRequest {
  from: string;
  to: string;
  amount: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
  signature: {
    v: number;
    r: string;
    s: string;
  };
  method?: 'transfer' | 'receive';
}

export async function POST(request: NextRequest) {
  try {
    // Verify API authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${API_AUTH_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: PaymentRequest = await request.json();
    const {
      from,
      to,
      amount,
      validAfter,
      validBefore,
      nonce,
      signature,
      method = 'transfer',
    } = body;

    // Validate required fields
    if (!from || !to || !amount || !nonce || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate addresses
    if (!ethers.isAddress(from) || !ethers.isAddress(to)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    // Validate amount
    const amountBN = ethers.parseUnits(amount, 6); // USDT has 6 decimals
    if (amountBN <= 0n) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Check if relayer is configured
    if (!RELAYER_PRIVATE_KEY || !PLASMA_RPC || !USDT0_ADDRESS) {
      return NextResponse.json(
        { error: 'Payment service not configured' },
        { status: 503 }
      );
    }

    // Initialize provider and signer
    const provider = new ethers.JsonRpcProvider(PLASMA_RPC);
    const relayer = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);

    // Initialize USDT0 contract
    const usdt0 = new ethers.Contract(USDT0_ADDRESS, EIP3009_ABI, relayer);

    // Check relayer balance for gas
    const relayerBalance = await provider.getBalance(relayer.address);
    const minGasBalance = ethers.parseEther('0.001'); // Minimum 0.001 ETH for gas
    
    if (relayerBalance < minGasBalance) {
      return NextResponse.json(
        { error: 'Insufficient relayer gas balance' },
        { status: 503 }
      );
    }

    // Execute the transaction
    let tx;
    if (method === 'receive') {
      tx = await usdt0.receiveWithAuthorization(
        from,
        to,
        amountBN,
        validAfter,
        validBefore,
        nonce,
        signature.v,
        signature.r,
        signature.s
      );
    } else {
      tx = await usdt0.transferWithAuthorization(
        from,
        to,
        amountBN,
        validAfter,
        validBefore,
        nonce,
        signature.v,
        signature.r,
        signature.s
      );
    }

    // Wait for confirmation
    const receipt = await tx.wait();

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      from,
      to,
      amount,
    });
  } catch (error: unknown) {
    console.error('Payment processing error:', error);

    const maybeError = error as { code?: unknown; message?: unknown };
    const errorCode = typeof maybeError.code === 'string' ? maybeError.code : undefined;
    const errorMessage =
      typeof maybeError.message === 'string'
        ? maybeError.message
        : error instanceof Error
          ? error.message
          : 'Payment processing failed';

    // Handle specific errors
    if (errorCode === 'INSUFFICIENT_FUNDS') {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    if (errorCode === 'NONCE_EXPIRED') {
      return NextResponse.json(
        { error: 'Authorization expired' },
        { status: 400 }
      );
    }

    if (errorMessage.includes('already used')) {
      return NextResponse.json(
        { error: 'Authorization already used' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Plenmo Payment API',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      POST: '/api/payment - Process payment with EIP-3009 authorization',
    },
  });
}
