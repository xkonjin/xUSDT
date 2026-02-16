# Plenmo & Plasma SDK Consumer Overhaul Plan

## Investigation Summary

### Current State

| App                                  | Purpose                                  | State                          | Key Issues                                                                                                                                   |
| ------------------------------------ | ---------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Plenmo** (plasma-venmo)            | P2P payments, payment links, fund wallet | Builds, has UI                 | Pay page works but only accepts crypto addresses. Payment links exist but UX is clunky. No privacy mode. Add funds has ZKP2P + Stripe stubs. |
| **Bill Split** (Splitzy)             | Bill splitting                           | Light theme, localStorage-only | No blockchain integration, just a demo. No wallet connection, no actual payments.                                                            |
| **StreamPay** (plasma-stream)        | Streaming payments                       | Stub                           | Has UI structure but uses mock data, no actual streaming contract integration.                                                               |
| **SubKiller** (subkiller)            | Subscription tracker                     | Demo data                      | Uses NextAuth + Gmail API scan, but demo-only with hardcoded data.                                                                           |
| **Pledictions** (plasma-predictions) | Prediction market                        | Stub                           | Client-side only mock, no contract integration.                                                                                              |

### Architecture Available

- **@plasma-pay/gasless**: EIP-3009 transferWithAuthorization — working, production-grade
- **@plasma-pay/zkp2p**: ZKP2P/Peer.xyz client — generates deep links for fiat→crypto via Venmo/Revolut/Zelle/CashApp/PayPal
- **@plasma-pay/core**: Chain config, USDT0 address, constants
- **@plasma-pay/privy-auth**: Privy wallet + hooks (usePlasmaWallet, useUSDT0Balance)
- **@plasma-pay/share**: Social sharing (WhatsApp, SMS, Telegram)
- **@plasma-pay/lifi**: Cross-chain bridging via LI.FI
- **Payment Links API**: /api/payment-links — creates shareable links with memo, amount, expiry
- **Resolve Recipient API**: /api/resolve-recipient — email/ENS/address resolution

### Privacy Research

| Option           | How It Works                                                                                             | Production Ready                       | Integration Effort                          |
| ---------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------- |
| **Houdini Swap** | Cross-chain swap aggregator that breaks on-chain sender/receiver link. Non-custodial. Has developer API. | Yes — $2.3B volume, 870K swaps         | Medium — REST API integration               |
| **Railgun**      | ZK privacy system for ERC-20s. Shield tokens → transact privately → unshield.                            | Yes — Ethereum, Polygon, Arbitrum, BSC | High — SDK integration, needs WASM circuits |
| **ZKP2P/Peer**   | Fiat→crypto with ZK proofs of payment. Already integrated.                                               | Yes                                    | Already done                                |

### Recommendation: Houdini Swap for Privacy Mode

Houdini Swap is the pragmatic choice:

- REST API = easy integration
- Breaks sender↔receiver link = privacy goal achieved
- Cross-chain = bonus (any token → USDT0 on Plasma)
- No KYC, non-custodial, compliant
- Already has $2.3B volume proving reliability

---

## Phase 1: Plenmo Core Fixes (Most Critical)

### 1.1 Universal Payment Links

**Problem**: Payment links require Plenmo account or crypto knowledge.
**Solution**: Anyone with a link can pay using ANY method — no crypto knowledge needed.

Current flow: `/pay/[linkId]` → shows payment methods (Venmo/Zelle/CashApp/Card/Crypto)
This already exists and works! But needs polish:

- [ ] Fix: "Add Funds" button on home goes to `/add-funds` but quick action "Add Funds" has `onClick={() => {}}` (does nothing)
- [ ] Fix: Shareable link generation in `PaymentLinks.tsx` — make copy-to-clipboard work reliably
- [ ] Add: Revolut, Wise, PayPal to fiat methods on payment link page
- [ ] Add: QR code for payment link (scannable)
- [ ] Add: WhatsApp/SMS share buttons on payment link creation

### 1.2 Privacy Mode (Houdini Swap Integration)

- [ ] Create `@plasma-pay/privacy` package with Houdini Swap API client
- [ ] Add privacy toggle on SendMoneyForm: "Private Send" switch
- [ ] When enabled, route through Houdini: sender → Houdini → recipient (breaks chain link)
- [ ] Show clear UX: "Your transaction will be private. Sender and receiver cannot be linked on-chain."
- [ ] Settings page: default privacy preference toggle

### 1.3 Cross-Chain Payment Acceptance

**Problem**: Can only receive USDT0 on Plasma chain.
**Solution**: Accept any token on any chain, auto-convert to USDT0.

- [ ] Enhance `/pay/[linkId]` to show "Pay with any crypto" option
- [ ] Use LI.FI bridge SDK for cross-chain routing
- [ ] Recipient always gets USDT0 on Plasma regardless of what sender pays with
- [ ] Show: "Pay with ETH on Ethereum → Recipient gets USDT0"

### 1.4 Send to Anyone (Email/Phone/Link)

**Problem**: SendMoneyForm requires wallet address or existing contact.
**Solution**: Send to email, phone, or generate a claim link.

- [ ] Enhance recipient input: accept email, phone, wallet address
- [ ] If email: check if Plenmo user → send directly; else → create claim link + email notification
- [ ] If phone: same flow via SMS
- [ ] Claim link: `/claim/[token]` already exists — wire it properly

---

## Phase 2: UI/UX Consumer Polish

### 2.1 Plenmo Mobile Optimization

- [ ] Bottom nav: ensure touch targets are 48px minimum
- [ ] Amount input: Cash App-style numpad overlay on mobile
- [ ] Pull-to-refresh on home tab
- [ ] Haptic feedback on successful payment
- [ ] Transaction history: infinite scroll with skeleton loading
- [ ] Fix: Desktop action bar overlaps with BottomNav on tablet viewports

### 2.2 Plenmo Desktop Experience

- [ ] Side panel layout for desktop (>1024px): balance + nav left, content right
- [ ] Keyboard shortcuts: Cmd+S = Send, Cmd+R = Request, Cmd+F = Add Funds
- [ ] Transaction search/filter
- [ ] Desktop notification on incoming payment

### 2.3 Bill Split (Splitzy) Integration

- [ ] Connect to Privy wallet (currently no auth at all)
- [ ] Replace localStorage with API backend (use existing Prisma DB)
- [ ] Wire bill payments to gasless USDT0 transfers
- [ ] Generate payment links per participant: "Pay your share"
- [ ] Dark theme matching Plenmo design system
- [ ] Receipt OCR: wire up the "AI Receipt Scan" feature properly

### 2.4 StreamPay Polish

- [ ] Connect to real streaming contract (or remove if no contract exists)
- [ ] If mock: clearly show it's a demo with "Coming Soon" badge
- [ ] Match dark theme design system

---

## Phase 3: Privacy & Advanced Features

### 3.1 Houdini Swap Package

```typescript
// packages/privacy/src/index.ts
export class HoudiniClient {
  // Get quote for private swap
  async getQuote(params: PrivateSwapParams): Promise<SwapQuote>;
  // Execute private swap
  async executeSwap(quote: SwapQuote): Promise<SwapResult>;
  // Check swap status
  async getStatus(swapId: string): Promise<SwapStatus>;
}
```

### 3.2 Privacy UI Components

- [ ] `PrivacyToggle` component — shield icon, tooltip explaining what it does
- [ ] `PrivatePaymentProgress` — shows Houdini swap stages
- [ ] Settings → Privacy section with defaults

---

## Execution Order

Given scope, focus on highest-impact items first:

**Sprint 1** (this session): Fix broken UX in Plenmo

1. Fix "Add Funds" button (dead onClick)
2. Fix SendMoneyForm recipient resolution (email → address)
3. Add Revolut/Wise/PayPal to payment methods
4. Polish payment link page
5. Fix mobile touch targets and responsive issues

**Sprint 2**: Privacy mode + cross-chain

1. Create Houdini Swap integration package
2. Add privacy toggle to send flow
3. Cross-chain payment acceptance via LI.FI

**Sprint 3**: Bill Split integration

1. Connect Splitzy to Privy auth + blockchain payments
2. Dark theme unification

**Sprint 4**: Desktop optimization + polish

1. Desktop layout improvements
2. Keyboard shortcuts
3. Performance optimization
