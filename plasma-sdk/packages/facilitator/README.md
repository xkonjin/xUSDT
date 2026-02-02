# @plasma-pay/facilitator

X402 FacilitatorEvmSigner implementation for Plasma chain with USDT0 support.

> **Note:** This package is currently in beta. Please test thoroughly in development environments before using in production.

## Overview

This package provides a complete X402 payment implementation for Plasma chain:

- **PlasmaFacilitator**: Implements the `FacilitatorEvmSigner` interface from `@x402/evm`
- **AuthorizationSigner**: Client-side EIP-3009 authorization signing
- **Express Middleware**: Ready-to-use middleware for X402 payment gates

## Installation

```bash
npm install @plasma-pay/facilitator
# or
pnpm add @plasma-pay/facilitator
```

## Quick Start

### Server-Side: Payment Gate

```typescript
import express from 'express';
import { PlasmaFacilitator, createX402Middleware } from '@plasma-pay/facilitator';

const app = express();

// Create facilitator with your private key
const facilitator = new PlasmaFacilitator({
  privateKey: process.env.FACILITATOR_PRIVATE_KEY as `0x${string}`,
});

// Add X402 middleware to protected routes
app.use('/api/premium', createX402Middleware({
  facilitator,
  pricePerRequest: 1000000n, // 1 USDT0 (6 decimals)
  recipientAddress: process.env.RECIPIENT_ADDRESS as `0x${string}`,
  freeTierRequests: 10, // Optional: 10 free requests per IP
}));

// Protected endpoint
app.get('/api/premium/data', (req, res) => {
  res.json({ data: 'Premium content', paid: req.x402?.paid });
});

app.listen(3000);
```

### Client-Side: Paying for Resources

```typescript
import { AuthorizationSigner } from '@plasma-pay/facilitator';

// Create signer with your wallet
const signer = new AuthorizationSigner({
  privateKey: process.env.WALLET_PRIVATE_KEY as `0x${string}`,
});

// Create payment header
const paymentHeader = await signer.createPaymentHeader({
  to: '0x...', // Server's recipient address
  value: 1000000n, // 1 USDT0
  validityDuration: 3600, // 1 hour
});

// Make request with payment
const response = await fetch('https://api.example.com/premium/data', {
  headers: {
    'X-Payment': paymentHeader,
  },
});

if (response.status === 402) {
  // Handle payment required
  const { x402 } = await response.json();
  console.log('Payment required:', x402.amount, 'USDT0');
}
```

### Using with @x402/evm

```typescript
import { PlasmaFacilitator } from '@plasma-pay/facilitator';
import { ExactEvmScheme } from '@x402/evm/exact/facilitator';

const facilitator = new PlasmaFacilitator({
  privateKey: '0x...',
});

// Use with official X402 scheme
const scheme = new ExactEvmScheme(facilitator);
```

## API Reference

### PlasmaFacilitator

Implements the `FacilitatorEvmSigner` interface for X402 payment processing.

```typescript
const facilitator = new PlasmaFacilitator({
  privateKey: '0x...', // Required: Hex private key
  rpcUrl: 'https://rpc.plasma.io', // Optional: Custom RPC
  transactionTimeout: 60000, // Optional: Tx timeout in ms
  confirmations: 1, // Optional: Confirmations to wait
});
```

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getAddresses()` | Get facilitator addresses | `Address[]` |
| `getCode({ address })` | Get bytecode at address | `Promise<Hex \| undefined>` |
| `readContract({ address, abi, functionName, args? })` | Read contract state | `Promise<unknown>` |
| `verifyTypedData({ address, domain, types, primaryType, message, signature })` | Verify EIP-712 signature | `Promise<boolean>` |
| `writeContract({ address, abi, functionName, args })` | Write to contract | `Promise<TransactionHash>` |
| `sendTransaction({ to, data })` | Send raw transaction | `Promise<TransactionHash>` |
| `waitForTransactionReceipt({ hash })` | Wait for tx receipt | `Promise<TransactionReceiptResult>` |

#### Helper Methods

| Method | Description |
|--------|-------------|
| `getNativeBalance()` | Get XPL balance |
| `getUSDT0Balance()` | Get USDT0 balance |
| `isAuthorizationUsed(authorizer, nonce)` | Check if nonce used |
| `executeTransferWithAuthorization(params)` | Execute EIP-3009 transfer |

### AuthorizationSigner

Client-side utility for signing EIP-3009 authorizations.

```typescript
const signer = new AuthorizationSigner({
  privateKey: '0x...', // Required
  tokenAddress: '0x...', // Optional: USDT0 address
  chainId: 98866, // Optional: Chain ID
});
```

#### Methods

| Method | Description |
|--------|-------------|
| `signTransferAuthorization(params)` | Sign authorization |
| `createPaymentHeader(params)` | Create X-Payment header |
| `verifyAuthorization(auth)` | Verify signature (testing) |
| `generateNonce()` | Generate random nonce |

### createX402Middleware

Express middleware factory for X402 payment gates.

```typescript
app.use(createX402Middleware({
  facilitator, // PlasmaFacilitator or private key
  pricePerRequest: 1000000n, // Price in USDT0
  recipientAddress: '0x...', // Payment recipient
  skipRoutes: ['/health'], // Routes to skip
  freeTierRequests: 10, // Free requests per IP
  verifyPayment: async (payload) => true, // Custom verification
}));
```

## X402 Protocol Flow

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│  Client │                    │  Server │                    │  Plasma │
└────┬────┘                    └────┬────┘                    └────┬────┘
     │                              │                              │
     │  1. GET /api/resource        │                              │
     │─────────────────────────────>│                              │
     │                              │                              │
     │  2. 402 Payment Required     │                              │
     │     { x402: { amount, ... }} │                              │
     │<─────────────────────────────│                              │
     │                              │                              │
     │  3. Sign EIP-3009 auth       │                              │
     │     (client-side)            │                              │
     │                              │                              │
     │  4. GET /api/resource        │                              │
     │     X-Payment: { auth }      │                              │
     │─────────────────────────────>│                              │
     │                              │                              │
     │                              │  5. transferWithAuthorization │
     │                              │─────────────────────────────>│
     │                              │                              │
     │                              │  6. Transaction confirmed    │
     │                              │<─────────────────────────────│
     │                              │                              │
     │  7. 200 OK { data }          │                              │
     │<─────────────────────────────│                              │
     │                              │                              │
```

## Security Considerations

1. **Private Key Security**: Never expose private keys in client-side code
2. **Nonce Tracking**: The middleware tracks used nonces to prevent replay attacks
3. **Time Validation**: Authorizations are validated against `validAfter` and `validBefore`
4. **On-Chain Verification**: Nonces are also checked on-chain before execution

## Supported Networks

- **Plasma Mainnet** (Chain ID: 98866)
- Custom EVM chains (configure via `PlasmaChainConfig`)

## License

MIT
