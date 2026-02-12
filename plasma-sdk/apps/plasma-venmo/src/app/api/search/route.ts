/**
 * Search API
 * VENMO-008: Implement Search
 * 
 * Unified search across contacts, transactions, and payment links.
 * 
 * Endpoints:
 * - GET /api/search?q={query}&type={contacts|transactions|links|all}&address={walletAddress}
 * 
 * Returns grouped results from:
 * - Contacts: Recent payment counterparties
 * - Transactions: On-chain transfer history
 * - Payment Links: User's created payment links
 */

import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem, type Address } from 'viem';
import { USDT0_ADDRESS, PLASMA_MAINNET_RPC, plasmaMainnet } from '@plasma-pay/core';
import { prisma } from '@plasma-pay/db';

const publicClient = createPublicClient({
  chain: plasmaMainnet,
  transport: http(PLASMA_MAINNET_RPC),
});

const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)'
);

interface Contact {
  name: string;
  address: string;
  email?: string;
}

interface Transaction {
  id: string;
  type: 'sent' | 'received';
  amount: string;
  counterparty: string;
  memo?: string;
  timestamp: number;
  txHash: string;
}

interface PaymentLink {
  id: string;
  memo: string | null;
  amount: number | null;
  status: string;
  createdAt: string;
}

interface SearchResults {
  contacts: Contact[];
  transactions: Transaction[];
  links: PaymentLink[];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'all';
    const address = searchParams.get('address') as Address | null;

    // Validate query parameter
    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Query parameter "q" must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Validate type parameter
    const validTypes = ['contacts', 'transactions', 'links', 'all'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const results: SearchResults = {
      contacts: [],
      transactions: [],
      links: [],
    };

    const lowerQuery = query.toLowerCase();

    // Search contacts (from transaction history + user settings)
    if (type === 'all' || type === 'contacts') {
      results.contacts = await searchContacts(lowerQuery);
    }

    // Search transactions
    if ((type === 'all' || type === 'transactions') && address) {
      results.transactions = await searchTransactions(lowerQuery, address);
    }

    // Search payment links
    if ((type === 'all' || type === 'links') && address) {
      results.links = await searchPaymentLinks(lowerQuery, address);
    }

    const total = 
      results.contacts.length + 
      results.transactions.length + 
      results.links.length;

    return NextResponse.json({
      success: true,
      query,
      results,
      total,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    );
  }
}

/**
 * Search contacts from user settings and transaction history
 */
async function searchContacts(query: string): Promise<Contact[]> {
  const contacts: Contact[] = [];
  const seenAddresses = new Set<string>();

  try {
    // Search UserSettings by displayName, email
    const userSettings = await prisma.userSettings.findMany({
      where: {
        OR: [
          { displayName: { contains: query } },
          { email: { contains: query } },
          { walletAddress: { startsWith: query.startsWith('0x') ? query : undefined } },
        ].filter(condition => Object.values(condition)[0] !== undefined),
      },
      take: 10,
    });

    for (const user of userSettings) {
      if (!seenAddresses.has(user.walletAddress.toLowerCase())) {
        seenAddresses.add(user.walletAddress.toLowerCase());
        contacts.push({
          name: user.displayName || shortenAddress(user.walletAddress),
          address: user.walletAddress,
          email: user.email || undefined,
        });
      }
    }

    // If searching by address prefix, add direct match
    if (query.startsWith('0x') && query.length >= 4) {
      const potentialAddress = query;
      if (!seenAddresses.has(potentialAddress.toLowerCase())) {
        contacts.push({
          name: shortenAddress(potentialAddress),
          address: potentialAddress,
        });
      }
    }
  } catch (error) {
    console.error('Error searching contacts:', error);
  }

  return contacts.slice(0, 10);
}

/**
 * Search transactions by amount, memo (from Activities)
 */
async function searchTransactions(query: string, address: Address): Promise<Transaction[]> {
  const transactions: Transaction[] = [];

  try {
    // Search Activities table which has memo field
    const activities = await prisma.activity.findMany({
      where: {
        OR: [
          { actorAddress: address },
          { targetAddress: address },
        ],
        AND: {
          OR: [
            { memo: { contains: query } },
            // Amount search - convert query to number if possible
            ...(isNumericQuery(query) ? [{ amount: parseFloat(query) }] : []),
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    for (const activity of activities) {
      const isSent = activity.actorAddress.toLowerCase() === address.toLowerCase();
      transactions.push({
        id: activity.id,
        type: isSent ? 'sent' : 'received',
        amount: activity.amount.toFixed(2),
        counterparty: isSent 
          ? shortenAddress(activity.targetAddress)
          : shortenAddress(activity.actorAddress),
        memo: activity.memo || undefined,
        timestamp: Math.floor(activity.createdAt.getTime() / 1000),
        txHash: activity.txHash || '',
      });
    }

    // If no activities found and query is numeric, search on-chain
    if (transactions.length === 0 && isNumericQuery(query)) {
      const onChainTxs = await searchOnChainTransactions(query, address);
      transactions.push(...onChainTxs);
    }
  } catch (error) {
    console.error('Error searching transactions:', error);
  }

  return transactions.slice(0, 10);
}

/**
 * Search on-chain transactions by amount
 */
async function searchOnChainTransactions(query: string, address: Address): Promise<Transaction[]> {
  const transactions: Transaction[] = [];

  try {
    const targetAmount = parseFloat(query);
    if (isNaN(targetAmount)) return transactions;

    const latestBlock = await publicClient.getBlockNumber();
    const fromBlock = latestBlock - 10000n;

    const [sentLogs, receivedLogs] = await Promise.all([
      publicClient.getLogs({
        address: USDT0_ADDRESS,
        event: TRANSFER_EVENT,
        args: { from: address },
        fromBlock,
        toBlock: 'latest',
      }),
      publicClient.getLogs({
        address: USDT0_ADDRESS,
        event: TRANSFER_EVENT,
        args: { to: address },
        fromBlock,
        toBlock: 'latest',
      }),
    ]);

    const allLogs = [
      ...sentLogs.map(log => ({ ...log, type: 'sent' as const })),
      ...receivedLogs.map(log => ({ ...log, type: 'received' as const })),
    ];

    for (const log of allLogs) {
      const amount = Number(log.args.value || 0n) / 1e6;
      // Check if amount matches query (within tolerance for display format)
      if (amount.toFixed(2).includes(query)) {
        transactions.push({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: log.type,
          amount: amount.toFixed(2),
          counterparty: log.type === 'sent'
            ? shortenAddress(log.args.to as Address)
            : shortenAddress(log.args.from as Address),
          timestamp: 0, // Would need block lookup
          txHash: log.transactionHash,
        });
      }
    }
  } catch (error) {
    console.error('Error searching on-chain transactions:', error);
  }

  return transactions.slice(0, 5);
}

/**
 * Search payment links by memo
 */
async function searchPaymentLinks(query: string, address: Address): Promise<PaymentLink[]> {
  const links: PaymentLink[] = [];

  try {
    const paymentLinks = await prisma.paymentLink.findMany({
      where: {
        creatorAddress: address,
        OR: [
          { memo: { contains: query } },
          // Amount search
          ...(isNumericQuery(query) ? [{ amount: parseFloat(query) }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    for (const link of paymentLinks) {
      links.push({
        id: link.id,
        memo: link.memo,
        amount: link.amount,
        status: link.status,
        createdAt: link.createdAt.toISOString(),
      });
    }
  } catch (error) {
    console.error('Error searching payment links:', error);
  }

  return links;
}

/**
 * Helper: Check if query is numeric
 */
function isNumericQuery(query: string): boolean {
  return !isNaN(parseFloat(query)) && isFinite(parseFloat(query));
}

/**
 * Helper: Shorten address for display
 */
function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
