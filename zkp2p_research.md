# ZKP2P Integration Research

## Overview

ZKP2P is a trustless, privacy-preserving fiat-to-crypto on/off-ramp powered by zero-knowledge proofs. It allows users to convert fiat currency (USD, EUR, etc.) to crypto using popular payment platforms like Venmo, Revolut, Wise, and Cash App.

## Key Features

- **Multiple Payment Platforms**: Venmo, Revolut, Wise, Cash App, and more
- **Supported Blockchains**: Base, Solana, Ethereum, Polygon, Hyperliquid, Arbitrum, and 20+ chains
- **Supported Assets**: USDC, SOL, ETH, USDT, etc.
- **Gasless Transactions**: No gas fees for users
- **Privacy-Preserving**: Uses ZK proofs to verify payments without exposing sensitive data

## Integration Method

ZKP2P uses the **Peer Extension SDK** for integration. The flow works as follows:

1. Install `@zkp2p/sdk` package
2. Check if Peer extension is installed
3. Request connection if needed
4. Call `peerExtensionSdk.onramp()` with parameters

## SDK Installation

```bash
npm install @zkp2p/sdk
# or
pnpm add @zkp2p/sdk
```

## Integration Code

```typescript
import { peerExtensionSdk } from '@zkp2p/sdk';

// Check extension state
const state = await peerExtensionSdk.getState();

if (state === 'needs_install') {
  peerExtensionSdk.openInstallPage();
  throw new Error('Peer extension not installed');
}

if (state === 'needs_connection') {
  const approved = await peerExtensionSdk.requestConnection();
  if (!approved) {
    throw new Error('Peer connection not approved');
  }
}

// Open onramp
peerExtensionSdk.onramp({
  referrer: 'Plenmo',
  referrerLogo: 'https://plenmo.app/logo.svg',
  callbackUrl: 'https://plenmo.app/onramp/success',
  inputCurrency: 'USD',
  inputAmount: '100',
  paymentPlatform: 'venmo',
  toToken: '8453:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
  recipientAddress: '<user-wallet-address>',
});
```

## Deeplink Parameters

| Parameter | Description | Type | Required |
|-----------|-------------|------|----------|
| referrer | Application name | String | Yes |
| referrerLogo | Application logo URL | String | Recommended |
| callbackUrl | Redirect URL after success | String | Recommended |
| inputCurrency | Input currency (USD, EUR, etc.) | String | Optional |
| inputAmount | Amount to convert | Number | Optional |
| paymentPlatform | Payment platform (venmo, revolut, etc.) | String | Optional |
| toToken | Output token in format chainId:tokenAddress | String | Optional |
| recipientAddress | Destination wallet address | String | Optional |
| amountUsdc | Exact USDC output amount (6 decimals) | String | Optional |

## Supported Chains

| Chain | Chain ID |
|-------|----------|
| Base | 8453 |
| Solana | 792703809 |
| Polygon | 137 |
| BNB | 56 |
| Avalanche | 43114 |
| Arbitrum | 42161 |
| Ethereum | 1 |
| Hyperliquid | 1337 |
| Scroll | 534352 |

## Token Address Format

Format: `chainId:tokenAddress`

Examples:
- Base USDC: `8453:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Base ETH: `8453:0x0000000000000000000000000000000000000000`
- Ethereum USDC: `1:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`

## SDK API Methods

- `isAvailable()`: Check if extension is detected
- `getState()`: Returns 'needs_install' | 'needs_connection' | 'ready'
- `requestConnection()`: Prompt user to connect
- `onramp(params)`: Open onramp flow
- `onProofComplete(callback)`: Subscribe to proof completion events
- `openInstallPage()`: Open Chrome Web Store

## For Plenmo Integration

Since Plenmo uses USDT on Plasma blockchain, we need to:
1. Check if Plasma is supported (may need to use Base USDC as intermediate)
2. Integrate the Peer extension SDK
3. Create an onramp flow that converts fiat to USDC/USDT
4. Handle the callback after successful onramp
5. Provide fallback for mobile users (extension is desktop-only)

## Mobile Considerations

The Peer extension is currently **desktop-only**. For mobile:
- Consider using ZKP2P React Native SDK (`@zkp2p/zkp2p-react-native-sdk`)
- Or provide alternative on-ramp options for mobile users
