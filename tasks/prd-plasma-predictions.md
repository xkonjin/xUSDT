# PRD: Plasma Predictions
## Prediction Market Platform - Vampire Attack on Polymarket

**Version:** 1.0  
**Date:** January 11, 2025  
**Status:** Draft  
**Author:** Product Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [User Personas & Stories](#4-user-personas--stories)
5. [Feature Requirements](#5-feature-requirements)
6. [Technical Requirements](#6-technical-requirements)
7. [UI/UX Requirements](#7-uiux-requirements)
8. [Success Metrics](#8-success-metrics)
9. [Launch Plan](#9-launch-plan)
10. [Risk Assessment](#10-risk-assessment)

---

## 1. Executive Summary

### Product Vision

Plasma Predictions is a prediction market platform built on Plasma chain that provides a superior user experience compared to Polymarket through:

- **Zero Gas Fees**: All transactions sponsored via EIP-3009
- **Instant Settlement**: 2-4 second confirmations vs 15-60 seconds on Polymarket
- **Simple UX**: AMM-based instant swaps, no orderbook complexity
- **Mobile-First**: One-tap betting for mass adoption

### Strategic Approach: Vampire Attack

Mirror Polymarket's most popular markets via their public Gamma API while offering dramatically better UX. Users get the same predictions with:
- Zero onboarding friction
- No bridging or gas management
- Instant execution at market price
- Mobile-native experience

### Business Opportunity

| Metric | Polymarket | Plasma Predictions |
|--------|------------|-------------------|
| Avg Transaction Time | 15-60s | 2-4s |
| Gas Cost | $0.01-0.10 | $0 (sponsored) |
| Onboarding Steps | 5-7 | 2 |
| Mobile UX | Complex | Native |

**Target**: Capture 5% of Polymarket volume within 6 months by offering 10x better UX.

---

## 2. Problem Statement

### Current Pain Points on Polymarket

1. **Complex Onboarding**
   - Users must bridge to Polygon
   - Need to acquire USDC.e
   - Multiple approvals required
   - Gas tokens needed for every transaction

2. **Poor Mobile Experience**
   - CLOB (orderbook) interface designed for desktop
   - Limit orders confuse casual users
   - Multiple confirmations required

3. **Slow Execution**
   - Order matching takes 15-60 seconds
   - Price can move during execution
   - Partial fills create confusion

4. **DeFi Complexity**
   - Slippage settings intimidate new users
   - Gas estimation unpredictable
   - Failed transactions waste money

### Market Opportunity

Prediction markets are growing 200%+ annually, yet mainstream adoption is blocked by DeFi complexity. Sports betting apps prove consumers WANT to bet on outcomes, they just need a simple interface.

**Key Insight**: Polymarket optimizes for sophisticated traders. We optimize for everyone else.

---

## 3. Solution Overview

### Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLASMA PREDICTIONS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Frontend  │───▶│  FastAPI    │───▶│   Plasma    │        │
│  │  (Next.js)  │    │  Backend    │    │   Chain     │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│        │                  │                   │                │
│        ▼                  ▼                   ▼                │
│  • Privy Auth       • Market Mirror     • Conditional         │
│  • React UI         • Price Sync         Tokens (CTF)        │
│  • TailwindCSS      • Order Router      • pm-AMM Pools        │
│                     • Resolution         • Gasless Router     │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14, React, TailwindCSS | Mobile-first UI |
| Auth | Privy | Embedded wallets, social login |
| Backend | FastAPI (existing `agent/` folder) | API, market sync |
| Smart Contracts | Solidity (Gnosis CTF fork, pm-AMM) | On-chain logic |
| Chain | Plasma (Chain ID: 9745) | Fast, cheap transactions |
| Collateral | USDT0 (6 decimals) | Stablecoin payments |

### Key Differentiators

| Feature | Implementation | User Benefit |
|---------|---------------|--------------|
| Zero Gas | EIP-3009 `transferWithAuthorization` | Never buy gas tokens |
| Instant Swaps | pm-AMM (Paradigm) | No waiting for fills |
| One-Tap Betting | Combined deposit+swap | Single signature |
| Price Mirroring | Gamma API + arbitrage | Same markets as Polymarket |

---

## 4. User Personas & Stories

### Persona 1: Casual Bettor (Casey)

**Profile:**
- Age: 25-40
- Uses DraftKings/FanDuel for sports betting
- Heard about prediction markets but intimidated by crypto
- Wants simple YES/NO bets on current events

**Goals:**
- Bet on outcomes without learning DeFi
- Quick deposits/withdrawals
- Clear win/loss tracking

**Pain Points:**
- Doesn't understand wallets/gas/bridging
- Intimidated by trading interfaces
- Worried about losing money to fees

---

#### US-001: Social Login Onboarding
**Description:** As a casual bettor, I want to sign up with my email or Google account so that I don't need to create a crypto wallet.

**Acceptance Criteria:**
- [ ] User can click "Get Started" and see social login options
- [ ] Privy embedded wallet created automatically on first login
- [ ] No seed phrase shown or required from user
- [ ] User redirected to markets page within 5 seconds of login
- [ ] Session persists across browser refreshes
- [ ] Typecheck/lint passes

---

#### US-002: Browse Prediction Markets
**Description:** As a casual bettor, I want to browse trending prediction markets so that I can find interesting bets.

**Acceptance Criteria:**
- [ ] Markets displayed as cards with question, YES/NO prices
- [ ] Volume and end date shown for each market
- [ ] Markets sortable by volume, end date, category
- [ ] Search bar filters markets by keyword
- [ ] Category tabs (Politics, Crypto, Sports, Tech, etc.)
- [ ] Infinite scroll or pagination for 100+ markets
- [ ] Typecheck/lint passes

---

#### US-003: Place a Simple Bet
**Description:** As a casual bettor, I want to tap YES or NO and enter an amount so that I can place a bet in under 30 seconds.

**Acceptance Criteria:**
- [ ] Tapping YES/NO highlights selection with color coding
- [ ] Amount input shows USDT0 balance
- [ ] "Potential Winnings" calculated and displayed live
- [ ] Single "Confirm Bet" button triggers one signature
- [ ] Loading state shows "Placing bet..." with spinner
- [ ] Success confirmation shows bet details within 5 seconds
- [ ] Bet appears in "My Bets" immediately
- [ ] Typecheck/lint passes

---

#### US-004: First Deposit Flow
**Description:** As a casual bettor, I want to deposit USDT0 to my account so that I can start betting.

**Acceptance Criteria:**
- [ ] "Deposit" button shows QR code + address for USDT0 on Plasma
- [ ] Balance updates within 30 seconds of deposit confirmation
- [ ] Optional: Fiat on-ramp integration (Stripe/Transak)
- [ ] Clear instructions for users new to crypto
- [ ] Minimum deposit amount displayed ($1 USDT0)
- [ ] Typecheck/lint passes

---

#### US-005: View My Bets
**Description:** As a casual bettor, I want to see all my active bets so that I can track my predictions.

**Acceptance Criteria:**
- [ ] "My Bets" page lists all active predictions
- [ ] Each bet shows: market question, outcome selected, amount, potential payout
- [ ] Bets sorted by end date (soonest first)
- [ ] Filter tabs: Active, Resolved, Won, Lost
- [ ] Total portfolio value displayed at top
- [ ] Typecheck/lint passes

---

#### US-006: Cash Out a Bet
**Description:** As a casual bettor, I want to sell my position before resolution so that I can lock in profits or cut losses.

**Acceptance Criteria:**
- [ ] "Cash Out" button on each active bet
- [ ] Current value displayed (based on AMM price)
- [ ] Profit/loss shown before confirmation
- [ ] Single signature to execute sale
- [ ] USDT0 returned to balance within 5 seconds
- [ ] Transaction confirmation shown
- [ ] Typecheck/lint passes

---

### Persona 2: Crypto Native (Nathan)

**Profile:**
- Age: 22-35
- Active on Polymarket, understands prediction markets
- Uses MetaMask/Rabby for DeFi
- Wants better UX than Polymarket

**Goals:**
- Faster execution than Polymarket
- Lower fees
- Connect existing wallet

**Pain Points:**
- Tired of gas fees on Polygon
- Frustrated by slow order fills
- Wants to use existing wallet

---

#### US-007: Connect External Wallet
**Description:** As a crypto native, I want to connect my MetaMask wallet so that I can use my existing USDT0.

**Acceptance Criteria:**
- [ ] "Connect Wallet" shows MetaMask, WalletConnect, Coinbase Wallet
- [ ] Wallet connection completes within 10 seconds
- [ ] Plasma network auto-added if not present
- [ ] USDT0 balance displayed immediately
- [ ] Wallet address shortened in header (0x1234...5678)
- [ ] Typecheck/lint passes

---

#### US-008: Gasless Transaction Experience
**Description:** As a crypto native, I want all my transactions to be gasless so that I don't need to manage ETH on Plasma.

**Acceptance Criteria:**
- [ ] No gas prompts in wallet popup
- [ ] Only signature request shown (EIP-712)
- [ ] "Sponsored by Plasma" badge visible
- [ ] Transaction completes without user holding PLASMA/ETH
- [ ] Transaction hash viewable on Plasma explorer
- [ ] Typecheck/lint passes

---

#### US-009: View Market Depth
**Description:** As a crypto native, I want to see the AMM curve and slippage so that I understand the execution price.

**Acceptance Criteria:**
- [ ] Price impact displayed for bet amounts
- [ ] Current pool liquidity shown
- [ ] Slippage tolerance selector (0.5%, 1%, 2%)
- [ ] Warning for high slippage (>2%)
- [ ] AMM reserves viewable in advanced mode
- [ ] Typecheck/lint passes

---

#### US-010: Compare to Polymarket Prices
**Description:** As a crypto native, I want to see Polymarket prices alongside Plasma prices so that I know I'm getting a fair deal.

**Acceptance Criteria:**
- [ ] Each market shows "Polymarket: 65¢" comparison
- [ ] Price deviation highlighted if >1%
- [ ] "Prices sync every 30s" tooltip
- [ ] Link to Polymarket market for verification
- [ ] Arbitrage opportunity indicator if prices diverge
- [ ] Typecheck/lint passes

---

### Persona 3: Liquidity Provider (Lisa)

**Profile:**
- Age: 30-50
- Has idle stablecoin holdings
- Seeks yield without impermanent loss risk
- Understands AMM mechanics

**Goals:**
- Earn yield on USDT0
- Manageable risk profile
- Clear fee earnings dashboard

**Pain Points:**
- IL on traditional AMMs
- Unclear fee structures
- Complex LP interfaces

---

#### US-011: Add Liquidity to Market
**Description:** As an LP, I want to provide liquidity to prediction markets so that I can earn trading fees.

**Acceptance Criteria:**
- [ ] "Add Liquidity" button on each market
- [ ] USDT0 input with balance display
- [ ] Projected APY based on recent volume
- [ ] LP token receipt explanation
- [ ] Single signature to deposit
- [ ] Position appears in "My Liquidity" page
- [ ] Typecheck/lint passes

---

#### US-012: Remove Liquidity
**Description:** As an LP, I want to withdraw my liquidity so that I can access my funds when needed.

**Acceptance Criteria:**
- [ ] "Remove" button on each LP position
- [ ] Shows: deposited amount, earned fees, current value
- [ ] Percentage slider (25%, 50%, 75%, 100%)
- [ ] Single signature to withdraw
- [ ] USDT0 returned within 5 seconds
- [ ] Fee earnings shown in confirmation
- [ ] Typecheck/lint passes

---

#### US-013: View LP Dashboard
**Description:** As an LP, I want to see all my liquidity positions in one place so that I can manage my portfolio.

**Acceptance Criteria:**
- [ ] Dashboard shows all LP positions
- [ ] Total value locked (TVL) displayed
- [ ] Total fees earned displayed
- [ ] APY per market calculated
- [ ] Historical earnings chart
- [ ] Typecheck/lint passes

---

### Cross-Persona Stories

---

#### US-014: Share Prediction
**Description:** As any user, I want to share my prediction on social media so that I can show friends.

**Acceptance Criteria:**
- [ ] "Share" button on placed bets
- [ ] Generates shareable image with bet details
- [ ] Twitter/X card preview works
- [ ] Referral code embedded in shared link
- [ ] Copy link button for manual sharing
- [ ] Typecheck/lint passes

---

#### US-015: View Leaderboard
**Description:** As any user, I want to see top predictors so that I can compare my performance.

**Acceptance Criteria:**
- [ ] Weekly and all-time leaderboards
- [ ] Ranking by: profit, accuracy, volume
- [ ] User can see their own rank
- [ ] Top 10 gets badge on profile
- [ ] Anonymous option (show as "Anon_1234")
- [ ] Typecheck/lint passes

---

#### US-016: Receive Resolution Payout
**Description:** As any user, I want to automatically receive my winnings when a market resolves so that I don't need to claim manually.

**Acceptance Criteria:**
- [ ] Push notification when market resolves
- [ ] Winning amount auto-credited to balance
- [ ] "Resolved" status shown on bet
- [ ] Resolution details viewable (source, timestamp)
- [ ] Transaction hash provided for verification
- [ ] Typecheck/lint passes

---

#### US-017: Referral Program
**Description:** As any user, I want to invite friends and earn rewards so that I'm incentivized to grow the platform.

**Acceptance Criteria:**
- [ ] Unique referral link per user
- [ ] 1% of referee's trading fees credited to referrer
- [ ] Referral dashboard shows: invites, earnings
- [ ] Minimum payout threshold ($10)
- [ ] Withdrawal to USDT0 balance
- [ ] Typecheck/lint passes

---

## 5. Feature Requirements

### P0 (Must Have - MVP)

| ID | Feature | Description |
|----|---------|-------------|
| P0-01 | Market Mirroring | Sync top 50 Polymarket markets via Gamma API |
| P0-02 | Gasless Deposits | EIP-3009 USDT0 deposits with relayer |
| P0-03 | AMM Swaps | Buy/sell YES/NO tokens via pm-AMM |
| P0-04 | Gasless Trading | Combined deposit+swap in one signature |
| P0-05 | Market Browser | Mobile-first market discovery UI |
| P0-06 | Bet Placement | Simple YES/NO betting interface |
| P0-07 | Portfolio View | Show user's active positions |
| P0-08 | Resolution Mirroring | Auto-resolve when Polymarket resolves |
| P0-09 | Basic Auth | Privy embedded wallet + social login |
| P0-10 | USDT0 Balance | Display user's collateral balance |

### P1 (Should Have - Launch)

| ID | Feature | Description |
|----|---------|-------------|
| P1-01 | External Wallet Connect | MetaMask/WalletConnect support |
| P1-02 | Cash Out | Sell positions before resolution |
| P1-03 | Price Comparison | Show Polymarket prices for reference |
| P1-04 | Transaction History | List all user transactions |
| P1-05 | Market Search | Keyword search across markets |
| P1-06 | Category Filtering | Filter by Politics/Crypto/Sports |
| P1-07 | Push Notifications | Alerts for resolution, price moves |
| P1-08 | Share Predictions | Social sharing with preview cards |
| P1-09 | Slippage Settings | User-configurable slippage tolerance |
| P1-10 | LP Interface | Add/remove liquidity UI |

### P2 (Nice to Have - Growth)

| ID | Feature | Description |
|----|---------|-------------|
| P2-01 | Leaderboards | Weekly/all-time top predictors |
| P2-02 | Referral Program | Invite friends, earn rewards |
| P2-03 | Fiat On-Ramp | Stripe/Transak integration |
| P2-04 | Native Markets | Create markets not on Polymarket |
| P2-05 | LP Dashboard | Advanced LP analytics |
| P2-06 | Dark Mode | Theme toggle |
| P2-07 | Mobile App | React Native wrapper |
| P2-08 | Arbitrage Bot | Auto-sync prices with Polymarket |
| P2-09 | UMA Oracle | Decentralized resolution |
| P2-10 | PLASMA Token | Governance/rewards token |

---

## 6. Technical Requirements

### 6.1 Smart Contract Architecture

#### PlasmaConditionalTokens.sol (Gnosis CTF Fork)
```solidity
// Core functions for prediction market tokens
function prepareCondition(oracle, questionId, 2) → conditionId
function splitPosition(USDT0, conditionId, [1,2], amount) → YES + NO tokens
function mergePositions(conditionId, amount) → USDT0 back
function redeemPositions(conditionId) → Payout to winner
```

**Requirements:**
- [ ] Fork Gnosis Conditional Tokens Framework (CTF)
- [ ] Modify collateral to use USDT0 (6 decimals)
- [ ] Add EIP-3009 support for gasless splits
- [ ] Emit events for frontend indexing

#### PlasmaPmAMM.sol (Paradigm pm-AMM)
```solidity
// Prediction market AMM with concentrated liquidity
function swap(tokenIn, amountIn) → amountOut
function addLiquidity(amount) → lpTokens
function removeLiquidity(lpTokens) → (yes, no)
```

**Requirements:**
- [ ] Implement pm-AMM invariant: `(y-x)·Φ((y-x)/L) + L·φ((y-x)/L) - y = 0`
- [ ] Normal CDF/PDF approximations for gas efficiency
- [ ] Dynamic liquidity concentration based on time-to-expiry
- [ ] Fee mechanism (0.5% per swap)
- [ ] LP token minting/burning

#### GaslessRouter.sol
```solidity
// Combined gasless operations
function depositAndBuy(
    authorization,  // EIP-3009 params
    signature,
    marketId,
    outcome,        // YES or NO
    minAmountOut
)

function sellAndWithdraw(
    marketId,
    outcome,
    amount,
    minAmountOut
)
```

**Requirements:**
- [ ] Integrate with existing `PlasmaPaymentRouter.sol` pattern
- [ ] Single signature for deposit + swap
- [ ] Slippage protection via `minAmountOut`
- [ ] Relayer-compatible (msg.sender != from)

#### PolymarketMirrorOracle.sol
```solidity
function resolve(marketId, outcome) external onlyKeeper
function getResolution(marketId) → outcome
```

**Requirements:**
- [ ] Centralized keeper for MVP (trusted address)
- [ ] Emit resolution events
- [ ] Future: UMA optimistic oracle integration

### 6.2 Backend Requirements (FastAPI)

#### Market Sync Service
- [ ] Poll Gamma API every 30 seconds
- [ ] Create/update markets in local cache
- [ ] Map Polymarket condition_ids to Plasma markets
- [ ] Handle API rate limits gracefully

#### Price Oracle Service
- [ ] Fetch Polymarket token prices
- [ ] Update AMM target prices
- [ ] Emit WebSocket updates to frontend
- [ ] Log price deviations for monitoring

#### Order Router
- [ ] Build EIP-3009 typed data for deposits
- [ ] Build swap calldata for AMM
- [ ] Combine into single meta-transaction
- [ ] Submit to relayer for execution

#### Resolution Service
- [ ] Watch Polymarket for resolved markets
- [ ] Call oracle contract to resolve
- [ ] Trigger payout distribution
- [ ] Update frontend via WebSocket

### 6.3 Frontend Requirements (Next.js)

#### Routes
```
/predictions                    - Market browser
/predictions/[marketId]         - Market detail + betting
/predictions/my                 - User's positions
/predictions/leaderboard        - Top predictors
/lp                             - Liquidity provider dashboard
/lp/[marketId]                  - Add/remove liquidity
/profile                        - User settings, history
/referral                       - Referral dashboard
```

#### State Management
- [ ] Zustand or Jotai for client state
- [ ] React Query for server state
- [ ] WebSocket connection for real-time updates

#### Wallet Integration
- [ ] Privy SDK for embedded wallets
- [ ] RainbowKit for external wallets
- [ ] Auto network switching to Plasma (9745)

### 6.4 Infrastructure Requirements

| Component | Technology | Purpose |
|-----------|------------|---------|
| RPC Node | Plasma public RPC | Contract interactions |
| Relayer | Internal service | Gasless tx submission |
| Cache | Redis | Market data caching |
| Database | PostgreSQL | User data, predictions |
| CDN | Vercel Edge | Static assets |
| WebSocket | FastAPI + Redis pub/sub | Real-time updates |

---

## 7. UI/UX Requirements

### 7.1 Design Principles

1. **Mobile-First**: All designs start at 375px width
2. **One-Thumb Navigation**: Key actions reachable with thumb
3. **Minimal Friction**: Reduce taps to complete actions
4. **Clear Feedback**: Every action has visible response
5. **Accessibility**: WCAG 2.1 AA compliance

### 7.2 Key Screens

#### Home / Market Browser
```
┌─────────────────────────────────┐
│  🔮 Plasma Predictions          │
│  [Search...]          [Filter ▾]│
├─────────────────────────────────┤
│  🔥 Trending                    │
│  ┌─────────────────────────────┐│
│  │ Will BTC reach $100k?       ││
│  │ YES 65¢ ████░░░░░░ NO 35¢   ││
│  │ Vol: $5.2M  Ends: Dec 31    ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ Will Trump win 2024?        ││
│  │ YES 52¢ ████░░░░░░ NO 48¢   ││
│  │ Vol: $12M  Ends: Nov 5      ││
│  └─────────────────────────────┘│
│                                 │
├─────────────────────────────────┤
│  [Home]  [My Bets]  [Profile]   │
└─────────────────────────────────┘
```

#### Betting Modal
```
┌─────────────────────────────────┐
│  Will BTC reach $100k?          │
│                                 │
│  ┌───────────┐ ┌───────────┐   │
│  │    YES    │ │    NO     │   │
│  │    65¢    │ │    35¢    │   │
│  │  [✓ SEL]  │ │           │   │
│  └───────────┘ └───────────┘   │
│                                 │
│  Bet Amount                     │
│  ┌─────────────────────────────┐│
│  │ $  10.00                    ││
│  └─────────────────────────────┘│
│  Balance: $250.00 USDT0         │
│                                 │
│  You'll receive: 15.38 YES      │
│  Potential win: $15.38 (+53.8%) │
│                                 │
│  ┌─────────────────────────────┐│
│  │      CONFIRM BET            ││
│  └─────────────────────────────┘│
│                                 │
│  ⚡ Gasless • 2s confirmation   │
└─────────────────────────────────┘
```

#### My Bets
```
┌─────────────────────────────────┐
│  My Bets                        │
│  Portfolio: $347.50             │
├─────────────────────────────────┤
│  [Active] [Resolved] [All]      │
├─────────────────────────────────┤
│  ┌─────────────────────────────┐│
│  │ BTC $100k? • YES            ││
│  │ Bet: $10 → 15.38 shares     ││
│  │ Value: $11.23 (+12.3%)      ││
│  │ [Cash Out]                  ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ Trump 2024? • NO            ││
│  │ Bet: $25 → 52.08 shares     ││
│  │ Value: $23.44 (-6.2%)       ││
│  │ [Cash Out]                  ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

### 7.3 Component Library

Use existing xUI components from `v0/src/components/ui/`:
- `Card` - Container for market cards
- `Button` - Primary, secondary, outline variants
- Motion animations via `framer-motion`

### 7.4 Color System

| Color | Hex | Usage |
|-------|-----|-------|
| YES/Bull | #10B981 | Positive outcomes |
| NO/Bear | #EF4444 | Negative outcomes |
| Primary | #8B5CF6 | CTAs, links |
| Background | #0A0A0A | Dark theme base |
| Surface | #171717 | Cards, modals |
| Border | #262626 | Subtle borders |

### 7.5 Animation Guidelines

- Page transitions: 300ms ease-out
- Button press: scale(0.98) on tap
- Loading spinner: continuous rotation
- Success: checkmark with bounce
- Card hover: subtle lift (translateY -2px)

---

## 8. Success Metrics

### 8.1 North Star Metric

**Weekly Active Predictors (WAP)**: Users who place at least 1 prediction per week

### 8.2 Primary Metrics

| Metric | Target (Month 1) | Target (Month 6) |
|--------|-----------------|-----------------|
| WAP | 500 | 10,000 |
| Daily Volume | $10,000 | $1,000,000 |
| TVL in Pools | $50,000 | $5,000,000 |
| Avg Bet Size | $15 | $25 |
| Tx Success Rate | 98% | 99.5% |

### 8.3 Secondary Metrics

| Metric | Target |
|--------|--------|
| Time to First Bet | < 60 seconds |
| Avg Transaction Time | < 5 seconds |
| Price Deviation from Polymarket | < 2% |
| User Retention (7-day) | > 30% |
| Referral Conversion | > 15% |
| Mobile Traffic % | > 60% |

### 8.4 Health Metrics

| Metric | Threshold | Alert |
|--------|-----------|-------|
| API Uptime | 99.9% | < 99% |
| Contract Errors | < 0.1% | > 1% |
| Relayer Balance | > 100 PLASMA | < 50 |
| Resolution Lag | < 5 minutes | > 15 min |

---

## 9. Launch Plan

### Phase 1: Private Alpha (Week 1-2)

**Goals:**
- Core contracts deployed to Plasma testnet
- Market mirroring working with 10 markets
- Basic betting flow functional

**Deliverables:**
- [ ] PlasmaConditionalTokens.sol deployed
- [ ] SimplePmAMM.sol deployed (MVP AMM)
- [ ] GaslessRouter.sol deployed
- [ ] Market sync from Gamma API
- [ ] Basic frontend with betting
- [ ] Internal testing with 10 users

**Exit Criteria:**
- 100 successful test bets
- No critical bugs in 48 hours
- Latency < 5 seconds

### Phase 2: Closed Beta (Week 3-4)

**Goals:**
- Production contracts on Plasma mainnet
- 50 mirrored markets
- LP functionality

**Deliverables:**
- [ ] Mainnet contract deployment
- [ ] Full pm-AMM implementation
- [ ] LP add/remove liquidity
- [ ] Resolution mirroring
- [ ] Push notifications
- [ ] 100 beta users invited

**Exit Criteria:**
- $10,000 TVL
- 500 bets placed
- < 1% failed transactions

### Phase 3: Public Launch (Week 5-6)

**Goals:**
- Open access
- Marketing push
- Referral program live

**Deliverables:**
- [ ] Public access enabled
- [ ] Referral system launched
- [ ] Leaderboard live
- [ ] PR/marketing campaign
- [ ] Community Discord/Telegram

**Exit Criteria:**
- 1,000 users registered
- $50,000 TVL
- Featured on crypto news sites

### Phase 4: Growth (Month 2+)

**Goals:**
- Scale to Polymarket volume
- Independent liquidity
- Native markets

**Deliverables:**
- [ ] Arbitrage bot for price sync
- [ ] UMA oracle integration
- [ ] Native market creation
- [ ] Mobile app (React Native)
- [ ] Fiat on-ramp

---

## 10. Risk Assessment

### 10.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Smart contract bugs | Medium | Critical | Audit before mainnet, bug bounty, limited TVL cap |
| Relayer downtime | Medium | High | Multiple relayer instances, fallback to user-paid gas |
| Plasma network issues | Low | Critical | Circuit breaker, manual resolution fallback |
| AMM manipulation | Medium | High | MEV protection, price bounds, volume limits |
| API rate limits (Gamma) | Medium | Medium | Caching, multiple endpoints, web scraper backup |

### 10.2 Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Low initial liquidity | High | Medium | Protocol-owned liquidity (POL), LP incentives |
| Polymarket API changes | Medium | High | API backup plans, cached data, direct indexing |
| User trust issues | Medium | High | Transparent operations, audits, social proof |
| Competition enters | Low | Medium | First-mover advantage, better UX, community |

### 10.3 Regulatory Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| US regulatory action | Medium | Critical | Geo-block US users, legal counsel, ToS |
| Securities classification | Low | High | Only prediction markets, no financial advice |
| AML/KYC requirements | Medium | Medium | Privy KYC optional tier, transaction limits |

### 10.4 Risk Mitigation Summary

1. **Start Small**: Launch with 10 markets, $50k TVL cap
2. **Move Fast**: Ship MVP in 2 weeks, iterate based on feedback
3. **Be Transparent**: Open-source contracts, public audit reports
4. **Build Community**: Discord, Twitter, ambassador program
5. **Legal First**: ToS, geo-blocking, regulatory monitoring

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| CTF | Conditional Token Framework - Gnosis standard for prediction markets |
| pm-AMM | Paradigm's prediction market AMM design |
| EIP-3009 | Ethereum standard for meta-transactions with authorization |
| USDT0 | Bridged Tether stablecoin on Plasma |
| Gamma API | Polymarket's public market data API |
| CLOB | Central Limit Order Book (Polymarket's trading mechanism) |
| TVL | Total Value Locked (liquidity in the protocol) |
| IL | Impermanent Loss (LP risk on price movement) |

---

## Appendix B: Related Documents

- [PLASMA_PREDICTIONS_PLAN.md](../thoughts/PLASMA_PREDICTIONS_PLAN.md) - Technical deep dive
- [Polymarket client](../agent/polymarket/client.py) - Existing Gamma API integration
- [PlasmaPaymentRouter.sol](../contracts/plasma/PlasmaPaymentRouter.sol) - Payment router pattern
- [Predictions UI](../v0/src/app/predictions/) - Existing prediction market UI

---

## Appendix C: Open Questions

1. **Liquidity Bootstrap**: How much protocol-owned liquidity is needed to launch?
   - Recommendation: $50,000 initial liquidity across top 10 markets

2. **Fee Structure**: What trading fee maximizes volume while covering costs?
   - Recommendation: 0.5% (70% to LPs, 30% to protocol)

3. **Resolution Authority**: Who resolves disputes if Polymarket is wrong?
   - Recommendation: Start centralized, migrate to UMA for decentralization

4. **Token Launch**: Should we launch a PLASMA governance token?
   - Recommendation: Defer to Phase 4, focus on product-market fit first

5. **Geo-Blocking**: Which jurisdictions should we block?
   - Recommendation: US, UK, Singapore, Australia at minimum

---

*Document Version: 1.0*  
*Last Updated: January 11, 2025*  
*Next Review: January 25, 2025*
