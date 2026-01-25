# Plenmo Design System

> **Claymorphic Design System** - A soft, puffy 3D aesthetic optimized for dark mode.

## Overview

Plenmo uses a **Claymorphism** design language - creating soft, touchable UI elements that appear to be made of clay or soft plastic. This is achieved through carefully crafted shadows, gradients, and border treatments that work together in dark mode.

## Brand Colors

### Primary: Plenmo Green
```css
--accent-green: #1DB954     /* Primary brand green */
--accent-green-dark: #19a34a
--accent-green-light: #3dd88a
```

### Color Palette
| Color | CSS Variable | Hex | Usage |
|-------|-------------|-----|-------|
| Primary Green | `--accent-green` | `#1DB954` | CTAs, accents, success |
| Cyan | `--accent-cyan` | `#00D4FF` | Links, highlights |
| Purple | `--accent-purple` | `#A855F7` | Gradients, secondary |
| Pink | `--accent-pink` | `#EC4899` | Alerts, emphasis |

### Tailwind Colors
```js
// Use plenmo-* for brand colors
className="text-plenmo-500"    // Primary green
className="bg-plenmo-500/20"   // 20% opacity variant
className="text-plasma-500"    // Cyan accent
```

## Typography

### Font Families
- **Headings:** Space Grotesk (bold, modern)
- **Body:** Inter (clean, readable)

```jsx
// Usage
<h1 className="font-heading text-2xl">Title</h1>
<p className="font-body text-base">Body text</p>
```

### Font Sizes (Tailwind)
| Size | Class | Use |
|------|-------|-----|
| xs | `text-xs` | Captions, badges |
| sm | `text-sm` | Secondary text |
| base | `text-base` | Body text |
| lg | `text-lg` | Subheadings |
| xl | `text-xl` | Section titles |
| 2xl+ | `text-2xl` - `text-5xl` | Hero text |

## Core Components

### Clay Card
The fundamental container component.

```jsx
<div className="clay-card p-6">
  {/* Content */}
</div>
```

**CSS:**
- Background: Gradient from `rgba(26, 26, 46)` to `rgba(22, 22, 42)`
- Border: 1px `rgba(255, 255, 255, 0.08)`
- Border radius: 24px
- Shadow: Multi-layer soft shadows with subtle inner highlight

### Clay Button

Primary action buttons with clay aesthetics.

```jsx
// Primary (green gradient)
<button className="clay-button clay-button-primary">
  Send Money
</button>

// Secondary (ghost)
<button className="clay-button clay-button-ghost">
  Cancel
</button>

// Success variant
<button className="clay-button clay-button-success">
  Confirm
</button>

// Danger variant
<button className="clay-button clay-button-danger">
  Delete
</button>
```

**Variants:**
| Variant | Class | Use |
|---------|-------|-----|
| Primary | `clay-button-primary` | Main CTAs, submit |
| Secondary | `clay-button-secondary` | Alternative actions |
| Ghost | `clay-button-ghost` | Tertiary actions |
| Success | `clay-button-success` | Confirmations |
| Danger | `clay-button-danger` | Destructive actions |

**Sizes:**
```jsx
<button className="clay-button clay-button-sm">Small</button>
<button className="clay-button">Default</button>
<button className="clay-button clay-button-lg">Large</button>
```

### Clay Input

Text inputs with inset shadow effect.

```jsx
<input 
  type="text" 
  className="clay-input" 
  placeholder="Enter text..."
/>
```

**Features:**
- Inset shadow creates "pressed in" effect
- Green focus ring on focus
- Supports all input types

### Clay Select

Dropdown with custom styling.

```jsx
<select className="clay-select">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

### Clay Badge

Status indicators and tags.

```jsx
<span className="clay-badge">Default</span>
<span className="clay-badge clay-badge-success">Active</span>
<span className="clay-badge clay-badge-warning">Pending</span>
<span className="clay-badge clay-badge-error">Failed</span>
```

### Clay Alert

Notification messages.

```jsx
<div className="clay-alert clay-alert-success">
  Payment successful!
</div>

<div className="clay-alert clay-alert-warning">
  Low balance
</div>

<div className="clay-alert clay-alert-error">
  Transaction failed
</div>
```

### Clay List Item

Transaction rows and list entries.

```jsx
<div className="clay-list-item">
  <Avatar />
  <div className="flex-1">
    <p>Transaction title</p>
  </div>
  <span>$25.00</span>
</div>
```

### Clay Icon Button

Square icon-only buttons.

```jsx
<button className="clay-icon-button">
  <QrCodeIcon className="w-5 h-5" />
</button>
```

### Clay Tabs

Tab navigation.

```jsx
<div className="clay-tabs">
  <button className="clay-tab active">Send</button>
  <button className="clay-tab">Request</button>
</div>
```

## Form Components

### Clay Checkbox
```jsx
<input type="checkbox" className="clay-checkbox" />
```

### Clay Radio
```jsx
<input type="radio" className="clay-radio" />
```

### Clay Switch
```jsx
<input type="checkbox" className="clay-switch" />
```

### Clay Textarea
```jsx
<textarea className="clay-textarea" placeholder="Message..."></textarea>
```

## Utility Components

### Clay Progress Bar
```jsx
<div className="clay-progress">
  <div className="clay-progress-bar" style={{width: '70%'}} />
</div>
```

### Clay Skeleton
```jsx
<div className="clay-skeleton h-12 w-full" />
```

### Clay Divider
```jsx
<div className="clay-divider" />
```

## Shadows

### Tailwind Shadow Classes
```jsx
className="shadow-clay"        // Medium clay shadow
className="shadow-clay-sm"     // Small clay shadow
className="shadow-clay-lg"     // Large clay shadow
className="shadow-clay-pressed" // Pressed/inset state
className="shadow-clay-green"   // Green glow accent
```

## Border Radius

```jsx
className="rounded-clay"      // 24px (default cards)
className="rounded-clay-sm"   // 16px (buttons, inputs)
className="rounded-clay-lg"   // 32px (large modals)
className="rounded-clay-full" // 50px (pills)
```

## Animations

### Built-in Animations
```jsx
className="animate-clay-bounce"    // Subtle bounce
className="animate-clay-pulse"     // Glow pulse
className="animate-pulse-glow"     // Legacy glow
className="animate-success-bounce" // Success checkmark
className="animate-confetti-fall"  // Celebration confetti
```

### Reduced Motion
The design system respects `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; }
}
```

## Dark Mode

Plenmo is **dark mode by default**. The entire design system is built around dark backgrounds.

### Background Colors
```css
--bg-primary: #0a0a0f      /* Main background */
--bg-secondary: #12121a    /* Elevated sections */
--bg-card: #1a1a2e         /* Card surfaces */
```

### Text Colors
```css
--text-primary: #ffffff          /* Headings */
--text-secondary: rgba(255,255,255,0.7)  /* Body */
--text-tertiary: rgba(255,255,255,0.5)   /* Muted */
```

## Accessibility

### Focus States
All interactive elements have visible focus indicators:
```css
*:focus-visible {
  outline: 2px solid rgba(29, 185, 84, 0.5);
  outline-offset: 2px;
}
```

### Touch Targets
Minimum touch target size: 44x44px
```jsx
className="touch-target" // Ensures 44px minimum
```

### High Contrast Support
```css
@media (prefers-contrast: high) {
  .clay-card, .clay-button, .clay-input {
    border-width: 2px;
  }
}
```

## Design Tokens

Design tokens are defined in `/src/styles/tokens.css`:

```css
/* Spacing */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */

/* Z-Index Layers */
--z-dropdown: 1000;
--z-modal: 1050;
--z-tooltip: 1070;
```

## Component File Structure

```
src/
├── styles/
│   ├── tokens.css          # Design tokens
│   └── clay-components.css # Component styles
├── app/
│   └── globals.css         # Main CSS entry
└── components/
    └── ui/
        ├── Avatar.tsx
        ├── Skeleton.tsx
        ├── Toast.tsx
        └── ModalPortal.tsx
```

## Migration from Legacy Classes

Old class names are mapped for backwards compatibility but should be migrated:

| Legacy | New |
|--------|-----|
| `liquid-glass` | `clay-card` |
| `liquid-glass-subtle` | `clay-card` or `bg-white/5` |
| `liquid-glass-elevated` | `clay-card` |
| `input-glass` | `clay-input` |
| `btn-primary` | `clay-button clay-button-primary` |
| `btn-secondary` | `clay-button clay-button-ghost` |

## Best Practices

1. **Use semantic class names**: Prefer `clay-button-primary` over custom styles
2. **Maintain consistency**: Use design tokens for spacing, colors, and shadows
3. **Respect accessibility**: Always include proper focus states and ARIA labels
4. **Test on dark backgrounds**: Never assume light mode support
5. **Use Tailwind utilities**: Combine clay-* classes with Tailwind for custom layouts

## Examples

### Payment Card
```jsx
<div className="clay-card p-6">
  <h2 className="font-heading text-xl text-white mb-4">
    Send Money
  </h2>
  <input 
    className="clay-input mb-4" 
    placeholder="Amount"
  />
  <button className="clay-button clay-button-primary w-full">
    Send $25.00
  </button>
</div>
```

### Transaction List
```jsx
<div className="clay-card p-4">
  <div className="clay-list-item">
    <Avatar name="John Doe" size="md" />
    <div className="flex-1">
      <p className="text-white font-medium">John Doe</p>
      <p className="text-white/50 text-sm">Today at 2:30 PM</p>
    </div>
    <span className="text-plenmo-500 font-bold">+$50.00</span>
  </div>
</div>
```

---

*Last updated: January 2026*
