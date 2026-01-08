import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem, type Address } from 'viem';
import { USDT0_ADDRESS, PLASMA_MAINNET_RPC } from '@plasma-pay/core';
import { plasmaMainnet } from '@plasma-pay/core';

const publicClient = createPublicClient({
  chain: plasmaMainnet,
  transport: http(PLASMA_MAINNET_RPC),
});

const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)'
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address') as Address | null;

    if (!address) {
      return NextResponse.json(
        { error: 'Missing address parameter' },
        { status: 400 }
      );
    }

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

    const transactions = [
      ...sentLogs.map((log) => ({
        id: `${log.transactionHash}-${log.logIndex}`,
        type: 'sent' as const,
        amount: (Number(log.args.value || 0n) / 1e6).toFixed(2),
        counterparty: shortenAddress(log.args.to as Address),
        timestamp: 0,
        txHash: log.transactionHash,
      })),
      ...receivedLogs.map((log) => ({
        id: `${log.transactionHash}-${log.logIndex}`,
        type: 'received' as const,
        amount: (Number(log.args.value || 0n) / 1e6).toFixed(2),
        counterparty: shortenAddress(log.args.from as Address),
        timestamp: 0,
        txHash: log.transactionHash,
      })),
    ];

    const blocks = await Promise.all(
      [...new Set(sentLogs.concat(receivedLogs).map((l) => l.blockNumber))].map(
        (blockNum) => publicClient.getBlock({ blockNumber: blockNum })
      )
    );

    const blockTimestamps = new Map(
      blocks.map((b) => [b.number, Number(b.timestamp)])
    );

    for (const tx of transactions) {
      const log = [...sentLogs, ...receivedLogs].find(
        (l) => `${l.transactionHash}-${l.logIndex}` === tx.id
      );
      if (log) {
        tx.timestamp = blockTimestamps.get(log.blockNumber) || 0;
      }
    }

    transactions.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({ transactions: transactions.slice(0, 50) });
  } catch (error) {
    console.error('History error:', error);
    return NextResponse.json({ transactions: [] });
  }
}

function shortenAddress(address: Address): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
