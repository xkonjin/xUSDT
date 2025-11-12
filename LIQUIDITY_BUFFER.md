# Global Liquidity Buffer System

## Overview

The liquidity buffer is a **global USDC pool on Polygon** that limits the maximum bet amount across all users. This ensures the platform can always fulfill bets instantly without waiting for conversions.

## Architecture

### Key Concept

**Max Bet = min(User Balance, Buffer Balance)**

The buffer acts as a global cap on betting capacity. Even if users have large balances, they can only bet up to the available buffer amount.

### Flow

```
1. User deposits USDT0 → Conversion completes → Buffer replenished
2. User places bet → Buffer checked → Buffer deducted → Bet placed
3. Max bet = min(user_balance, buffer_balance)
```

## Database Schema

### `liquidity_buffer` Table

**Singleton table** (only one row) tracking global buffer:

```sql
- id: Primary key
- buffer_id: "global" (singleton identifier)
- usdc_balance: Current USDC balance on Polygon (atomic units, 6 decimals)
- min_buffer_size: Minimum buffer size (10,000 USDC default)
- max_buffer_size: Optional maximum buffer size cap
- total_deposited: Lifetime total deposited to buffer
- total_withdrawn: Lifetime total withdrawn from buffer
- last_replenished_at: Last replenishment timestamp
- updated_at: Last update timestamp
```

## Service Layer

### `LiquidityBufferService`

**Key Methods:**

1. **`get_buffer_status()`** - Get current buffer status and statistics
2. **`get_max_bet_amount(user_balance)`** - Calculate max bet for a user
3. **`check_buffer_sufficient(amount)`** - Check if buffer has enough for a bet
4. **`deduct_buffer(amount)`** - Deduct when bet is placed
5. **`replenish_buffer(amount)`** - Replenish when conversion completes
6. **`refund_buffer(amount)`** - Refund if bet fails

## Integration Points

### 1. Betting Orchestrator (`betting_orchestrator.py`)

**Updated Flow:**

```python
def place_bet_from_balance(...):
    # Step 1: Check user balance
    user_balance = balance_service.get_balance(user_address)
    
    # Step 2: Check liquidity buffer (global max bet limit)
    max_bet = liquidity_buffer_service.get_max_bet_amount(user_balance)
    if bet_amount > max_bet:
        raise ValueError("Bet exceeds global maximum")
    
    # Step 3: Deduct from user balance
    balance_service.deduct_balance(user_address, bet_amount)
    
    # Step 4: Deduct from liquidity buffer
    liquidity_buffer_service.deduct_buffer(bet_amount)
    
    # Step 5: Place bet on Polymarket
    # ...
    
    # On failure: Refund both user balance and buffer
```

### 2. Conversion Job (`conversion_job.py`)

**Updated Flow:**

```python
def _process_deposit(deposit):
    # Convert USDT0 → USDC
    estimated_usdc = deposit.usdt0_amount
    
    # Credit user balance
    balance_service.credit_balance(...)
    
    # Replenish liquidity buffer
    liquidity_buffer_service.replenish_buffer(estimated_usdc)
```

## API Endpoints

### 1. `GET /balance?user_address=...`

**Returns:**
- User balance
- Pending deposits
- **Max bet amount** (min of user balance and buffer)

### 2. `GET /buffer/status`

**Returns:**
- Buffer balance
- Min/max buffer sizes
- Statistics (utilization, etc.)
- Low buffer alerts

### 3. `GET /buffer/max-bet?user_address=...`

**Returns:**
- Max bet amount
- Breakdown (user balance vs buffer balance)
- Limiting factor

## Frontend Integration

### Display Max Bet

The frontend should:

1. **Show max bet limit** when user enters bet amount
2. **Disable bet button** if amount exceeds max bet
3. **Display buffer status** (optional, for transparency)
4. **Show limiting factor** (user balance vs buffer)

### Example UI Flow

```
User Balance: $100.00 USDC
Buffer Balance: $50.00 USDC
Max Bet: $50.00 USDC ⚠️ (Limited by buffer)

[Bet Amount Input: $50.00] ← Max
[Place Bet Button]
```

## Buffer Management

### Initial Setup

1. **Run migration** to create `liquidity_buffer` table
2. **Fund buffer** with initial USDC (via conversion or manual deposit)
3. **Set min_buffer_size** based on expected volume

### Monitoring

**Key Metrics:**
- Buffer balance (should stay above `min_buffer_size`)
- Utilization rate (withdrawn / deposited)
- Low buffer alerts (`is_low` flag)

### Replenishment

**Automatic:**
- When conversions complete, buffer is automatically replenished

**Manual:**
- Admin can manually add USDC to buffer
- Use `replenish_buffer()` method

## Benefits

1. **Instant Betting** - No waiting for conversions
2. **Global Limits** - Prevents over-betting beyond capacity
3. **Risk Management** - Ensures platform can fulfill all bets
4. **Scalability** - Can adjust buffer size based on volume

## Configuration

### Default Settings

- **Min Buffer Size:** 10,000 USDC (10,000,000,000 atomic units)
- **Max Buffer Size:** None (unlimited, optional cap)

### Recommended Buffer Sizing

```
Minimum Buffer = Average Daily Bet Volume × 2
Example: $5,000 daily bets → $10,000 buffer
```

## Error Handling

### Insufficient Buffer

**Error Message:**
```
"Bet amount exceeds global maximum: $X.XX USDC. 
Maximum bet is $Y.YY USDC (buffer balance: $Z.ZZ USDC)"
```

**User Action:**
- Wait for buffer replenishment
- Try smaller bet amount
- Check buffer status

### Bet Failure Refund

If bet placement fails:
1. User balance is refunded
2. Buffer is refunded
3. Prediction marked as failed

## Migration

Run migration to create buffer table:

```bash
alembic upgrade head
```

This creates:
- `liquidity_buffer` table
- Initial buffer record with zero balance
- Indexes for performance

## Summary

The liquidity buffer system provides:

✅ **Global bet limits** based on available liquidity  
✅ **Instant betting** without conversion delays  
✅ **Risk management** ensuring platform can fulfill bets  
✅ **Automatic replenishment** from conversions  
✅ **Monitoring and alerts** for buffer health  

The system ensures a smooth user experience while maintaining financial stability and capacity limits.

