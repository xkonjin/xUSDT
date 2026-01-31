/**
 * Cross-Chain Funding Example
 * 
 * Demonstrates how to fund your Plasma wallet from any chain using LiFi
 */

import { PlasmaLiFiClient, COMMON_TOKENS } from '@plasma-pay/lifi';
import { formatUnits } from 'viem';

async function main() {
  // Initialize LiFi client
  const lifi = new PlasmaLiFiClient({
    privateKey: process.env.WALLET_KEY as `0x${string}`,
    debug: true,
  });

  // Example 1: Get a quote for swapping ETH on Ethereum to USDT0 on Plasma
  console.log('Getting quote for ETH → USDT0...\n');

  const quote = await lifi.getSwapQuote({
    fromChainId: 1, // Ethereum
    fromToken: COMMON_TOKENS[1].ETH, // Native ETH
    fromAmount: '100000000000000000', // 0.1 ETH
    fromAddress: '0x1234567890123456789012345678901234567890',
  });

  console.log('Quote received:');
  console.log(`  From: ${quote.from.amountFormatted} ${quote.from.symbol} on chain ${quote.from.chainId}`);
  console.log(`  To: ${quote.to.amountFormatted} ${quote.to.symbol} on Plasma`);
  console.log(`  Exchange rate: 1 ${quote.from.symbol} = ${quote.exchangeRate} ${quote.to.symbol}`);
  console.log(`  Estimated time: ${quote.estimatedTime}s`);
  console.log(`  Gas cost: $${quote.gasCostUsd}`);
  console.log(`  Price impact: ${quote.priceImpact}%`);
  console.log('\nRoute steps:');
  quote.steps.forEach((step, i) => {
    console.log(`  ${i + 1}. ${step.type}: ${step.fromToken} → ${step.toToken} via ${step.tool}`);
  });

  // Example 2: Execute the swap (uncomment to run)
  /*
  console.log('\nExecuting swap...');
  const result = await lifi.executeSwap(quote);
  
  if (result.status === 'success') {
    console.log('\n✅ Swap completed!');
    console.log(`  Source TX: ${result.sourceTxHash}`);
    console.log(`  Destination TX: ${result.destinationTxHash}`);
    console.log(`  Amount received: ${result.amountReceived}`);
  } else {
    console.log('\n❌ Swap failed:', result.error);
  }
  */

  // Example 3: List supported chains
  console.log('\n\nSupported source chains:');
  const chains = await lifi.getSupportedChains();
  chains.forEach((chain) => {
    console.log(`  - ${chain.name} (${chain.id})`);
  });

  // Example 4: Get common token addresses
  console.log('\n\nCommon tokens on Ethereum:');
  Object.entries(COMMON_TOKENS[1]).forEach(([symbol, address]) => {
    console.log(`  ${symbol}: ${address}`);
  });
}

// Example: One-liner swap function
async function quickSwap() {
  const lifi = new PlasmaLiFiClient({
    privateKey: process.env.WALLET_KEY as `0x${string}`,
  });

  // Swap in one call (quote + execute)
  const result = await lifi.swap({
    fromChainId: 8453, // Base
    fromToken: COMMON_TOKENS[8453].USDC,
    fromAmount: '10000000', // 10 USDC
    fromAddress: '0x...',
  });

  console.log('Swap result:', result);
}

main().catch(console.error);
