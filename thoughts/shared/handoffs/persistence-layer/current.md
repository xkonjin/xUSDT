## Checkpoints
**Task:** Add persistence layer for in-memory stores at /Users/a002/DEV/xUSDT/agent/
**Last Updated:** 2026-01-12

### Phase Status
- Phase 1 (Tests Written): ✓ VALIDATED
- Phase 2 (Implementation): ✓ COMPLETED  
- Phase 3 (Refactoring): ✓ COMPLETED

### Summary
Implemented a file-based persistence layer for invoice records and channel receipts. The solution:

1. **Created `agent/persistence.py`**:
   - `PersistentStore` class with thread-safe file I/O using threading.Lock
   - JSON file storage in configurable directory (default: `.data/`)
   - Automatic directory creation on init
   - Graceful fallback on read errors (returns None/default)
   - Methods: `get()`, `set()`, `delete()`, `keys()`, `clear()`
   - Namespace isolation for different data types
   - Factory functions: `get_invoice_store()`, `get_channel_receipt_store()`
   - Environment variable `PERSISTENCE_DIR` for configuration

2. **Updated `agent/merchant_agent.py`**:
   - Added `_store_invoice()` helper for persistent storage with fallback
   - Updated `get_invoice_record()` to check persistent store after memory cache
   - Replaced all `_INVOICE_RECORDS[...] = pc` with `_store_invoice(...)`
   - Memory cache maintained for fast access

3. **Updated `agent/merchant_service.py`**:
   - Added helper functions: `_get_pending_channel_receipts()`, `_set_pending_channel_receipts()`, `_clear_pending_channel_receipts()`
   - Updated `/channel/receipt` endpoint to use `_set_pending_channel_receipts()`
   - Updated `/channel/settle` endpoint to use helpers with persistence

### Files Created/Modified
- **Created**: `agent/persistence.py` (190 lines)
- **Created**: `tests/test_persistence.py` (16 test cases)
- **Modified**: `agent/merchant_agent.py` (added persistence imports and helper functions)
- **Modified**: `agent/merchant_service.py` (added persistence imports and helper functions)

### Test Results
- 16/16 persistence tests passing
- All syntax checks passing
- No regressions in existing tests (crypto, fees)

### Next Steps (if any)
- For production: Replace file-based persistence with Redis
- Consider adding TTL/expiration for stored data
- Monitor `.data/` directory size in production
