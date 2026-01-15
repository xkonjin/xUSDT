# Plasma SDK Apps - Complete Overhaul Specification

**Date:** 2026-01-14
**Status:** Planning

## Executive Summary

This document outlines the complete overhaul of 5 Plasma SDK applications with:
1. Backend fixes and database integration
2. UI redesign using Claymorphism and Liquid Glass
3. Custom asset generation via Nano Banana API (Gemini)
4. Animation system for looped assets
5. Flow redesigns for better UX

---

## App Inventory

| App | New Name | Port | Brand Color | Design System | Status |
|-----|----------|------|-------------|---------------|--------|
| plasma-venmo | **Plenmo** | 3005 | Green (#1DB954) | Claymorphism | Backend fixed, needs UI |
| plasma-predictions | **Pledictions** | 3006 | Purple (#8B5CF6) | Liquid Glass | Backend fixed, needs UI |
| bill-split | **Splitzy** | 3007 | Teal (#14B8A6) | Claymorphism | Needs flow redesign |
| plasma-stream | **StreamPay** | 3008 | Orange (#F59E0B) | Liquid Glass (Payroll) | Needs signature fix |
| subkiller | **SubKiller** | 3009 | Red (#EF4444) | Liquid Glass | Needs Google OAuth |

---

## Phase 1: Backend Fixes (COMPLETED)

### 1.1 Database Setup ✅
- [x] Fixed DATABASE_URL path (was creating nested directories)
- [x] Pushed Prisma schema to SQLite
- [x] All 19 tables created
- [x] Updated all app .env.local files with correct paths

### 1.2 Remaining Backend Issues

| App | Issue | Fix Required |
|-----|-------|--------------|
| **Plenmo** | API calls fail with "Failed to fetch" | Test with running dev server |
| **Pledictions** | Backend URL points to localhost:8000 | Create mock backend or connect real |
| **Splitzy** | Sign message flow confusing | Redesign to generate payment links |
| **StreamPay** | "Invalid signature" on create | Either mock the signature or skip gasless |
| **SubKiller** | Missing GOOGLE_CLIENT_ID | Added setup message, user needs credentials |

---

## Phase 2: UI Redesign

### 2.1 Design System: Claymorphism (Playful Apps)

**For:** Plenmo, Splitzy

```css
/* Base clay card */
.clay-card {
  background: linear-gradient(145deg, #1a1a1e, #141416);
  border-radius: 24px;
  box-shadow: 
    8px 8px 16px rgba(0, 0, 0, 0.4),
    -8px -8px 16px rgba(255, 255, 255, 0.03),
    inset 1px 1px 2px rgba(255, 255, 255, 0.05);
}

/* Pressed state */
.clay-card:active {
  box-shadow: 
    inset 4px 4px 8px rgba(0, 0, 0, 0.3),
    inset -4px -4px 8px rgba(255, 255, 255, 0.02);
}
```

### 2.2 Design System: Liquid Glass (Professional Apps)

**For:** Pledictions, StreamPay, SubKiller

```css
/* iOS 26 Liquid Glass */
.liquid-glass {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
}
```

### 2.3 Component Redesigns

#### Amount Input (Cash App Style)
- Large 48-72px font for amount
- Full-width numpad at bottom
- Currency symbol as prefix
- Animated scale on digit press

#### Contact Grid (Venmo Style)
- 4-column grid of avatars
- 56px circular avatars with gradient backgrounds
- First name below avatar
- Tap to select, shows checkmark

#### Empty States (Fintech Pattern)
- Centered illustration (AI-generated)
- Clear title and description
- Single CTA button
- Subtle animated background

#### Bottom Sheet (iOS Native)
- Drag handle at top
- Spring animation on open/close
- Swipe down to dismiss
- Backdrop blur overlay

---

## Phase 3: Asset Generation (Nano Banana API)

### 3.1 Required Assets Per App

#### Plenmo
| Asset | Prompt | Size |
|-------|--------|------|
| Logo | "Letter P in soft green gradient, rounded, clay-like 3D effect, fintech app logo" | 512x512 |
| Empty Feed | "Friendly empty state illustration, soft green tones, person with floating payment bubbles" | 400x400 |
| Success Animation | "Payment success checkmark, confetti burst, celebration, green accent" | 300x300 |

#### Pledictions
| Asset | Prompt | Size |
|-------|--------|------|
| Logo | "Crystal ball with chart inside, purple gradient, prediction app logo, premium feel" | 512x512 |
| Win State | "Golden trophy burst, sparkles, purple gradient background, celebration" | 400x400 |
| Category Icons | Per category: crypto, sports, politics, tech, entertainment | 128x128 |

#### Splitzy
| Asset | Prompt | Size |
|-------|--------|------|
| Logo | "Receipt being split into pieces, teal color, playful, bill splitting app" | 512x512 |
| Scan Receipt | "Phone scanning receipt with light rays, modern illustration" | 400x400 |
| Group Split | "Abstract people connected by dotted lines, teal accent, money flow" | 400x400 |

#### StreamPay
| Asset | Prompt | Size |
|-------|--------|------|
| Logo | "Flowing stream of coins, orange gradient, professional payroll aesthetic" | 512x512 |
| Active Stream | "Continuous flow visualization, progress indicator, orange to green" | 400x300 |
| Empty State | "Calendar with money flowing, payroll illustration, professional" | 400x400 |

#### SubKiller
| Asset | Prompt | Size |
|-------|--------|------|
| Logo | "Scissors cutting subscriptions, red accent, bold, cancellation app" | 512x512 |
| Found Subs | "Stack of subscription cards being revealed, red highlights" | 400x400 |
| Savings | "Money saved counter, celebration, coins piling up" | 400x400 |

### 3.2 Avatar Generation System

```typescript
// Generate personalized avatars using Nano Banana
async function generateAvatar(seed: string): Promise<string> {
  const prompt = `
    Modern avatar illustration for fintech app.
    Abstract geometric face with gradient colors.
    Seed: ${seed}. Style: playful, professional, minimal.
    No text. Circular crop-safe composition.
    Background: solid color matching the gradient.
  `;
  
  return await generateImage({
    prompt,
    model: "gemini-2.5-flash-image",
    aspectRatio: "1:1",
  });
}
```

---

## Phase 4: Animation System

### 4.1 Approach: CSS + Lottie + Optional AI Frames

Since Gemini doesn't directly generate video, we'll use:

1. **CSS Animations** - For UI elements (buttons, cards, transitions)
2. **Lottie** - For complex animated illustrations (free from LottieFiles)
3. **Nano Banana Frame Sequence** - For unique hero animations

### 4.2 Free Animation Resources

| Resource | Use Case | Link |
|----------|----------|------|
| LottieFiles | UI animations, loading states | lottiefiles.com |
| Rive | Interactive animations | rive.app |
| Motion.dev | Framer Motion presets | motion.dev |

### 4.3 CSS Animation Classes

```css
/* Floating animation for cards/icons */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* Pulse glow for CTAs */
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(var(--brand-rgb), 0.4); }
  50% { box-shadow: 0 0 20px 10px rgba(var(--brand-rgb), 0.2); }
}

/* Stream flow for StreamPay */
@keyframes stream-flow {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

/* Coin drop for savings counter */
@keyframes coin-drop {
  0% { transform: translateY(-20px); opacity: 0; }
  60% { transform: translateY(5px); }
  100% { transform: translateY(0); opacity: 1; }
}
```

---

## Phase 5: Flow Redesigns

### 5.1 Splitzy Bill Split Flow (REDESIGN)

**Current (Broken):**
1. Enter bill details
2. Add participants with confusing "Sign message" modal
3. No clear way to share payment links

**New Flow:**
```
1. CREATE BILL
   - Title, total amount
   - Optional: Scan receipt photo
   
2. ADD PARTICIPANTS
   - Enter names
   - Assign colors (auto-generated)
   - Enter email/phone (optional, for notifications)
   
3. SPLIT METHOD
   - Even split (default)
   - Custom amounts
   - By item (if receipt scanned)
   
4. REVIEW
   - Summary per person
   - Total with tax/tip
   
5. GENERATE LINKS
   - One unique payment link per participant
   - Links include: amount, recipient wallet, memo
   - No signatures required to create
   
6. SHARE
   - Native share sheet
   - Copy individual links
   - Send via WhatsApp/SMS/Email
   
7. TRACK
   - Dashboard shows who paid
   - Real-time updates when payments come in
```

### 5.2 StreamPay Create Stream Flow (REDESIGN)

**Current (Broken):**
- Form works but "Create Stream" fails with "Invalid signature"

**Fix:**
- Use mock database implementation (already exists)
- Remove gasless signature requirement for demo
- Add clear "Demo Mode" badge

**New Flow:**
```
1. RECIPIENT
   - Enter wallet address
   - Or search from contacts
   
2. AMOUNT & DURATION
   - Total amount to stream
   - Duration (days/weeks/months)
   - Shows daily/weekly rate
   
3. OPTIONS
   - Cliff period (optional)
   - Cancelable toggle
   
4. REVIEW
   - Summary with timeline visualization
   - "Demo Mode - funds are simulated"
   
5. CREATE
   - Mock creation (database)
   - Show success with stream details
   - Redirect to dashboard
```

---

## GitHub Issues

### Backend (Phase 1)

1. **[BACKEND] Fix Splitzy sign message flow - generate payment links instead**
   - Remove EIP-712 signing from bill creation
   - Generate unique payment links per participant
   - Add share functionality

2. **[BACKEND] Fix StreamPay create stream - bypass gasless for demo**
   - Use mock implementation without signature verification
   - Add "Demo Mode" indicator
   - Ensure mock streams persist to database

3. **[BACKEND] Add Pledictions mock backend**
   - Create mock API routes for prediction markets
   - Seed with sample markets data
   - Support place bet / check balance

### UI Redesign (Phase 2)

4. **[UI] Plenmo - Claymorphism redesign**
   - Update all cards to clay style
   - Implement Cash App style amount input
   - Add contact grid component
   - Fix mobile viewport (min-h-dvh)

5. **[UI] Pledictions - Liquid Glass redesign**
   - Apply liquid glass to all cards
   - Redesign prediction cards with better odds display
   - Add category navigation with scroll indicators
   - Mobile-first responsive layout

6. **[UI] Splitzy - Claymorphism + flow redesign**
   - Implement new bill creation flow
   - Remove sign message modal
   - Add participant assignment with color chips
   - Share sheet integration

7. **[UI] StreamPay - Payroll-style Liquid Glass**
   - Research payroll UI (Gusto, Rippling)
   - Implement timeline visualization
   - Add progress ring component
   - Professional color scheme (orange/blue)

8. **[UI] SubKiller - Liquid Glass + setup state**
   - Implement proper error state for missing OAuth
   - Add scanning animation
   - Subscription card design
   - Savings counter animation

### Assets (Phase 3)

9. **[ASSETS] Create Nano Banana image generation utility**
   - Implement lib/nano-banana.ts
   - Add API route for image generation
   - Handle rate limiting and retries

10. **[ASSETS] Generate app logos and illustrations**
    - Plenmo logo + empty states
    - Pledictions logo + category icons
    - Splitzy logo + receipt illustration
    - StreamPay logo + stream visualization
    - SubKiller logo + subscription imagery

11. **[ASSETS] Create avatar generation system**
    - Deterministic seed from wallet address
    - Gradient color selection
    - Store generated avatars

### Animations (Phase 4)

12. **[ANIMATION] Add CSS animation library**
    - Float, pulse, stream-flow, coin-drop
    - Per-app brand color variables
    - Framer Motion integration

13. **[ANIMATION] Add Lottie animations**
    - Success checkmark
    - Loading states
    - Empty states
    - Transaction confirmations

### Testing (Phase 5)

14. **[TEST] End-to-end flow testing**
    - Plenmo: send/receive money
    - Pledictions: place bet flow
    - Splitzy: create bill + pay via link
    - StreamPay: create + withdraw stream
    - SubKiller: setup message display

---

## Environment Variables Required

```bash
# Nano Banana API (Gemini)
GEMINI_API_KEY=<get-from-google-ai-studio>

# Google OAuth (SubKiller only)
GOOGLE_CLIENT_ID=<get-from-google-cloud-console>
GOOGLE_CLIENT_SECRET=<get-from-google-cloud-console>

# Plasma Gasless (optional - for production)
PLASMA_RELAYER_SECRET=<get-from-plasma-team>
```

---

## Success Criteria

- [ ] All 5 apps start without errors
- [ ] All 5 apps have unique, non-AI-looking UI
- [ ] All flows work end-to-end (even if mocked)
- [ ] Custom assets generated and integrated
- [ ] Animations feel native and performant
- [ ] Mobile-first, works on iPhone SE (375px)
- [ ] All tests pass
