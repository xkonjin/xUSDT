/**
 * Basic Payment Example
 * 
 * Demonstrates how to send a simple USDT0 payment on Plasma
 */

import { PlasmaPayClient } from '@plasma-pay/agent';

async function main() {
  // Initialize client with your wallet
  const client = new PlasmaPayClient({
    privateKey: process.env.WALLET_KEY as `0x${string}`,
    debug: true,
  });

  console.log('Wallet address:', client.address);

  // Check balance
  const balance = await client.getBalance();
  console.log(`\nBalance:`);
  console.log(`  USDT0: ${balance.usdt0Formatted}`);
  console.log(`  XPL (gas): ${balance.xplFormatted}`);

  // Send payment
  const recipient = '0x1234567890123456789012345678901234567890';
  const amount = '10.00'; // $10 USDT0

  console.log(`\nSending ${amount} USDT0 to ${recipient}...`);

  try {
    const result = await client.sendPayment({
      to: recipient,
      amount,
      note: 'Test payment from Plasma Pay SDK',
    });

    console.log('\n✅ Payment sent!');
    console.log(`  TX Hash: ${result.txHash}`);
    console.log(`  Amount: ${amount} USDT0`);
    console.log(`  Gas used: ${result.gasUsed}`);
  } catch (error: any) {
    console.error('\n❌ Payment failed:', error.message);
  }
}

main().catch(console.error);
