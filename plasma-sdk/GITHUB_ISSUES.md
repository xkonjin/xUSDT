# GitHub Issues for Plasma SDK Apps Overhaul

## Completed Work Summary (January 2026)

### All Apps Redesigned
| App | Design System | Brand Color | Status |
|-----|---------------|-------------|--------|
| Plenmo | Claymorphism | Green #1DB954 | COMPLETE |
| Pledictions | Liquid Glass | Purple #8B5CF6 | COMPLETE |
| Splitzy | Claymorphism | Teal #14B8A6 | COMPLETE |
| StreamPay | Liquid Glass | Orange #F59E0B | COMPLETE |
| SubKiller | Liquid Glass | Red #EF4444 | COMPLETE |

### Key Improvements
- Integrated real Polymarket API for Pledictions
- Removed confusing signing flow from Splitzy
- Added multi-step wizards for StreamPay and Splitzy
- All apps use Space Grotesk + Inter typography
- All apps use `min-h-dvh` for mobile viewport
- All build successfully (17/17 packages)

---

## Priority Legend
- **P0**: Critical - App broken, must fix
- **P1**: High - Major feature/UX issue
- **P2**: Medium - Enhancement
- **P3**: Low - Nice to have

---

## Phase 1: Backend Fixes (P0) - COMPLETED

### Issue #1: [BUG] Splitzy - Remove confusing sign message modal, add payment link generation
**Labels:** `bug`, `backend`, `P0`, `splitzy`

**Problem:**
When creating a bill in Splitzy, users see a confusing "Sign message" modal asking them to sign with their wallet. This is unnecessary friction and confuses users who don't understand why they need to sign anything just to split a bill.

**Expected Behavior:**
- Bill creation should NOT require any wallet signatures
- After creating a bill and adding participants, generate unique payment links for each person
- Each link should contain: amount owed, recipient wallet, bill reference
- Share buttons should allow sending links via WhatsApp, SMS, email, copy

**Files to Modify:**
- `apps/bill-split/src/app/new/page.tsx`
- `apps/bill-split/src/app/api/bills/route.ts`
- `apps/bill-split/src/components/ParticipantList.tsx`

**Acceptance Criteria:**
- [ ] No EIP-712 signing when creating bills
- [ ] Payment links generated per participant on bill finalize
- [ ] Links work when opened (show amount, allow payment)
- [ ] Share sheet integration (native + fallback)

---

### Issue #2: [VERIFY] StreamPay - Verify stream creation works
**Labels:** `testing`, `backend`, `P1`, `stream`

**Problem:**
Previous testing showed an "Invalid signature" error on stream creation. Investigation shows:
- Mock `StreamService` doesn't validate signatures
- API route is correctly implemented
- Database tables exist and are accessible
- The error may have been from a stale server or prior code

**Status:** Backend appears fixed. Needs verification.

**Files Verified:**
- `apps/plasma-stream/src/app/create/page.tsx` - No signature code
- `apps/plasma-stream/src/lib/contracts/stream-service.ts` - Mock impl, no validation
- `apps/plasma-stream/src/app/api/streams/route.ts` - Correct implementation

**Acceptance Criteria:**
- [ ] Stream creation works end-to-end
- [ ] Streams persist to SQLite database
- [ ] Dashboard shows created streams
- [ ] Add "Demo Mode" badge to UI to indicate simulation
- [ ] Withdraw and cancel work correctly

---

### Issue #3: [FEATURE] Pledictions - Add mock prediction market backend
**Labels:** `enhancement`, `backend`, `P1`, `predictions`

**Problem:**
Pledictions (plasma-predictions) doesn't have a working backend. The BACKEND_URL points to localhost:8000 which doesn't exist.

**Solution:**
Create mock API routes that simulate a prediction market:
- Return sample markets with various categories
- Handle bet placement (deduct from mock balance)
- Track user positions

**Files to Create/Modify:**
- `apps/plasma-predictions/src/app/api/markets/route.ts`
- `apps/plasma-predictions/src/app/api/markets/[id]/route.ts`
- `apps/plasma-predictions/src/app/api/bets/route.ts`
- `apps/plasma-predictions/src/data/mock-markets.ts`

**Acceptance Criteria:**
- [ ] GET /api/markets returns 10+ sample markets
- [ ] GET /api/markets/[id] returns market details with odds
- [ ] POST /api/bets places bet and updates balance
- [ ] Mock balance starts at $100

---

## Phase 2: UI Redesign (P1)

### Issue #4: [UI] Plenmo - Claymorphism redesign
**Labels:** `enhancement`, `frontend`, `P1`, `venmo`

**Problem:**
Current UI looks generic and AI-generated. Need to implement Claymorphism design system with proper mobile-first patterns.

**Design Spec:**
- Brand color: Green (#1DB954)
- Clay card shadows with soft inner/outer shadows
- Cash App style amount input (large 48-72px font)
- Contact grid (4 columns, 56px avatars)
- Bottom sheet for forms

**Files to Modify:**
- `apps/plasma-venmo/src/app/page.tsx`
- `apps/plasma-venmo/src/app/globals.css`
- `apps/plasma-venmo/tailwind.config.ts`
- All component files

**Acceptance Criteria:**
- [ ] All cards use `.clay-card` styling
- [ ] Amount input matches Cash App pattern
- [ ] Contact grid works with tap selection
- [ ] `min-h-dvh` everywhere (not `min-h-screen`)
- [ ] Touch targets minimum 44px
- [ ] Works on iPhone SE (375px)

---

### Issue #5: [UI] Pledictions - Liquid Glass redesign
**Labels:** `enhancement`, `frontend`, `P1`, `predictions`

**Problem:**
Current UI doesn't match premium prediction market feel. Need iOS 26 Liquid Glass aesthetic.

**Design Spec:**
- Brand color: Purple (#8B5CF6)
- Glass morphism with blur and borders
- Better odds display on prediction cards
- Category tabs with horizontal scroll
- Betting modal with clear amount input

**Files to Modify:**
- `apps/plasma-predictions/src/app/page.tsx`
- `apps/plasma-predictions/src/app/globals.css`
- `apps/plasma-predictions/tailwind.config.ts`

**Acceptance Criteria:**
- [ ] Liquid glass applied to all cards
- [ ] Odds display clear and readable
- [ ] Category scroll with indicators
- [ ] Betting flow is smooth
- [ ] Mobile responsive

---

### Issue #6: [UI] Splitzy - Claymorphism + flow redesign
**Labels:** `enhancement`, `frontend`, `P1`, `splitzy`

**Problem:**
Bill creation flow is confusing. Need new multi-step wizard with proper UX.

**Design Spec:**
- Brand color: Teal (#14B8A6)
- Multi-step wizard: Create → Add People → Split → Review → Share
- Participant chips with color assignment
- Receipt-style summary view
- Native share integration

**New Flow:**
1. Enter bill title + total
2. Add participants (name, optional email/phone)
3. Choose split method (even/custom)
4. Review per-person breakdown
5. Generate & share payment links

**Acceptance Criteria:**
- [ ] New wizard component implemented
- [ ] Participant chips with colors
- [ ] Split method selector
- [ ] Review shows clear breakdown
- [ ] Share sheet works

---

### Issue #7: [UI] StreamPay - Payroll-style Liquid Glass
**Labels:** `enhancement`, `frontend`, `P1`, `stream`

**Problem:**
StreamPay should be positioned as a payroll streaming solution, not generic payment streams.

**Design Spec:**
- Brand color: Orange (#F59E0B)
- Research Gusto/Rippling for patterns
- Timeline visualization for streams
- Progress ring component
- Professional "HR software" aesthetic

**Acceptance Criteria:**
- [ ] Rebranded as payroll solution
- [ ] Timeline visualization works
- [ ] Progress rings for active streams
- [ ] Multi-step creation wizard
- [ ] Demo mode badge visible

---

### Issue #8: [UI] SubKiller - Liquid Glass + setup state
**Labels:** `enhancement`, `frontend`, `P1`, `subkiller`

**Problem:**
SubKiller crashes when Google OAuth not configured. Setup message exists but needs better styling.

**Design Spec:**
- Brand color: Red (#EF4444)
- Nice error state when OAuth missing
- Scanning animation when processing
- Subscription cards with provider logos
- Savings counter animation

**Acceptance Criteria:**
- [ ] Setup message styled nicely
- [ ] No crashes without OAuth
- [ ] Scanning animation works
- [ ] Subscription cards look good
- [ ] Savings counter animates

---

## Phase 3: Asset Generation (P2)

### Issue #9: [FEATURE] Create Nano Banana image generation utility
**Labels:** `enhancement`, `infrastructure`, `P2`

**Problem:**
Need a shared utility to generate custom images using Google's Nano Banana API (Gemini Image).

**Implementation:**
- Create `packages/ui/src/lib/nano-banana.ts`
- Support text-to-image and image editing
- Handle rate limiting and retries
- Support multiple aspect ratios

**Environment Required:**
```
GEMINI_API_KEY=<from google ai studio>
```

**Acceptance Criteria:**
- [ ] `generateImage()` function works
- [ ] Rate limit handling
- [ ] Multiple output formats (base64, file)
- [ ] Works with all aspect ratios

---

### Issue #10: [FEATURE] Generate app logos and illustrations
**Labels:** `enhancement`, `design`, `P2`

**Problem:**
All apps need unique, non-AI-looking logos and illustrations.

**Assets Needed:**
| App | Logo | Empty State | Success State |
|-----|------|-------------|---------------|
| Plenmo | Green P lettermark | Person with payment bubbles | Checkmark burst |
| Pledictions | Crystal ball chart | Question mark orb | Trophy sparkles |
| Splitzy | Split receipt | Group of people | Coins dividing |
| StreamPay | Flowing stream | Calendar coins | Progress complete |
| SubKiller | Scissors cutting | Stack revealed | Money saved |

**Acceptance Criteria:**
- [ ] All logos generated (512x512)
- [ ] Empty states (400x400)
- [ ] Success states (300x300)
- [ ] Category icons for Pledictions (128x128)
- [ ] Assets saved to public/images/

---

### Issue #11: [FEATURE] Create avatar generation system
**Labels:** `enhancement`, `frontend`, `P3`

**Problem:**
Users need unique avatars. Should be deterministic based on wallet address.

**Implementation:**
- Hash wallet address to get seed
- Generate gradient colors from seed
- Use Nano Banana for avatar or fallback to gradient initials

**Acceptance Criteria:**
- [ ] Same address = same avatar always
- [ ] Gradient fallback works
- [ ] Avatars cached

---

## Phase 4: Animations (P2)

### Issue #12: [FEATURE] Add CSS animation library
**Labels:** `enhancement`, `frontend`, `P2`

**Problem:**
Need consistent animations across all apps.

**Animations to Add:**
- `float` - Subtle up/down for cards
- `pulse-glow` - CTA button emphasis
- `stream-flow` - StreamPay progress
- `coin-drop` - Savings counter

**Implementation:**
- Create `packages/ui/src/styles/animations.css`
- Add Tailwind animation utilities
- CSS custom properties for brand colors

**Acceptance Criteria:**
- [ ] All animations smooth at 60fps
- [ ] Use `transform` only (not `width`/`height`)
- [ ] Work across all apps

---

### Issue #13: [FEATURE] Add Lottie animations
**Labels:** `enhancement`, `frontend`, `P3`

**Problem:**
Need complex animations for success states, loading, etc.

**Implementation:**
- Add `lottie-react` to UI package
- Download free Lottie files from LottieFiles
- Create lazy-loading LottiePlayer component

**Animations Needed:**
- Success checkmark
- Loading spinner
- Empty state
- Transaction confirmed

**Acceptance Criteria:**
- [ ] Lottie player works
- [ ] Animations lazy loaded
- [ ] Works across all apps

---

## Phase 5: Testing (P1)

### Issue #14: [TEST] End-to-end flow testing
**Labels:** `testing`, `P1`

**Problem:**
Need E2E tests to verify all flows work correctly.

**Test Scenarios:**
1. **Plenmo:** Login → Send money → Verify history
2. **Pledictions:** Login → Place bet → Check balance
3. **Splitzy:** Create bill → Add people → Generate links
4. **StreamPay:** Create stream → View dashboard → Withdraw
5. **SubKiller:** See setup message OR scan emails

**Acceptance Criteria:**
- [ ] All tests pass
- [ ] Tests run on 375px viewport
- [ ] CI integration

---

## Summary

| Phase | Issues | Est. Hours |
|-------|--------|------------|
| Backend Fixes | #1, #2, #3 | 11 |
| UI Redesign | #4, #5, #6, #7, #8 | 40 |
| Asset Generation | #9, #10, #11 | 11 |
| Animations | #12, #13 | 6 |
| Testing | #14 | 6 |
| **Total** | **14** | **74** |
