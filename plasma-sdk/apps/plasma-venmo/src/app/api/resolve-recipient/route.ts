import { NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import type { Address } from 'viem';

const privyAppId = process.env.PRIVY_APP_ID || '';
const privyAppSecret = process.env.PRIVY_APP_SECRET || '';
const privy = new PrivyClient(privyAppId, privyAppSecret);

const userCache = new Map<string, Address>();

export async function POST(request: Request) {
  try {
    const { identifier } = await request.json();

    if (!identifier) {
      return NextResponse.json(
        { error: 'Missing identifier' },
        { status: 400 }
      );
    }

    const cached = userCache.get(identifier.toLowerCase());
    if (cached) {
      return NextResponse.json({ address: cached });
    }

    const isEmail = identifier.includes('@');
    const isPhone = /^\+?\d{10,}$/.test(identifier.replace(/[\s-]/g, ''));

    if (!isEmail && !isPhone) {
      if (identifier.startsWith('0x') && identifier.length === 42) {
        return NextResponse.json({ address: identifier });
      }
      return NextResponse.json(
        { error: 'Invalid identifier. Use email, phone, or wallet address.' },
        { status: 400 }
      );
    }

    const user = await privy.getUserByEmail(identifier).catch(() => null) ||
                 await privy.getUserByPhone(identifier).catch(() => null);

    if (!user) {
      return NextResponse.json(
        { error: 'Recipient not found. They need to sign up first.' },
        { status: 404 }
      );
    }

    const embeddedWallet = user.linkedAccounts.find(
      (account) => account.type === 'wallet' && account.walletClientType === 'privy'
    );

    if (!embeddedWallet || !('address' in embeddedWallet)) {
      return NextResponse.json(
        { error: 'Recipient has no wallet. They need to complete signup.' },
        { status: 404 }
      );
    }

    const address = embeddedWallet.address as Address;
    userCache.set(identifier.toLowerCase(), address);

    return NextResponse.json({ address });
  } catch (error) {
    console.error('Resolve recipient error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve recipient' },
      { status: 500 }
    );
  }
}
