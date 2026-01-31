/**
 * X402 Auto-Pay Example
 * 
 * Demonstrates how to automatically pay for API access when receiving 402 responses
 */

import { PlasmaPayClient } from '@plasma-pay/agent';

async function main() {
  // Initialize client
  const client = new PlasmaPayClient({
    privateKey: process.env.WALLET_KEY as `0x${string}`,
    debug: true,
  });

  console.log('Wallet address:', client.address);

  // Example: Fetch from a paid API
  // The client automatically handles 402 Payment Required responses
  const apiUrl = 'https://api.example.com/premium-data';

  console.log(`\nFetching from ${apiUrl}...`);

  try {
    // The fetch method:
    // 1. Makes the initial request
    // 2. If 402 is returned, parses X-Payment-Required header
    // 3. Signs an EIP-3009 authorization for the required amount
    // 4. Retries with X-Payment header containing the signed auth
    // 5. Returns the actual response

    const response = await client.fetch(apiUrl, {
      maxPayment: '1.00', // Maximum willing to pay: $1.00 USDT0
    });

    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Data received:', data);
    } else {
      console.log('\n❌ Request failed:', response.status);
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

// Example: Building an X402-enabled API server
async function exampleServer() {
  // This is how you would build a server that accepts X402 payments
  // Using Express.js as an example

  /*
  import express from 'express';
  import { verifyPayment } from '@plasma-pay/agent/server';

  const app = express();

  app.get('/premium-data', async (req, res) => {
    // Check if payment is included
    const paymentHeader = req.headers['x-payment'];
    
    if (!paymentHeader) {
      // Return 402 with payment requirements
      const paymentRequired = {
        invoiceId: 'inv_' + Date.now(),
        paymentOptions: [{
          scheme: 'eip3009-transfer-with-auth',
          network: 'plasma',
          asset: 'USDT0',
          amount: '0.10', // $0.10 per request
          recipient: process.env.MERCHANT_ADDRESS,
        }],
      };

      res.setHeader(
        'X-Payment-Required',
        Buffer.from(JSON.stringify(paymentRequired)).toString('base64')
      );
      return res.status(402).json({ error: 'Payment required' });
    }

    // Verify the payment
    const payment = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
    const isValid = await verifyPayment(payment);

    if (!isValid) {
      return res.status(402).json({ error: 'Invalid payment' });
    }

    // Return the premium data
    res.json({
      data: 'This is premium content!',
      timestamp: new Date().toISOString(),
    });
  });

  app.listen(3000);
  */
}

main().catch(console.error);
