# X402 Protocol Schema Reference

This document defines the canonical schema for the X402 payment protocol, ensuring consistency between TypeScript and Python implementations.

## Core Types

### X402PaymentOption

Represents a payment option offered by the server.

```typescript
interface X402PaymentOption {
  // Core fields (required)
  network: string;              // "ethereum", "plasma", etc.
  chainId: number;              // Network chain ID
  token: Address;               // Token contract address
  tokenSymbol: string;          // "USDT", "USDC", etc.
  tokenDecimals: number;        // Token decimal places (6 for USDT)
  amount: string;               // Payment amount in atomic units
  recipient: Address;           // Payment recipient address
  scheme: 'eip3009-transfer-with-auth' | 'eip3009-receive-with-auth' | 'direct-transfer';
  
  // Optional fields
  description?: string;         // Human-readable description
  
  // Extended fields for advanced routing
  routerContract?: Address;     // Router contract for Ethereum
  nftCollection?: Address;      // NFT collection for NFT routing
  recommendedMode?: 'channel' | 'direct';
  feeBreakdown?: FeeBreakdown;  // Detailed fee information
}
```

### X402PaymentRequired

Server response when payment is required (HTTP 402).

```typescript
interface X402PaymentRequired {
  type: 'payment-required';
  version: '1.0';
  invoiceId: string;            // Unique invoice identifier
  timestamp: number;            // Unix timestamp
  paymentOptions: X402PaymentOption[];
  description?: string;         // Payment description
  metadata?: Record<string, unknown>; // Additional metadata
}
```

### X402Authorization

Payment authorization data for EIP-3009.

```typescript
interface X402Authorization {
  from: Address;                // Payer address
  to: Address;                  // Recipient address
  value: string;                // Amount in atomic units
  validAfter: number;           // Unix timestamp (inclusive)
  validBefore: number;          // Unix timestamp (exclusive)
  nonce: Hex;                   // Unique nonce (bytes32)
  v: number;                    // Signature v
  r: Hex;                       // Signature r (bytes32)
  s: Hex;                       // Signature s (bytes32)
}
```

### X402PaymentSubmitted

Client payment submission.

```typescript
interface X402PaymentSubmitted {
  type: 'payment-submitted';
  invoiceId: string;            // Matches invoice from PaymentRequired
  chosenOption: X402PaymentOption; // Selected payment option
  authorization: X402Authorization; // Signed authorization
}
```

### X402PaymentCompleted

Server confirmation of payment completion.

```typescript
interface X402PaymentCompleted {
  type: 'payment-completed';
  invoiceId: string;            // Matches invoice
  txHash: Hash;                 // Transaction hash
  network: string;              // Network name
  chainId: number;              // Chain ID
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;            // Completion timestamp
}
```

### FeeBreakdown

Detailed fee information for transparency.

```typescript
interface FeeBreakdown {
  amount: string;               // Original amount in atomic units
  percentBps: number;           // Fee percentage in basis points
  percentFee: string;           // Calculated percentage fee
  floorApplied?: boolean;       // Whether fee floor was applied
  totalFee: string;             // Final total fee
}
```

## Protocol Headers

```typescript
const X402_HEADERS = {
  PAYMENT_REQUIRED: 'X-Payment-Required',  // Server → Client
  PAYMENT: 'X-Payment',                    // Client → Server
  PAYMENT_RECEIPT: 'X-Payment-Receipt',    // Server → Client
} as const;
```

## Implementation Notes

### TypeScript Implementation
- Located in: `plasma-sdk/packages/x402/src/types.ts`
- Uses `viem` types (`Address`, `Hex`, `Hash`)
- Strict type safety

### Python Implementation  
- Located in: `agent/x402_models.py`
- Uses Pydantic for validation
- Field aliases for JSON compatibility (`from_` → `"from"`)
- Legacy models provided for backward compatibility

### Key Alignment Points

1. **Field Naming**: Use `tokenDecimals` (not `decimals`)
2. **Structure**: Use combined `authorization` object (not separate `signature`)
3. **Types**: Use string types for addresses/hashes, number for integers
4. **Compatibility**: Optional fields allow gradual adoption
5. **Versioning**: Include `version` field for future evolution

## Validation Rules

1. **Timestamps**: `validAfter` ≤ current time < `validBefore`
2. **Amounts**: `authorization.value` ≥ `chosenOption.amount`
3. **Addresses**: `authorization.to` = `chosenOption.recipient`
4. **Nonce**: Must be unique and unused
5. **Signature**: Must be valid EIP-712 signature

## Migration Guide

### From Legacy Python Schema
- Rename `decimals` → `tokenDecimals`
- Combine `chosenOption` + `signature` → `authorization`
- Update type imports

### Adding New Fields
1. Add as optional in both implementations
2. Update documentation
3. Add validation rules if needed
4. Test backward compatibility