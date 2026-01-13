# Bill Split (Splitzy) Agent Guide

## Project Overview

Splitzy is a Splitwise-like bill splitting app with AI receipt scanning and gasless payments.

## Balance Calculation

```typescript
// src/lib/balance-calculator.ts
function calculateBalances(userAddress, bills, userEmail) {
  for (const bill of bills) {
    const isCreator = bill.creatorAddress === userAddress;
    for (const participant of bill.participants) {
      if (isCreator && !participant.paid) {
        totalOwedToMe += participant.share;
      } else if (!isCreator && isMe && !participant.paid) {
        totalIOwe += participant.share;
      }
    }
  }
  return { totalOwedToMe, totalIOwe, netBalance };
}
```

## Share Calculation

```typescript
// src/lib/share-calculation.ts
function calculateParticipantShare(participantId, items, tax, tip, subtotal) {
  // 1. Sum item shares
  let itemsShare = 0;
  for (const item of items) {
    if (item.assignedToParticipantIds.includes(participantId)) {
      itemsShare += (item.price * item.quantity) / item.assignedToParticipantIds.length;
    }
  }
  // 2. Add proportional tax and tip
  const proportion = itemsShare / subtotal;
  return itemsShare + (tax * proportion) + (tip * proportion);
}
```

## Debt Simplification

The `simplifyDebts` function minimizes payments:
```typescript
// Alice owes Bob $50, Bob owes Carol $50, Carol owes Alice $50
// Result: No payments needed (net zero)
```

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/balance-calculator.ts` | Cross-bill balances |
| `src/lib/share-calculation.ts` | Per-participant shares |
| `src/lib/simplify-debts.ts` | Payment minimization |
| `src/app/new/page.tsx` | Bill creation + OCR |

## Common Tasks

### Modifying Share Calculation
1. Update `lib/share-calculation.ts`
2. Run tests: `npm run test -- share`
3. Check BalanceDashboard renders

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
