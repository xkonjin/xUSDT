# Plenmo Architecture

Deep dive into Plenmo's technical architecture, covering EIP-3009 gasless transfers, Privy authentication, and gas sponsorship mechanisms.

## Table of Contents

1. [System Overview](#system-overview)
2. [EIP-3009 Gasless Transfers](#eip-3009-gasless-transfers)
3. [Privy Integration](#privy-integration)
4. [Gas Sponsorship Model](#gas-sponsorship-model)
5. [Payment Flows](#payment-flows)
6. [Data Models](#data-models)
7. [Security Architecture](#security-architecture)

---

## System Overview

Plenmo is built on a gasless payment architecture where users never need to hold native tokens (ETH/PLASMA) to make payments. This is achieved through EIP-3009's `transferWithAuthorization` mechanism.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USER LAYER                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Browser   │  │   Mobile    │  │  Payment    │  │   Claim     │    │
│  │     App     │  │     App     │  │    Link     │  │    Page     │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
└─────────┼────────────────┼────────────────┼────────────────┼────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           APPLICATION LAYER                              │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Next.js 14 (App Router)                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │   │
│  │  │    Pages    │  │  API Routes │  │      Components         │  │   │
│  │  │  /         │  │  /api/*     │  │  SendForm, ContactList  │  │   │
│  │  │  /pay/[id] │  │             │  │  PaymentLinks, Feed     │  │   │
│  │  │  /claim/[t]│  │             │  │                         │  │   │
│  │  └─────────────┘  └──────┬──────┘  └─────────────────────────┘  │   │
│  └──────────────────────────┼────────────────────────────────────────┘   │
└─────────────────────────────┼────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           SERVICE LAYER                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   @plasma-   │  │   @plasma-   │  │   @plasma-   │  │   @plasma-   │ │
│  │   pay/core   │  │  pay/gasless │  │    pay/db    │  │ pay/privy-   │ │
│  │              │  │              │  │              │  │    auth      │ │
│  │  Constants   │  │  EIP-3009    │  │   Prisma     │  │   Hooks      │ │
│  │  Types       │  │  Signing     │  │   Models     │  │   Provider   │ │
│  │  Utils       │  │  Relaying    │  │   Queries    │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BLOCKCHAIN LAYER                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                      Plasma Mainnet (9745)                        │   │
│  │  ┌─────────────────────────────────────────────────────────────┐ │   │
│  │  │               USDT0 Token Contract                           │ │   │
│  │  │    ERC-20 + EIP-3009 (transferWithAuthorization)            │ │   │
│  │  │    Address: 0x2F4674F04d45F0ECA49390765F2Dc64fE5AE4c3d       │ │   │
│  │  └─────────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## EIP-3009 Gasless Transfers

### What is EIP-3009?

[EIP-3009](https://eips.ethereum.org/EIPS/eip-3009) extends ERC-20 tokens with signed authorization capabilities. Instead of the traditional two-step approve/transferFrom flow, users sign a typed data message authorizing a transfer, which anyone (a "relayer") can then execute on-chain.

### Key Functions

```solidity
// Transfer tokens using a signed authorization
function transferWithAuthorization(
    address from,      // Token sender
    address to,        // Token recipient  
    uint256 value,     // Amount to transfer
    uint256 validAfter,  // Unix timestamp - valid after this time
    uint256 validBefore, // Unix timestamp - expires after this time
    bytes32 nonce,     // Unique nonce to prevent replay
    uint8 v,           // Signature component
    bytes32 r,         // Signature component
    bytes32 s          // Signature component
) external;

// Alternative: only callable by the `to` address
function receiveWithAuthorization(
    address from,
    address to,
    uint256 value,
    uint256 validAfter,
    uint256 validBefore,
    bytes32 nonce,
    uint8 v,
    bytes32 r,
    bytes32 s
) external;
```

### EIP-712 Typed Data Structure

Plenmo uses EIP-712 for human-readable signature requests:

```typescript
// Domain (USDT0 on Plasma)
const domain = {
  name: 'Tether USD (Plasma)',
  version: '1',
  chainId: 9745,
  verifyingContract: '0x2F4674F04d45F0ECA49390765F2Dc64fE5AE4c3d'
};

// Type definitions
const types = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
};

// Message to sign
const message = {
  from: '0xUserAddress...',
  to: '0xRecipient...',
  value: '10000000',  // 10 USDT0 (6 decimals)
  validAfter: 1706140800,
  validBefore: 1706144400,
  nonce: '0x...random32bytes',
};
```

### Transfer Flow

```
┌────────────────┐                    ┌────────────────┐                    ┌────────────────┐
│     User       │                    │    Plenmo      │                    │  Plasma Chain  │
│   (Sender)     │                    │   Backend      │                    │   (USDT0)      │
└───────┬────────┘                    └───────┬────────┘                    └───────┬────────┘
        │                                     │                                     │
        │  1. Enter recipient & amount        │                                     │
        │─────────────────────────────────────▶                                     │
        │                                     │                                     │
        │  2. Build authorization params      │                                     │
        │◀─────────────────────────────────────                                     │
        │                                     │                                     │
        │  3. Sign EIP-712 typed data         │                                     │
        │  (Privy embedded wallet)            │                                     │
        │─────────────────────────────────────▶                                     │
        │                                     │                                     │
        │                                     │  4. POST /api/submit-transfer       │
        │                                     │  {from, to, value, nonce, v, r, s} │
        │                                     │─────────────────────────────────────▶
        │                                     │                                     │
        │                                     │  5. Validate signature & params     │
        │                                     │                                     │
        │                                     │  6. Relayer calls contract          │
        │                                     │  transferWithAuthorization(...)     │
        │                                     │─────────────────────────────────────▶
        │                                     │                                     │
        │                                     │  7. Transaction mined              │
        │                                     │◀─────────────────────────────────────
        │                                     │                                     │
        │  8. Return txHash + confirmation    │                                     │
        │◀─────────────────────────────────────                                     │
        │                                     │                                     │
```

### Nonce Management

Each authorization requires a unique `nonce` (32 bytes). Plenmo generates cryptographically secure random nonces:

```typescript
import { randomBytes } from 'crypto';

function generateNonce(): `0x${string}` {
  return `0x${randomBytes(32).toString('hex')}`;
}
```

The USDT0 contract tracks used nonces per-user to prevent replay attacks.

### Validity Windows

Authorizations have time bounds for security:

```typescript
function getValidityWindow(durationSeconds = 3600) {
  const now = Math.floor(Date.now() / 1000);
  return {
    validAfter: now,           // Valid immediately
    validBefore: now + durationSeconds,  // Expires in 1 hour
  };
}
```

**Best Practices:**
- Short validity (1 hour) for interactive payments
- Longer validity (30 days) for claims to unregistered users
- Never use `validAfter: 0` as it makes authorization valid for all past time

---

## Privy Integration

### Overview

[Privy](https://privy.io) provides embedded wallet infrastructure, enabling users to sign transactions without managing private keys or installing browser extensions.

### Authentication Flow

```
┌────────────────┐                    ┌────────────────┐                    ┌────────────────┐
│     User       │                    │    Plenmo      │                    │     Privy      │
│                │                    │   Frontend     │                    │   Service      │
└───────┬────────┘                    └───────┬────────┘                    └───────┬────────┘
        │                                     │                                     │
        │  1. Click "Login with Email"        │                                     │
        │─────────────────────────────────────▶                                     │
        │                                     │                                     │
        │                                     │  2. Initialize Privy modal          │
        │                                     │─────────────────────────────────────▶
        │                                     │                                     │
        │  3. Enter email / social login      │                                     │
        │─────────────────────────────────────────────────────────────────────────────▶
        │                                     │                                     │
        │  4. Verify (OTP / OAuth)            │                                     │
        │◀─────────────────────────────────────────────────────────────────────────────
        │                                     │                                     │
        │                                     │  5. Create/retrieve embedded wallet │
        │                                     │◀─────────────────────────────────────
        │                                     │                                     │
        │  6. User authenticated              │                                     │
        │  (wallet address available)         │                                     │
        │◀─────────────────────────────────────                                     │
        │                                     │                                     │
```

### React Integration

```tsx
// src/app/providers.tsx
import { PlasmaPrivyProvider } from '@plasma-pay/privy-auth';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PlasmaPrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ['email', 'google', 'apple', 'twitter'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        defaultChain: plasmaMainnet,
        supportedChains: [plasmaMainnet],
      }}
    >
      {children}
    </PlasmaPrivyProvider>
  );
}
```

### Hooks Usage

```tsx
import { 
  usePlasmaWallet, 
  useGaslessTransfer,
  useUSDT0Balance 
} from '@plasma-pay/privy-auth';

function SendForm() {
  const { address, isConnected, login, logout } = usePlasmaWallet();
  const { balance, isLoading: balanceLoading } = useUSDT0Balance(address);
  const { transfer, isLoading, error } = useGaslessTransfer();

  const handleSend = async () => {
    const result = await transfer({
      to: recipientAddress,
      amount: parseUnits(amount, 6),
    });
    
    if (result.success) {
      console.log('Transaction hash:', result.txHash);
    }
  };

  // ...
}
```

### Wallet Types

Plenmo supports multiple wallet types:

| Type | Description | Use Case |
|------|-------------|----------|
| Embedded | Privy-managed, non-custodial | New users, mobile-first |
| External | MetaMask, Rainbow, etc. | Power users, existing wallets |

```tsx
const { 
  embeddedWallet, 
  externalWallet,
  allWallets,
  connectExternalWallet 
} = useAllWallets();
```

---

## Gas Sponsorship Model

### How It Works

Plenmo operates a **relayer wallet** that pays gas fees on behalf of users. When a user signs an EIP-3009 authorization, they're not paying gas—the relayer submits the transaction and pays the fee.

```
┌─────────────────────────────────────────────────────────────────┐
│                    GAS SPONSORSHIP FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   User Wallet                    Relayer Wallet                  │
│   ┌─────────────┐               ┌─────────────┐                 │
│   │ USDT0: $100 │               │ USDT0: $0   │                 │
│   │ PLASMA: $0  │  ──signs──▶   │ PLASMA: $50 │  ──pays gas──▶ │
│   └─────────────┘               └─────────────┘                 │
│                                                                  │
│   User NEVER needs native tokens!                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Relayer Implementation

```typescript
// src/app/api/submit-transfer/route.ts (simplified)

export async function POST(request: Request) {
  // 1. Parse and validate the signed authorization
  const { from, to, value, validAfter, validBefore, nonce, v, r, s } = await request.json();
  
  // 2. Server-side validation
  if (BigInt(value) > MAX_AMOUNT) {
    return NextResponse.json({ error: 'Amount too large' }, { status: 400 });
  }
  
  // 3. Create relayer wallet client
  const relayer = privateKeyToAccount(process.env.RELAYER_PRIVATE_KEY);
  const walletClient = createWalletClient({
    account: relayer,
    chain: plasmaMainnet,
    transport: http(PLASMA_RPC),
  });
  
  // 4. Execute the transfer (relayer pays gas)
  const txHash = await walletClient.writeContract({
    address: USDT0_ADDRESS,
    abi: TRANSFER_WITH_AUTH_ABI,
    functionName: 'transferWithAuthorization',
    args: [from, to, BigInt(value), BigInt(validAfter), BigInt(validBefore), nonce, v, r, s],
  });
  
  // 5. Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  
  return NextResponse.json({ success: true, txHash });
}
```

### Cost Analysis

| Network | Gas Price | Gas Used | Cost per Transfer |
|---------|-----------|----------|-------------------|
| Plasma Mainnet | ~0.001 gwei | ~65,000 | < $0.0001 |
| Ethereum L1 | ~20 gwei | ~65,000 | ~$3-5 |

Plasma's low gas costs make sponsorship economically viable for high-volume payments.

### Funding the Relayer

See [DEPLOYMENT.md](./DEPLOYMENT.md) for relayer funding instructions.

---

## Payment Flows

### Flow 1: Direct Transfer (Registered User)

The simplest flow—both sender and recipient have wallets.

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Sender  │───▶│ Sign    │───▶│ Relay   │───▶│  Done   │
│ enters  │    │ EIP-712 │    │ submits │    │ Instant │
│ address │    │ auth    │    │ on-chain│    │ transfer│
└─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### Flow 2: Claim (Unregistered Recipient)

When sending to someone without a wallet, funds are held in escrow until claimed.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLAIM FLOW                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  SENDER SIDE:                                                            │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐              │
│  │ Enter   │───▶│ Sign    │───▶│ Create  │───▶│ Email   │              │
│  │ email   │    │ to      │    │ claim   │    │ sent to │              │
│  │         │    │ escrow  │    │ record  │    │ recipient│              │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘              │
│                                                                          │
│  RECIPIENT SIDE:                                                         │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐              │
│  │ Click   │───▶│ Sign up │───▶│ Execute │───▶│ Funds   │              │
│  │ claim   │    │ via     │    │ claim   │    │ in      │              │
│  │ link    │    │ Privy   │    │ tx      │    │ wallet  │              │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Details:**
1. Sender signs authorization with escrow address as recipient
2. Claim record stores the signed authorization
3. Claim token (secure random) is sent to recipient
4. Recipient signs up, provides their new wallet address
5. Claim API executes the stored authorization

### Flow 3: Payment Link

Shareable links for receiving payments.

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Creator   │    │   Payer     │    │   Result    │
│  generates  │    │  visits     │    │             │
│  /pay link  │    │  /pay/[id]  │    │  Transfer   │
│             │───▶│  signs tx   │───▶│  to creator │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Flow 4: Payment Request

Requesting money from someone.

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Requester  │    │   Email     │    │   Payer     │    │   Request   │
│  creates    │───▶│   sent to   │───▶│   pays via  │───▶│   marked    │
│  request    │    │   payer     │    │   link      │    │   paid      │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

---

## Data Models

### Core Schema (Prisma)

```prisma
// Payment Links
model PaymentLink {
  id             String    @id @default(cuid())
  creatorAddress String
  creatorEmail   String?
  amount         Float?    // null = any amount
  currency       String    @default("USDT0")
  memo           String?
  status         String    @default("active") // active, paid, expired
  paidBy         String?
  paidAt         DateTime?
  txHash         String?
  expiresAt      DateTime?
  createdAt      DateTime  @default(now())
}

// Payment Requests
model PaymentRequest {
  id           String    @id @default(cuid())
  fromAddress  String
  fromEmail    String?
  toIdentifier String    // email, phone, or address
  toAddress    String?
  amount       Float
  currency     String    @default("USDT0")
  memo         String?
  status       String    @default("pending") // pending, paid, expired, cancelled
  txHash       String?
  paidAt       DateTime?
  expiresAt    DateTime
  createdAt    DateTime  @default(now())
}

// Claims (for unregistered recipients)
model Claim {
  id             String    @id @default(cuid())
  tokenHash      String    @unique  // SHA-256 of claim token
  senderAddress  String
  senderEmail    String?
  recipientEmail String?
  recipientPhone String?
  authorization  String    // JSON-encoded EIP-3009 auth
  amount         Float
  currency       String    @default("USDT0")
  memo           String?
  status         String    @default("pending") // pending, claimed, expired
  claimedBy      String?
  claimedAt      DateTime?
  txHash         String?
  expiresAt      DateTime
  createdAt      DateTime  @default(now())
}

// Contacts
model Contact {
  id              String    @id @default(cuid())
  ownerAddress    String
  contactAddress  String?
  name            String
  email           String?
  phone           String?
  isFavorite      Boolean   @default(false)
  lastPayment     DateTime?
  createdAt       DateTime  @default(now())
  
  @@unique([ownerAddress, contactAddress])
}

// Activity Feed
model Activity {
  id            String   @id @default(cuid())
  type          String   // payment, request, claim
  actorAddress  String
  actorName     String
  targetAddress String
  targetName    String
  amount        Float
  currency      String   @default("USDT0")
  memo          String?
  txHash        String?
  visibility    String   @default("public") // public, private
  likes         Int      @default(0)
  createdAt     DateTime @default(now())
}
```

---

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: TRANSPORT                                              │
│  ├── HTTPS only (TLS 1.3)                                       │
│  ├── HSTS headers                                                │
│  └── Certificate pinning (mobile)                               │
│                                                                  │
│  Layer 2: APPLICATION                                            │
│  ├── Rate limiting (Redis-backed)                               │
│  ├── Input validation (Zod schemas)                             │
│  ├── CSRF protection                                            │
│  └── Security headers (CSP, X-Frame-Options, etc.)              │
│                                                                  │
│  Layer 3: AUTHENTICATION                                         │
│  ├── Privy authentication (OAuth, email OTP)                    │
│  ├── Session management                                          │
│  └── API key rotation                                           │
│                                                                  │
│  Layer 4: AUTHORIZATION                                          │
│  ├── Signature verification (EIP-712)                           │
│  ├── Nonce replay protection                                    │
│  └── Time-bound authorizations                                  │
│                                                                  │
│  Layer 5: DATA                                                   │
│  ├── Encrypted at rest (database)                               │
│  ├── PII minimization                                           │
│  └── Claim token hashing (SHA-256)                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Rate Limiting

```typescript
// Redis-backed rate limiting (production)
const RATE_LIMIT_CONFIGS = {
  read: { 
    windowSec: 60, 
    maxRequests: 100 
  },
  payment: { 
    windowSec: 60, 
    maxRequests: 10 
  },
  bridge: { 
    windowSec: 60, 
    maxRequests: 30 
  },
};
```

### Input Validation

All API inputs are validated with Zod:

```typescript
const transferSchema = z.object({
  from: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  value: z.string().refine((v) => BigInt(v) > 0n),
  validAfter: z.number().int().positive(),
  validBefore: z.number().int().positive(),
  nonce: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  v: z.number().int().min(27).max(28),
  r: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  s: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});
```

### Security Headers

```typescript
// Middleware applies to all routes
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
```

### Secret Management

| Secret | Storage | Rotation |
|--------|---------|----------|
| `RELAYER_PRIVATE_KEY` | Vercel encrypted env | On compromise |
| `PRIVY_APP_SECRET` | Vercel encrypted env | 90 days |
| `API_AUTH_SECRET` | Vercel encrypted env | 30 days |
| `DATABASE_URL` | Vercel encrypted env | On DB credential change |

**Never:**
- Commit secrets to git
- Log private keys or signatures
- Expose relayer key to frontend
- Use production keys in development
