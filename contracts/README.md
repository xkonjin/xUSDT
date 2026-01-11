# xUSDT Smart Contracts

## Overview
x402-compatible USD stablecoin payment contracts for Plasma.

## Contracts

### PaymentRouter.sol
Routes payments through the x402 protocol.

```solidity
/// @notice Process a payment through x402
/// @param recipient Payment recipient
/// @param amount Amount in wei
function processPayment(address recipient, uint256 amount) external;
```

### Events
- `PaymentProcessed(address indexed from, address indexed to, uint256 amount)`
- `MerchantRegistered(address indexed merchant)`

## Deployment

```bash
npx hardhat run deploy/deploy.js --network plasma
```

## Security
- All contracts use OpenZeppelin standards
- Reentrancy guards on payment functions
- Access control for admin functions
