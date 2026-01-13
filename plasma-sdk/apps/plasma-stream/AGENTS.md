# Plasma Stream Agent Guide

## Project Overview

Plasma Stream is a payment streaming application enabling real-time salary and subscription payments. Think "Sablier but gasless."

## Stream Lifecycle

```
CREATE → CLIFF PERIOD → VESTING → WITHDRAW* → COMPLETED/CANCELLED
```

### Calculations
```typescript
const elapsed = Math.min(now - startTime, duration);
const vestedFraction = elapsed / duration;
const totalVested = depositAmount * vestedFraction;
const withdrawable = totalVested - withdrawnAmount;
```

## Service Abstraction

```typescript
// src/lib/contracts/stream-service.ts
interface StreamService {
  createStream(params): Promise<Result>;
  withdraw(streamId, recipientAddress): Promise<Result>;
  cancel(streamId, senderAddress): Promise<Result>;
}

// Usage
const streamService = getStreamService();
const result = await streamService.createStream(params);
```

## Code Patterns

### API Route Pattern
```typescript
export async function POST(request: Request) {
  const body = await request.json();
  const streamService = getStreamService();
  const result = await streamService.cancel(streamId, senderAddress);
  return NextResponse.json(result);
}
```

### StreamCard Real-time Updates
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    const withdrawable = calculateWithdrawable(stream);
    setWithdrawable(withdrawable);
  }, 1000);
  return () => clearInterval(interval);
}, [stream]);
```

## Key Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Dashboard |
| `src/app/create/page.tsx` | Create form |
| `src/components/StreamCard.tsx` | Stream display |
| `src/lib/contracts/stream-service.ts` | Service abstraction |

## Common Tasks

### Adding Stream Type Presets
1. Define in `src/lib/presets.ts`
2. Add UI selector in `/create/page.tsx`
3. Map to stream params

---

## Session Learnings Template

```markdown
### Session: [DATE]
**Focus**: [What was worked on]
**Fixed**: Issue → Solution
**Learnings**: Key insight
```

---

*Last updated: January 2026*
