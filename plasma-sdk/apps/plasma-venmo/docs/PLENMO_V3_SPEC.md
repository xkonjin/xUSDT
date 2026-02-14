# Plenmo v3 — Full Redesign Spec

**Goal:** Redesign Plenmo to Apple/Stripe quality standards. Fully abstract crypto. Anyone can pay anyone from anywhere.

---

## 1. Critical Bugs (Fix First)

### 1.1 "Failed to resolve recipient" (Screenshot #1)

**Root cause:** `resolve-recipient/route.ts:130` — the catch-all block fires when Privy server SDK throws. Two scenarios:

- `PRIVY_APP_SECRET` not set in Vercel → `getPrivyClient()` returns null → falls through to "Service not configured" (503)
- Privy API call itself throws → catch block returns "Failed to resolve recipient" (500)

**Fix:**

- Verify `PRIVY_APP_ID` and `PRIVY_APP_SECRET` are set in Vercel dashboard
- The code at line 101-108 already handles unregistered users gracefully (`needsClaim: true`) — the error means the API call crashed, not that the user wasn't found

### 1.2 Email Links Don't Work

**Root cause:** `notify/route.ts:276-278` — requires `RESEND_API_KEY` env var. Without it, emails are silently skipped (logged to console only).

**Fix:**

- Set `RESEND_API_KEY` in Vercel
- Set `RESEND_FROM_EMAIL` to verified domain (e.g., `noreply@plenmo.vercel.app` or custom domain)
- Resend requires domain verification for production — use their free tier initially

### 1.3 External Wallet UX is Crypto-Native (Screenshot #3)

**Root cause:** `ExternalWalletPay.tsx` shows a 3-step manual process: Add Plasma Network → Copy Amount → Copy Address → Open MetaMask. This is designed for crypto users only.

**Fix:** Replace with a unified payment gateway (see Section 3).

---

## 2. Design System Overhaul

### 2.1 Typography

| Element        | Current        | Target                                             |
| -------------- | -------------- | -------------------------------------------------- |
| Font           | System default | **Inter Variable** (body) + **DM Sans** (headings) |
| Body           | 14px           | 15px mobile, 16px desktop                          |
| Button         | 14px           | 16px, semi-bold (600)                              |
| H1 Display     | 24px           | 36px mobile, 48px desktop                          |
| Amount Display | 28px           | 48px mobile, 64px desktop                          |
| Caption        | 12px           | 13px                                               |
| Line height    | ~1.4           | 1.5 body, 1.2 display                              |

**Rationale:** Inter has tall x-height for small screens. DM Sans adds personality for headings without being as cold as pure geometric fonts.

### 2.2 Spacing (8px Grid)

| Token         | Current    | Target     |
| ------------- | ---------- | ---------- |
| `space-xs`    | 4px        | 4px        |
| `space-sm`    | 8px        | 8px        |
| `space-md`    | 12px       | 16px       |
| `space-lg`    | 16px       | 24px       |
| `space-xl`    | 24px       | 32px       |
| `space-2xl`   | 32px       | 48px       |
| Button height | 44px       | 56px       |
| Input height  | 40px       | 52px       |
| Card padding  | 16px (p-4) | 24px (p-6) |
| Card gap      | 16px       | 20px       |

### 2.3 Color System

**Current:** Dark background (#0a0a0f), cyan accent (#00d4ff), green (#1DB954)

**Target:** Keep dark mode as default but elevate to premium:

| Token            | Value                    | Usage                       |
| ---------------- | ------------------------ | --------------------------- |
| `bg-primary`     | `#0A0A0F`                | Page background             |
| `bg-elevated`    | `#141419`                | Cards, modals               |
| `bg-surface`     | `#1C1C24`                | Inputs, secondary cards     |
| `border-subtle`  | `rgba(255,255,255,0.06)` | Card borders                |
| `border-default` | `rgba(255,255,255,0.10)` | Input borders               |
| `text-primary`   | `#FFFFFF`                | Headings                    |
| `text-secondary` | `rgba(255,255,255,0.60)` | Labels, descriptions        |
| `text-tertiary`  | `rgba(255,255,255,0.35)` | Placeholders, hints         |
| `accent`         | `#1DB954`                | Primary CTA (green = brand) |
| `success`        | `#22C55E`                | Confirmations               |
| `warning`        | `#F59E0B`                | Warnings                    |
| `error`          | `#EF4444`                | Errors                      |
| `money-green`    | `#1DB954`                | Balance displays            |

**Key change:** Green (#1DB954) is the primary brand color for CTAs, balance, and success states. Remove cyan/purple accents.

### 2.4 Component Patterns

**Remove:** `liquid-glass`, `clay-card`, `clay-button` — these create a gaming/glassy aesthetic
**Replace with:** Clean elevated cards with subtle borders, no blur effects

```
Card: bg-elevated rounded-2xl border border-subtle p-6
Input: bg-surface rounded-xl border border-default px-4 h-[52px]
Button Primary: bg-accent text-white rounded-xl h-[56px] font-semibold
Button Secondary: bg-surface text-white/80 rounded-xl h-[56px] border border-default
```

### 2.5 Motion

**Keep:** Framer Motion page transitions, scroll-reveal, stagger animations
**Remove:** Overly aggressive glow-pulse, gradient-shift on idle elements
**Add:**

- Spring physics for amount counter (`type: "spring", stiffness: 300, damping: 30`)
- Scale-down on press (0.97) for all interactive elements
- Success: confetti burst → checkmark → haptic
- Error: subtle shake (translateX oscillation)

---

## 3. "Pay from Anywhere" Architecture

### 3.1 Payment Link Experience (Non-crypto User)

**Current flow (broken):**

1. Receive link → Open → See payment details
2. Must log in with Privy (creates crypto wallet)
3. Must have USDT0 on Plasma Chain
4. OR: Open MetaMask → Add Plasma Network → Send manually

**Target flow (3-4 taps for anyone):**

1. Receive link → Open → See "Pay $25 to Jin"
2. Choose payment method:
   - **Apple Pay / Google Pay** (via Stripe Onramp) — 1 tap
   - **Venmo / Zelle / Cash App** (via ZKP2P) — redirect to app
   - **Credit/Debit Card** (via Stripe/Onramper) — enter card
   - **Crypto Wallet** (existing users) — sign transaction
   - **Plenmo Balance** (logged-in users) — instant
3. Confirmation screen

### 3.2 Integration Priority

| Method                 | Package                         | Complexity                         | Coverage                                             |
| ---------------------- | ------------------------------- | ---------------------------------- | ---------------------------------------------------- |
| **Plenmo Balance**     | Already built                   | None                               | Existing users                                       |
| **ZKP2P Fiat**         | `@plasma-pay/zkp2p` exists      | Medium — wire into pay page        | US (Venmo/Zelle), EU (Revolut), Global (Wise/PayPal) |
| **Stripe Onramp**      | New integration                 | Medium — API key + widget          | Global (card, Apple Pay, Google Pay)                 |
| **Onramper**           | New integration                 | Medium — API key + widget          | 190 countries, 130 payment methods                   |
| **Cross-chain Crypto** | `@plasma-pay/aggregator` exists | Low — already built (LI.FI bridge) | Any chain, any token                                 |

### 3.3 ZKP2P Integration (Already in Codebase!)

The `@plasma-pay/zkp2p` package and `ZKP2POnrampV2` component already exist but aren't wired into the payment link page.

**What exists:**

- `packages/zkp2p/src/client.ts` — Full client with `createOnrampRequest()`, `checkStatus()`, `waitForCompletion()`
- `apps/plasma-venmo/src/components/onramp/ZKP2POnrampV2.tsx` — Full UI component with payment method selection
- `apps/plasma-venmo/src/app/add-funds/page.tsx` — Dedicated page (but uses hardcoded zero address)

**What's needed:**

1. Wire `ZKP2POnrampV2` into `/pay/[linkId]/page.tsx` as a payment option
2. Pass the actual recipient address instead of hardcoded zero
3. Add status polling to confirm payment arrived

### 3.4 Unified Payment Gateway Component

```tsx
// New: UnifiedPaymentGateway.tsx
// Replaces ExternalWalletPay.tsx with multi-method support

interface PaymentGatewayProps {
  recipientAddress: string;
  amount: string;
  memo?: string;
  recipientName?: string;
  onSuccess: (txHash: string) => void;
  onClose: () => void;
}

// Shows payment method picker:
// 1. Plenmo Balance (if logged in + sufficient balance)
// 2. Venmo / Zelle / Cash App (ZKP2P)
// 3. Apple Pay / Card (Stripe Onramp)
// 4. Crypto Wallet (improved flow — auto-detect wallet, auto-add chain)
```

---

## 4. User Stories

### 4.1 Sender (Plenmo User)

| #   | Story                                       | Status                            |
| --- | ------------------------------------------- | --------------------------------- |
| S1  | Send money to email/phone/address           | Built (bug: recipient resolution) |
| S2  | Send to unregistered recipient (claim link) | Built                             |
| S3  | Create shareable payment request link       | Built                             |
| S4  | Share link via SMS/WhatsApp/Telegram/email  | Partially built (email broken)    |
| S5  | View transaction history                    | Built                             |
| S6  | View balance                                | Built                             |
| S7  | Fund wallet (ZKP2P fiat on-ramp)            | Component exists, not integrated  |
| S8  | Fund wallet (Bridge from other chains)      | Built (LI.FI)                     |
| S9  | Request money from someone                  | Built                             |
| S10 | Manage contacts                             | Built                             |
| S11 | QR code for receiving                       | Built                             |
| S12 | Recurring payments                          | Not built                         |
| S13 | Group payments / bill split                 | Separate app (bill-split)         |

### 4.2 Recipient (Non-Plenmo User)

| #   | Story                                            | Status                              | Priority |
| --- | ------------------------------------------------ | ----------------------------------- | -------- |
| R1  | Open payment link, see who's asking and how much | Built                               | -        |
| R2  | Pay with Plenmo balance                          | Built                               | -        |
| R3  | Pay with external crypto wallet                  | Built (bad UX)                      | **P1**   |
| R4  | Pay with Venmo/Zelle/Cash App (fiat)             | Component exists, not wired         | **P0**   |
| R5  | Pay with credit/debit card                       | Not built                           | **P1**   |
| R6  | Pay with Apple Pay / Google Pay                  | Not built                           | **P2**   |
| R7  | Pay without creating any account                 | Not built                           | **P0**   |
| R8  | Receive email notification of payment request    | Built (needs RESEND_API_KEY)        | **P0**   |
| R9  | Receive SMS notification                         | Not built                           | **P2**   |
| R10 | Pay from any blockchain/token                    | Built (bridge, but not on pay page) | **P1**   |

### 4.3 Payment Link UX (Critical Path)

**Current:**

```
[Payment Link] → [Login Required] → [Must Have USDT0] → [Pay]
                        ↓ (no account)
                  [External Wallet] → [Add Plasma Network] → [Copy Address] → [Manual Send]
```

**Target:**

```
[Payment Link] → [Choose How to Pay] → [Pay] → [Confirmation]
                        │
                        ├── Plenmo Balance (1 tap if logged in)
                        ├── Venmo / Cash App / Zelle (redirect + ZK proof)
                        ├── Card / Apple Pay (Stripe widget)
                        ├── Crypto Wallet (auto-connect, auto-chain)
                        └── Bank Transfer (Wise/Revolut via ZKP2P)
```

---

## 5. Page-by-Page Redesign

### 5.1 Payment Link Page (`/pay/[linkId]`)

**Current:** Single-column with Privy login gate, "Pay with Plenmo" button, small "External Wallet" secondary button.

**Redesign:**

```
┌─────────────────────────────────┐
│  [Plenmo logo]        [Help ?]  │
├─────────────────────────────────┤
│                                 │
│          💰 Pay Jin             │
│          jin@growgami.com       │
│                                 │
│         ┌───────────┐           │
│         │   $25.00  │           │
│         └───────────┘           │
│     "Dinner last night"         │
│                                 │
│  ─── Choose how to pay ───      │
│                                 │
│  ┌─────────────────────────┐    │
│  │ 💜 Venmo         [→]   │    │
│  ├─────────────────────────┤    │
│  │ 💳 Card          [→]   │    │
│  ├─────────────────────────┤    │
│  │  Apple Pay       [→]   │    │
│  ├─────────────────────────┤    │
│  │ 🟣 Zelle         [→]   │    │
│  ├─────────────────────────┤    │
│  │ 💰 Cash App      [→]   │    │
│  ├─────────────────────────┤    │
│  │ 🔗 Crypto Wallet [→]   │    │
│  └─────────────────────────┘    │
│                                 │
│     Zero fees · Instant         │
│     Powered by Plenmo           │
│                                 │
└─────────────────────────────────┘
```

**Key changes:**

- No login required to view the page
- Payment methods shown immediately (no gate)
- Fiat methods (Venmo, Card, Apple Pay) listed FIRST — crypto is last
- Amount prominently displayed
- Recipient shown as name, not hex address

### 5.2 Send Money Form (Main App)

**Redesign focus:** Fewer fields, bigger targets, Cash App-style amount entry.

```
┌─────────────────────────────────┐
│                                 │
│   To: [Jin ×]  or search...    │
│                                 │
│   ┌─────────────────────┐       │
│   │                     │       │
│   │      $25.00         │       │
│   │                     │       │
│   └─────────────────────┘       │
│                                 │
│   [$5] [$10] [$25] [$50] [$100] │
│                                 │
│   "What's this for?" (optional) │
│                                 │
│   ┌─────────────────────┐       │
│   │      Send $25       │       │
│   └─────────────────────┘       │
│   ┌─────────────────────┐       │
│   │    Request $25      │       │
│   └─────────────────────┘       │
│                                 │
│   0.5% fee · Instant delivery   │
│                                 │
└─────────────────────────────────┘
```

### 5.3 Home Screen

**Redesign focus:** Balance prominent, quick actions, activity feed.

```
┌─────────────────────────────────┐
│  Plenmo              [QR] [⚙]  │
├─────────────────────────────────┤
│                                 │
│          $1,250.00              │
│          Your Balance           │
│                                 │
│   [Send]  [Request]  [Add $]   │
│                                 │
│  ─── Recent Activity ───        │
│                                 │
│  Jin         +$25.00   2m ago   │
│  Alex        -$10.00   1h ago   │
│  Sarah       +$50.00   2d ago   │
│                                 │
└─────────────────────────────────┘
```

---

## 6. Technical Implementation Plan

### Phase 0: Fix Critical Bugs (1 day)

1. Set `PRIVY_APP_SECRET` in Vercel → fix recipient resolution
2. Set `RESEND_API_KEY` in Vercel → fix email notifications
3. Fix `/add-funds` page to use actual wallet address instead of hardcoded zero

### Phase 1: Design System (2-3 days)

1. Add Inter + DM Sans fonts
2. Replace clay-card/liquid-glass with clean elevated cards
3. Update color palette (accent: blue, success: green)
4. Update spacing scale to 8px grid
5. Increase button/input heights to 56px/52px

### Phase 2: Payment Link Overhaul (3-4 days)

1. Wire ZKP2POnrampV2 into `/pay/[linkId]` page
2. Build UnifiedPaymentGateway component
3. Remove login gate from payment link page
4. Add fiat-first payment method picker
5. Improve external wallet flow (auto-detect wallet, auto-add chain)

### Phase 3: Stripe/Onramper Integration (3-4 days)

1. Integrate Stripe Crypto Onramp widget
2. OR Onramper widget (broader coverage, easier integration)
3. Add Apple Pay / Google Pay via Stripe
4. Add card payment flow

### Phase 4: Send Flow Redesign (2-3 days)

1. Redesign SendMoneyForm to Cash App-style
2. Separate Send / Request flows
3. Add memo field
4. Improve recipient picker (profile pictures, search)

### Phase 5: Home Screen + Activity (2-3 days)

1. Redesign home with prominent balance
2. Quick action buttons (Send, Request, Add Funds)
3. Activity feed with real transaction data
4. Pull-to-refresh

---

## 7. Product Decisions (LOCKED)

### Q1: Primary CTA Color → **Green (#1DB954)**

Plenmo brand green. Money association. Used for all primary buttons, CTAs, and success states.

### Q2: Payment Link Authentication → **No login required**

Anyone can pay from a payment link without creating an account. Fiat-first experience.

### Q3: Fiat On-ramp Provider → **All three (ZKP2P + Stripe + Onramper)**

Cascading by availability and user region. ZKP2P for P2P fiat (Venmo/Zelle/Revolut), Stripe for card/Apple Pay, Onramper as fallback aggregator.

### Q4: Fee Model → TBD (deferred to implementation)

### Q5: @username System → TBD (deferred)

### Q6: Plenny AI Assistant → **Contextual only**

Appears on errors and when user seems stuck. Not always visible. No floating widget.

### Q7: Dark Mode vs Light Mode → **Dark default with light mode option**

Dark mode is the primary theme. Light mode available via system preference toggle.

### Q8: Mobile App vs PWA → **PWA now, native app later**

### Design Decisions (LOCKED)

- **Typography:** Inter Variable (body) + DM Sans (headings)
- **Aesthetic:** Remove all clay/glass/liquid effects → clean elevated cards with subtle borders
- **Spacing:** 8px grid, 56px buttons, 52px inputs
- **Motion:** Keep Framer Motion. Remove glow-pulse, gradient-shift on idle. Add spring physics, press feedback (0.97 scale)
