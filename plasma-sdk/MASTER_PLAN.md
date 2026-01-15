# Plasma SDK Master Plan - UI Overhaul & Full Stack Fixes

**Created**: January 2026  
**Goal**: Transform all apps into production-ready, consumer-friendly applications with consistent claymorphism UI

---

## Executive Summary

All apps currently have a dark, "AI-generated" look. We're transforming them to be:
- **Bright and colorful** - Light mode default with soft pastels
- **Claymorphism** - Soft 3D effects, puffy buttons, friendly feel
- **Consumer-ready** - Inspired by Cash App, Venmo, Revolut

### Target Color Palette (Plasma Suite)

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Cyan | `#00D4FF` | CTAs, highlights |
| Secondary Purple | `#A855F7` | Accents |
| Success Green | `#22C55E` | Confirmations |
| Warning Amber | `#F59E0B` | Alerts |
| Error Red | `#EF4444` | Errors |
| Light Background | `#F8FAFC` | Main bg (light mode) |
| Card White | `#FFFFFF` | Cards |
| Text Dark | `#1E293B` | Primary text |
| Text Muted | `#64748B` | Secondary text |

### Claymorphism Recipe

```css
.clay-card {
  background: #FFFFFF;
  border-radius: 24px;
  box-shadow: 
    12px 12px 24px rgba(166, 180, 200, 0.25),
    -12px -12px 24px rgba(255, 255, 255, 0.8),
    inset 0 0 0 1px rgba(255, 255, 255, 0.5);
}

.clay-button {
  background: linear-gradient(145deg, #00E5FF, #00B8D4);
  border-radius: 16px;
  box-shadow: 
    6px 6px 12px rgba(0, 0, 0, 0.1),
    -6px -6px 12px rgba(255, 255, 255, 0.9),
    inset 0 2px 4px rgba(255, 255, 255, 0.4);
  color: white;
  font-weight: 600;
}
```

---

## App-by-App Plan

### 1. Plenmo (plasma-venmo) ✅ PARTIALLY DONE
**Status**: README/AGENTS done, mock mode fixed, needs UI overhaul

**Issues to Create**:
- [ ] UI-001: Convert dark theme to light claymorphism
- [ ] UI-002: Redesign SendMoneyForm with friendly colors
- [ ] UI-003: Add success animations (confetti, checkmark)
- [ ] UI-004: Improve SocialFeed with colorful avatars
- [ ] FIX-001: Feed API 500 errors in mock mode
- [ ] FIX-002: Contact save not persisting

---

### 2. Plasma Predictions
**Status**: Functional but dark/intimidating, needs friendly redesign

**Issues to Create**:
- [ ] UI-005: Convert to light theme with friendly betting interface
- [ ] UI-006: Redesign MarketCard with colorful probability bars
- [ ] UI-007: Add celebratory animations for wins
- [ ] FIX-003: Demo mode price updates not smooth
- [ ] DOC-001: Create README.md
- [ ] DOC-002: Create AGENTS.md

---

### 3. Plasma Stream
**Status**: Basic functionality, needs polish

**Issues to Create**:
- [ ] UI-008: Light theme with stream visualization
- [ ] UI-009: Progress bar animations for active streams
- [ ] UI-010: Add stream creation wizard
- [ ] DOC-003: Create README.md
- [ ] DOC-004: Create AGENTS.md

---

### 4. Bill Split (Splitzy)
**Status**: Good foundation, needs visual polish

**Issues to Create**:
- [ ] UI-011: Light theme with colorful participant avatars
- [ ] UI-012: Redesign balance dashboard with charts
- [ ] UI-013: Add payment celebration animations
- [ ] DOC-005: Create README.md
- [ ] DOC-006: Create AGENTS.md

---

### 5. SubKiller
**Status**: Dark theme, needs consumer-friendly redesign

**Issues to Create**:
- [ ] UI-014: Light theme with subscription cards
- [ ] UI-015: Category icons and colors
- [ ] UI-016: Cancellation success celebration
- [ ] DOC-007: Create README.md
- [ ] DOC-008: Create AGENTS.md

---

### 6. Telegram WebApp
**Status**: Basic, needs Telegram-native styling

**Issues to Create**:
- [ ] UI-017: Match Telegram's native look
- [ ] UI-018: Haptic feedback integration
- [ ] DOC-009: Create README.md
- [ ] DOC-010: Create AGENTS.md

---

### 7. Mobile App (Expo)
**Status**: Needs testing and polish

**Issues to Create**:
- [ ] UI-019: Native iOS/Android claymorphism
- [ ] UI-020: Biometric auth integration
- [ ] FIX-004: Fix lint warnings
- [ ] DOC-011: Create README.md
- [ ] DOC-012: Create AGENTS.md

---

## Shared Components to Create

### New Package: @plasma-pay/ui-light

Create light-themed component library:

```typescript
// Components to create:
- ClayCard
- ClayButton
- ClayInput
- ClayModal
- ClayAvatar
- ClayBadge
- ClayProgress
- ClayToast
- ConfettiCelebration
- PulseAnimation
```

---

## Implementation Order

### Phase 1: Foundation (Week 1)
1. Create shared light theme CSS
2. Create ClayCard, ClayButton, ClayInput components
3. Update tailwind.config in all apps

### Phase 2: Plenmo (Week 1)
4. Apply light theme to Plenmo
5. Fix all API issues
6. Add celebrations

### Phase 3: Other Apps (Week 2)
7. Apply to Predictions
8. Apply to Stream
9. Apply to Bill Split
10. Apply to SubKiller

### Phase 4: Mobile & Docs (Week 3)
11. Mobile app polish
12. Telegram webapp
13. All documentation complete

---

## GitHub Issues to Create

```markdown
### Issue Template

**Title**: [TYPE-XXX] Brief description

**Labels**: `ui`, `bug`, `documentation`, `enhancement`

**Description**:
- What needs to be done
- Acceptance criteria
- Files to modify

**Assignee**: @factory-droid
```

---

## Success Metrics

- [ ] All lint warnings: 0
- [ ] All typecheck errors: 0
- [ ] All tests passing
- [ ] Light theme on all apps
- [ ] README.md for all apps
- [ ] AGENTS.md for all apps
- [ ] Celebration animations on success actions

---

## Reference Apps for Inspiration

1. **Cash App** - Green theme, bold numbers, simple flows
2. **Venmo** - Social feed, blue accents, friendly tone
3. **Revolut** - Clean, minimal, professional
4. **Monzo** - Hot coral, playful, approachable

---

*This plan should be updated after each session.*
