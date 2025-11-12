<!-- c957bb90-15b5-45c8-9e5d-3ffd8e5a235e c176e224-b7ed-4893-af31-6c4f3ebb3616 -->
# Plasma USDT0 to Polymarket Integration Flow

## Overview

Integrate Polymarket betting into the existing xUSDT payment infrastructure. Users pay with USDT0 on Plasma using the x402 protocol, and the backend handles conversion to USDC on Polygon and places real bets on Polymarket.

## Complete Flow Architecture

### User Flow (Frontend)

1. **Browse Markets** → User selects a Polymarket market to bet on
2. **Select Outcome** → User chooses YES/NO prediction
3. **Enter Amount** → User enters bet amount in USDT0
4. **x402 Payment** → User pays via existing xUSDT payment flow (EIP-3009 on Plasma)
5. **Payment Confirmation** → Backend receives payment and processes bet

### Backend Flow (Orchestration)

1. **Receive x402 Payment** → Merchant service receives `PaymentSubmitted` with USDT0
2. **Settle Payment** → Facilitator settles EIP-3009 transfer on Plasma
3. **Convert USDT0 → USDC** → Conversion service bridges/swaps to Polygon USDC
4. **Place Polymarket Order** → CLOB API places order with Builder attribution
5. **Track Prediction** → Store prediction record with order ID
6. **Return Confirmation** → Send `PaymentCompleted` to user

## Key Integration Points

### 1. Extend x402 Payment Flow for Polymarket Bets

**Current Flow**: User → Merchant Service → Facilitator → Plasma Settlement

**New Flow**: User → Merchant Service → Facilitator → Plasma Settlement → **Conversion Service → Polymarket API**

**Implementation**:

- Add new endpoint: `POST /polymarket/bet` that accepts x402 payment + market details
- After payment settlement, trigger conversion and Polymarket order
- Return `PaymentCompleted` with Polymarket order ID

### 2. USDT0 → USDC Conversion Strategy

**Option A: Direct Bridge (Recommended)**

- Use Plasma's native bridge to Polygon (if available)
- Transfer USDT0 from Plasma → Polygon
- Swap USDT0 (Polygon) → USDC on Polygon DEX

**Option B: Liquidity Pool**

- Maintain USDC liquidity pool on Polygon
- Accept USDT0 deposits on Plasma
- Credit equivalent USDC from pool
- Settle balances periodically via bridge

**Option C: Third-Party Bridge Service**

- Use LayerZero, Stargate, or similar cross-chain bridge
- Bridge USDT0 → USDC directly
- Handle bridge fees and timing

**Implementation Priority**: Start with Option B (liquidity pool) for MVP, migrate to Option A when bridge is available

### 3. Polymarket CLOB API Integration

**Authentication** (per [Polymarket docs](https://docs.polymarket.com/developers/builders/builder-intro)):

- Verify exact header format from CLOB API docs
- Implement HMAC-SHA256 signature authentication
- Add Builder Program attribution headers

**Order Placement**:

- Get market token_id from market data
- Calculate order size and price
- Place LIMIT order via CLOB API
- Track order status and fills

**Builder Attribution**:

- Add `X-Builder-Key` header to orders
- Track order attribution for Builder Leaderboard
- Enable gasless transactions via Polygon relayer

### 4. Payment Integration Points

**Modify `merchant_service.py`**:

- Add `/polymarket/bet` endpoint that:

  1. Accepts x402 `PaymentSubmitted` + market_id + outcome
  2. Validates payment signature
  3. Settles payment via facilitator
  4. Triggers conversion + Polymarket order
  5. Returns `PaymentCompleted` with bet details

**Modify `betting_orchestrator.py`**:

- Add `place_bet_with_payment()` method that:

  1. Receives settled payment confirmation
  2. Extracts USDT0 amount from payment
  3. Converts to USDC
  4. Places Polymarket order
  5. Creates prediction record

**New Service: `polymarket_payment_handler.py`**:

- Handles the complete flow from payment to bet
- Coordinates between payment settlement and betting
- Manages error recovery and rollback

## Technical Implementation Details

### Authentication Headers (Polymarket CLOB API)

Based on Polymarket Builder Program docs, verify exact format:

- May use `Authorization: Bearer <token>` or custom headers
- Signature-based authentication similar to Coinbase Pro
- Builder attribution via custom header

**Action**: Check [CLOB Authentication docs](https://docs.polymarket.com/developers/builders/builder-intro) for exact header format

### Conversion Service Architecture

**Service Wallet**:

- Maintain hot wallet on Polygon with USDC liquidity
- Accept USDT0 deposits on Plasma
- Execute swaps/bridges as needed
- Monitor balances and refill pool

**Conversion Flow**:

```
User USDT0 (Plasma) 
  → Service Wallet (Plasma) receives USDT0
  → Bridge/Swap to Polygon
  → Service Wallet (Polygon) receives USDC
  → Transfer USDC to Polymarket order execution
```

### Error Handling & Rollback

**Scenarios**:

1. Payment succeeds, conversion fails → Refund USDT0 to user
2. Conversion succeeds, Polymarket order fails → Convert back or hold USDC
3. Partial fills → Track and reconcile

**Implementation**:

- Use database transactions for atomicity
- Implement idempotency keys
- Add retry logic with exponential backoff
- Log all steps for audit trail

## Database Schema Updates

**New Table: `polymarket_bets`**:

- Links x402 payment invoices to Polymarket orders
- Tracks conversion transactions
- Stores order status and fills

**Fields**:

- `invoice_id` (FK to payment invoices)
- `prediction_id` (FK to predictions table)
- `conversion_tx_hash` (Plasma → Polygon)
- `polymarket_order_id`
- `status` (pending_conversion, converting, order_placed, filled, failed)

## API Endpoints

### New Endpoints

**`POST /polymarket/bet`**:

- Accepts: `PaymentSubmitted` + `market_id` + `outcome` + `bet_amount_usdt0`
- Returns: `PaymentCompleted` with Polymarket order details
- Flow: Payment → Conversion → Order → Confirmation

**`GET /polymarket/bet/{invoice_id}`**:

- Returns: Bet status, order status, conversion status

**`POST /polymarket/bet/{invoice_id}/cancel`**:

- Cancels Polymarket order if not filled
- Handles refund if needed

### Modified Endpoints

**`POST /pay`** (existing):

- Add optional `polymarket_market_id` parameter
- If provided, trigger betting flow after payment

## Frontend Integration

### Payment Flow Integration

**Modify prediction interface** (`/predictions/[marketId]`):

- After user selects outcome and amount
- Generate x402 invoice via `/polymarket/bet` endpoint
- Use existing x402 payment UI components
- Show payment progress → conversion → order placement

**New Component: `PolymarketBetFlow.tsx`**:

- Wraps x402 payment flow
- Shows conversion status
- Displays Polymarket order confirmation
- Handles errors and retries

## Security Considerations

1. **Payment Validation**: Verify all x402 signatures before processing
2. **Amount Validation**: Ensure bet amount matches payment amount
3. **Rate Limiting**: Prevent abuse of conversion service
4. **Balance Monitoring**: Alert if service wallet runs low
5. **Audit Logging**: Log all conversions and orders

## Testing Strategy

1. **Unit Tests**: Test conversion service, Polymarket client
2. **Integration Tests**: Test full flow with testnet
3. **E2E Tests**: Test complete user journey
4. **Load Tests**: Test conversion service under load

## Deployment Checklist

- [ ] Verify Polymarket API authentication format
- [ ] Implement user profile system (display names, registration)
- [ ] Implement balance system (deposits, credits, deductions)
- [ ] Implement conversion job queue (async USDT0 → USDC)
- [ ] Update leaderboards to show display names
- [ ] Set up service wallet on Polygon with USDC liquidity pool
- [ ] Configure conversion service (bridge/DEX)
- [ ] Build deposit flow UI (x402 payment → balance credit)
- [ ] Build instant betting UI (balance check → bet placement)
- [ ] Test deposit → conversion → balance credit flow
- [ ] Test balance → bet placement flow (instant)
- [ ] Set up monitoring and alerts for balances
- [ ] Configure Builder Program attribution
- [ ] Test error scenarios and rollback
- [ ] Deploy to staging, test with real markets
- [ ] Monitor first production bets and conversions

## Files to Create/Modify

### New Files

- `agent/polymarket_payment_handler.py` - Payment-to-bet orchestration
- `agent/migrations/005_add_polymarket_bets.py` - Database migration
- `v0/src/components/PolymarketBetFlow.tsx` - Frontend bet flow component

### Modified Files

- `agent/merchant_service.py` - Add `/polymarket/bet` endpoint
- `agent/betting_orchestrator.py` - Add payment integration
- `agent/conversion_service.py` - Implement actual conversion logic
- `agent/polymarket_client.py` - Verify authentication format
- `v0/src/app/predictions/[marketId]/page.tsx` - Integrate x402 payment

## Next Steps

1. **Research Phase**:

   - Verify Polymarket CLOB API authentication format from docs
   - Research Plasma → Polygon bridge options
   - Test Polymarket API with provided credentials

2. **Implementation Phase**:

   - Implement payment handler
   - Build conversion service with liquidity pool
   - Integrate with existing x402 flow
   - Add frontend components

3. **Testing Phase**:

   - Test on testnets
   - Verify conversion rates
   - Test error scenarios

4. **Deployment Phase**:

   - Deploy to staging
   - Test with small amounts
   - Monitor and iterate

### To-dos

- [x] Research Polymarket CLOB API documentation - endpoints, authentication, order placement schema, Builder Program headers
- [x] Research USDT0→USDC conversion options - Plasma bridges, DEX aggregators (1inch, 0x), Polygon DEXs