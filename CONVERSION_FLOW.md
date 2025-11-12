# USDT0 → USDC Conversion Flow

## Overview

The conversion system transforms USDT0 (Plasma network) into USDC (Polygon network) for Polymarket betting. The system uses a **liquidity pool approach** to provide instant user experience while handling conversions asynchronously in the background.

## Current Implementation Status

**Status: MVP/Placeholder Implementation**

The current implementation uses a simplified approach:
- Users are credited **immediately** from a liquidity pool
- Actual conversions happen **asynchronously** in the background
- Conversion rate is **1:1** (simplified for stablecoins)

## Architecture

### Two-Phase Conversion System

```
Phase 1: Instant Credit (User Experience)
├── User deposits USDT0
├── System credits USDC balance immediately
└── User can bet instantly

Phase 2: Background Conversion (Settlement)
├── Conversion job processes deposit
├── Bridges/swaps USDT0 → USDC
└── Replenishes liquidity pool
```

## Detailed Flow

### Step 1: User Deposit (x402 Payment)

**Time: ~2-5 seconds** (Plasma network confirmation)

1. User initiates deposit via x402 payment protocol
2. User signs EIP-3009 `TransferWithAuthorization` on Plasma
3. Payment handler receives `PaymentSubmitted` event
4. Payment is settled on-chain (Plasma network)
5. Deposit record created with status `pending`

**Code Path:**
- `agent/polymarket_payment_handler.py` → `handle_deposit_payment()`
- Creates deposit record via `BalanceService.create_deposit()`

### Step 2: Instant Balance Credit

**Time: < 1 second** (Database operation)

1. Conversion job processes pending deposits
2. Estimates USDC amount (currently 1:1 rate)
3. **Immediately credits user balance** from liquidity pool
4. User can now bet instantly

**Code Path:**
- `agent/conversion_job.py` → `process_pending_deposits()`
- `agent/balance_service.py` → `credit_balance()`

### Step 3: Background Conversion (Actual Swap)

**Time: 2-5 minutes** (Polygon network + DEX swap)

This is where the **actual conversion** happens:

#### Option A: Direct Bridge + DEX Swap (Recommended)

1. **Bridge USDT0 from Plasma → Polygon** (~1-2 minutes)
   - Use Plasma's native bridge or third-party bridge (e.g., Stargate, Across)
   - Wait for bridge confirmation on Polygon

2. **Swap USDT0 (Polygon) → USDC on Polygon DEX** (~30 seconds - 2 minutes)
   - Use 1inch aggregator or Uniswap V3
   - Execute swap transaction
   - Wait for confirmation

3. **Replenish Liquidity Pool** (~30 seconds)
   - Transfer USDC to conversion service wallet
   - Pool is ready for next deposit

**Total Time: 2-5 minutes**

#### Option B: CEX Conversion (Alternative)

1. **Bridge USDT0 → CEX** (~1-2 minutes)
2. **Trade USDT0 → USDC on CEX** (~10-30 seconds)
3. **Withdraw USDC to Polygon** (~2-5 minutes)

**Total Time: 3-8 minutes**

## Conversion Methods

### Method 1: DEX Aggregator (1inch) - **Current Implementation**

**How it works:**
- Uses 1inch API to find best swap route
- Executes swap on Polygon DEX
- Handles slippage protection

**Code:**
```python
# agent/conversion_service.py
def execute_swap(self, from_token, to_token, amount, slippage=1.0):
    # Get swap data from 1inch
    swap_data = self.get_swap_data(...)
    # Execute transaction
    tx_hash = self.w3.eth.send_raw_transaction(...)
    # Wait for confirmation
    receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)
```

**Timing:**
- API call: ~1-2 seconds
- Transaction confirmation: ~30 seconds - 2 minutes (Polygon block time ~2 seconds)
- **Total: ~30 seconds - 2 minutes**

### Method 2: Bridge Integration (Not Yet Implemented)

**How it would work:**
1. Bridge USDT0 from Plasma to Polygon
2. Then swap bridged token to USDC

**Timing:**
- Bridge: ~1-2 minutes (depends on bridge)
- Swap: ~30 seconds - 2 minutes
- **Total: ~2-4 minutes**

### Method 3: Liquidity Pool (Current MVP Approach)

**How it works:**
- Service maintains USDC pool on Polygon
- Users credited immediately from pool
- Pool replenished asynchronously

**Timing:**
- Credit: **Instant** (< 1 second)
- Replenishment: Background (2-5 minutes)

## Current Implementation Details

### Conversion Service (`agent/conversion_service.py`)

**Status: Placeholder**

```python
def convert_usdt0_to_usdc(self, usdt0_amount, user_address, slippage=1.0):
    """
    Currently returns mock conversion.
    In production, would:
    1. Bridge USDT0 Plasma → Polygon
    2. Swap to USDC on Polygon DEX
    3. Return actual USDC amount
    """
    return {
        "usdc_amount": usdt0_amount,  # 1:1 for stablecoins (simplified)
        "tx_hash": "0x0000...",  # Placeholder
        "status": "pending",
    }
```

### Conversion Job (`agent/conversion_job.py`)

**Status: Immediate Credit**

```python
def _process_deposit(self, deposit):
    """
    Current flow:
    1. Estimate USDC (1:1 rate)
    2. Credit user immediately
    3. TODO: Implement actual conversion
    """
    estimated_usdc = deposit.usdt0_amount  # Simplified
    self.balance_service.credit_balance(...)  # Instant credit
    # TODO: Actual conversion happens here
```

## Timing Breakdown

### User Experience (Instant Betting)

| Step | Time | Description |
|------|------|-------------|
| Deposit USDT0 | 2-5 sec | Plasma network confirmation |
| Balance Credit | < 1 sec | Database operation |
| **User Can Bet** | **~3-6 seconds total** | ✅ Instant UX |

### Background Conversion (Settlement)

| Step | Time | Description |
|------|------|-------------|
| Bridge USDT0 → Polygon | 1-2 min | Cross-chain transfer |
| Swap to USDC | 30 sec - 2 min | DEX swap on Polygon |
| Confirmation | 30 sec | Network confirmation |
| **Total** | **2-5 minutes** | Background processing |

## Production Implementation Requirements

### 1. Bridge Integration

**Options:**
- **Plasma Native Bridge** (if available)
- **Stargate Finance** - Cross-chain bridge
- **Across Protocol** - Optimistic bridge
- **LayerZero** - Omnichain protocol

**Implementation:**
```python
def bridge_usdt0_to_polygon(self, amount, user_address):
    # 1. Lock USDT0 on Plasma
    # 2. Wait for bridge confirmation
    # 3. Receive wrapped USDT0 on Polygon
    # 4. Return wrapped token address
```

### 2. DEX Swap Integration

**Current: 1inch API** (partially implemented)

**Full Implementation Needed:**
```python
def execute_swap(self, from_token, to_token, amount):
    # 1. Get quote from 1inch
    quote = self.get_quote(from_token, to_token, amount)
    
    # 2. Get swap transaction data
    swap_data = self.get_swap_data(...)
    
    # 3. Execute swap transaction
    tx_hash = self.w3.eth.send_raw_transaction(...)
    
    # 4. Wait for confirmation
    receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
    
    # 5. Return actual USDC amount received
    return actual_usdc_amount, tx_hash
```

### 3. Liquidity Pool Management

**Requirements:**
- Maintain USDC balance on Polygon
- Monitor pool levels
- Auto-replenish when low
- Handle edge cases (insufficient liquidity)

**Pool Size Calculation:**
```
Minimum Pool Size = Average Daily Deposits × 2
Example: $10,000 daily deposits → $20,000 pool
```

## Rate & Fees

### Current (MVP)
- **Rate:** 1:1 (USDT0 = USDC)
- **Fees:** 0% (simplified)

### Production (Expected)
- **Rate:** ~0.999-1.001 (stablecoin parity with small variance)
- **Bridge Fee:** 0.05-0.1% (depends on bridge)
- **DEX Swap Fee:** 0.05-0.3% (depends on DEX)
- **Slippage:** 0.1-0.5% (for stablecoin pairs)
- **Total Expected Loss:** ~0.1-0.4% per conversion

## Error Handling & Retries

### Current Implementation

**Retry Logic:**
- Deposits stuck in `converting` status > 5 minutes are retried
- Failed conversions marked as `failed`
- User balance not affected (already credited)

**Code:**
```python
# agent/conversion_job.py
def process_converting_deposits(self):
    # Get deposits stuck in converting status (older than 5 minutes)
    cutoff = datetime.utcnow() - timedelta(minutes=5)
    stuck = session.query(Deposit).filter(...)
    # Retry conversion
```

## Monitoring & Observability

### Key Metrics to Track

1. **Conversion Time**
   - Average: Target < 3 minutes
   - P95: Target < 5 minutes
   - P99: Target < 10 minutes

2. **Success Rate**
   - Target: > 99%
   - Monitor failed conversions

3. **Liquidity Pool**
   - Current balance
   - Replenishment rate
   - Low balance alerts

4. **Conversion Rate**
   - Actual USDC received vs USDT0 deposited
   - Track slippage and fees

## Summary

### User Experience
- **Deposit → Bet Time:** ~3-6 seconds ✅
- **Conversion happens:** In background (2-5 minutes)
- **User impact:** None (instant betting)

### Technical Implementation
- **Current:** Placeholder/simulation
- **Production:** Requires bridge + DEX integration
- **Timing:** 2-5 minutes for actual conversion
- **UX:** Instant via liquidity pool

### Next Steps for Production

1. ✅ **Liquidity Pool** - Implemented (instant credit)
2. ⏳ **Bridge Integration** - Needs implementation
3. ⏳ **DEX Swap** - Partially implemented (needs completion)
4. ⏳ **Rate Monitoring** - Needs implementation
5. ⏳ **Error Recovery** - Basic retry logic exists

The system is designed for **instant user experience** with **asynchronous settlement**, providing the best of both worlds: fast UX and proper on-chain conversion.

