# X402 Protocol Schema Alignment Plan

## Identified Schema Mismatches

### 1. Field Naming Inconsistencies
- **Python**: `decimals` ↔ **TypeScript**: `tokenDecimals`
- **Python**: `from_` (aliased as "from") ↔ **TypeScript**: `from`

### 2. Missing Fields in TypeScript
- **Python**: `routerContract`, `nftCollection`, `recommendedMode`, `feeBreakdown` in `PaymentOption`
- **Python**: Complete `FeeBreakdown` model
- **Python**: `toNFT` in `ChosenOption`

### 3. Missing Fields in Python
- **TypeScript**: `metadata` in `X402PaymentRequired`

### 4. Structural Differences
- **Python**: Separate `ChosenOption` and `Signature` models
- **TypeScript**: Combined `authorization` object in `X402PaymentSubmitted`

### 5. Type Differences
- **Python**: `Union[str, int]` for nonce ↔ **TypeScript**: `Hex`
- **Python**: More specific literal types for schemes

## Alignment Strategy
Use TypeScript as source of truth with these additions from Python:
1. Add missing advanced fields for router/NFT support
2. Add FeeBreakdown structure for transparency
3. Maintain TypeScript's cleaner authorization structure
4. Standardize on Hex types for consistency

## Implementation Plan
1. Update Python models to match TypeScript structure
2. Add missing TypeScript fields from Python (optional)
3. Create shared schema documentation
4. Update tests and validation