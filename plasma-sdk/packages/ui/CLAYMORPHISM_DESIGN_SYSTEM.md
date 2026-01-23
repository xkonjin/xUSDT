# Claymorphism Design System Documentation

Complete design system for Claymorphism UI components across Plasma SDK apps.

## Overview

Claymorphism is a design language that creates soft, tactile interfaces that appear molded from clay. Components feature rounded shapes, dual shadows, and vibrant pastel colors that feel approachable and playful.

## Design Philosophy

- **Playful**: Approachable, friendly, non-intimidating
- **Tactile**: Elements feel like physical objects you can touch
- **Cheerful**: Bright colors evoke positive emotions
- **Accessible**: Better contrast than neumorphism

## Components

### Core Components

#### ClayCard
Elevated content containers with clay-style shadows.

**Props:**
- `variant`: `"default" | "elevated" | "subtle"` - Shadow depth
- `color`: `"default" | "blue" | "pink" | "green" | "purple" | "yellow"` - Gradient color
- `padding`: `"none" | "sm" | "md" | "lg"` - Internal padding
- `rounded`: `"md" | "lg" | "xl" | "2xl" | "3xl"` - Border radius
- `interactive`: `boolean` - Enable hover/active effects

**Sub-components:**
- `ClayCardHeader`
- `ClayCardTitle`
- `ClayCardContent`
- `ClayCardFooter`

#### ClayButton
Clay-styled buttons with pressable effects.

**Props:**
- `variant`: `"primary" | "secondary" | "success" | "danger" | "ghost"`
- `size`: `"sm" | "md" | "lg" | "xl"`
- `loading`: `boolean` - Show loading spinner
- `icon`: `React.ReactNode` - Icon element
- `iconPosition`: `"left" | "right"`

#### ClayInput
Clay-styled input fields with inset shadows.

**Props:**
- `label`: `string` - Label text
- `error`: `string` - Error message
- `hint`: `string` - Helper text
- `leftIcon`: `React.ReactNode` - Icon before input
- `rightIcon`: `React.ReactNode` - Icon after input
- `size`: `"sm" | "md" | "lg"`

#### ClayBadge
Small status indicators with clay styling.

**Props:**
- `variant`: `"default" | "primary" | "success" | "warning" | "danger" | "outline"`
- `size`: `"sm" | "md" | "lg"`
- `dot`: `boolean` - Show colored dot

#### ClayProgress
Progress indicators with clay styling.

**Components:**
- `ClayProgress` - Linear progress bar
- `ClayProgressSteps` - Step-based progress

**ClayProgress Props:**
- `value`: `number` - Progress value
- `max`: `number` - Maximum value (default: 100)
- `size`: `"sm" | "md" | "lg"`
- `variant`: `"primary" | "success" | "warning" | "danger"`
- `showLabel`: `boolean` - Show percentage
- `animated`: `boolean` - Animate progress

**ClayProgressSteps Props:**
- `steps`: Array of `{ label, completed, active }`
- `size`: `"sm" | "md" | "lg"`

#### ClayAvatar
User avatars with clay styling and status indicators.

**Props:**
- `name`: `string` - User name for initials
- `src`: `string` - Image URL
- `size`: `"sm" | "md" | "lg" | "xl" | "2xl"`
- `status`: `"online" | "offline" | "busy" | "away"`
- `rounded`: `"full" | "2xl"`

**ClayAvatarGroup Props:**
- `names`: Array of user names
- `srcs`: Array of image URLs
- `max`: Maximum visible avatars (default: 4)
- `size`: Avatar size
- `spacing`: `"sm" | "md" | "lg"`

### Layout Components

#### ClayContainer
Responsive container for content.

**Props:**
- `size`: `"sm" | "md" | "lg" | "xl" | "full"` - Max width
- `centered`: `boolean` - Center content
- `padding`: `"none" | "sm" | "md" | "lg"`

#### ClaySection
Page sections with clay backgrounds.

**Props:**
- `title`: `string` - Section heading
- `description`: `string` - Section description
- `size`: `"sm" | "md" | "lg" | "xl"` - Vertical padding
- `centered`: `boolean` - Center content
- `variant`: `"default" | "primary" | "secondary" | "accent"`

#### ClayDivider
Horizontal/vertical dividers with gradients.

**Props:**
- `orientation`: `"horizontal" | "vertical"`
- `size`: `"sm" | "md" | "lg"` - Opacity
- `variant`: `"default" | "primary" | "success" | "warning" | "danger"`
- `label`: `string` - Label text

#### ClaySpacer
Flexible spacing utility.

**Props:**
- `size`: `"xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl"`
- `axis`: `"vertical" | "horizontal" | "both"`

### Feedback Components

#### ClayAlert
Alert messages with icons.

**Props:**
- `variant`: `"info" | "success" | "warning" | "danger"`
- `dismissible`: `boolean` - Show close button
- `onDismiss`: `() => void` - Close callback
- `icon`: `React.ReactNode` - Custom icon

#### ClayModal
Dialog modal with clay styling.

**Props:**
- `isOpen`: `boolean` - Show modal
- `onClose`: `() => void` - Close callback
- `title`: `string` - Modal heading
- `description`: `string` - Modal description
- `size`: `"sm" | "md" | "lg" | "xl" | "full"`
- `showCloseButton`: `boolean`
- `closeOnOverlayClick`: `boolean`
- `closeOnEscape`: `boolean`

**Sub-components:**
- `ClayModalFooter`

#### ClaySheet
Slide-in sheet modal.

**Props:**
- `isOpen`: `boolean` - Show sheet
- `onClose`: `() => void` - Close callback
- `position`: `"right" | "left" | "bottom"`
- `size`: `"sm" | "md" | "lg" | "xl"`
- `showCloseButton`: `boolean`
- `closeOnOverlayClick`: `boolean`
- `closeOnEscape`: `boolean`

**Sub-components:**
- `ClaySheetFooter`

#### ClayToast (ClayToastProvider)
Toast notifications.

**Provider:**
```tsx
<ClayToastProvider>
  <App />
</ClayToastProvider>
```

**Hooks:**
- `useClayToast()` - Access toast functions
- `useClaySuccessToast()` - Quick success toast
- `useClayErrorToast()` - Quick error toast

**Methods:**
- `toast({ type, title, message, duration })`
- `success(title, message)`
- `error(title, message)`
- `info(title, message)`
- `warning(title, message)`

## Design Tokens

### Colors

All colors use RGB values for gradient compatibility.

**Base/Backgrounds:**
- `--clay-bg-primary`: 248, 250, 252
- `--clay-bg-secondary`: 241, 245, 249
- `--clay-bg-card`: 255, 255, 255

**Accents:**
- `--clay-blue`: 59, 130, 246
- `--clay-pink`: 236, 72, 153
- `--clay-green`: 34, 197, 94
- `--clay-purple`: 139, 92, 246
- `--clay-yellow`: 245, 158, 11

**Status:**
- `--clay-success`: 34, 197, 94
- `--clay-warning`: 245, 158, 11
- `--clay-error`: 239, 68, 68
- `--clay-info`: 59, 130, 246

**Text:**
- `--clay-text-primary`: 30, 41, 59
- `--clay-text-secondary`: 71, 85, 105
- `--clay-text-tertiary`: 100, 116, 139

### Shadows

**Shadow Colors:**
- `--clay-shadow-dark`: 163, 177, 198
- `--clay-shadow-light`: 255, 255, 255

**Shadow Presets:**
- `--shadow-clay-sm`: Small depth (4px)
- `--shadow-clay`: Medium depth (8px)
- `--shadow-clay-lg`: Large depth (12px)
- `--shadow-clay-xl`: Extra large depth (16px)
- `--shadow-clay-pressed`: Pressed state
- `--shadow-clay-inset`: Inset for inputs
- `--shadow-clay-green`: Green accent glow

### Border Radius

- `--radius-clay-sm`: 16px
- `--radius-clay-md`: 20px
- `--radius-clay-lg`: 24px
- `--radius-clay-xl`: 32px
- `--radius-clay-2xl`: 40px
- `--radius-clay-full`: 9999px

### Spacing

- `--space-clay-1`: 0.25rem (4px)
- `--space-clay-2`: 0.5rem (8px)
- `--space-clay-3`: 0.75rem (12px)
- `--space-clay-4`: 1rem (16px)
- `--space-clay-5`: 1.25rem (20px)
- `--space-clay-6`: 1.5rem (24px)
- `--space-clay-8`: 2rem (32px)
- `--space-clay-10`: 2.5rem (40px)
- `--space-clay-12`: 3rem (48px)
- `--space-clay-16`: 4rem (64px)

### Typography

- `--text-clay-xs`: 0.75rem
- `--text-clay-sm`: 0.875rem
- `--text-clay-base`: 1rem
- `--text-clay-lg`: 1.125rem
- `--text-clay-xl`: 1.25rem
- `--text-clay-2xl`: 1.5rem
- `--text-clay-3xl`: 1.875rem
- `--text-clay-4xl`: 2.25rem
- `--text-clay-5xl`: 3rem

## Usage Examples

### Basic Card

```tsx
import { ClayCard, ClayCardHeader, ClayCardTitle, ClayCardContent } from "@plasma-pay/ui";

<ClayCard variant="elevated" padding="lg">
  <ClayCardHeader>
    <ClayCardTitle>Welcome</ClayCardTitle>
  </ClayCardHeader>
  <ClayCardContent>
    <p>This is a clay-styled card.</p>
  </ClayCardContent>
</ClayCard>
```

### Button with Loading State

```tsx
import { ClayButton } from "@plasma-pay/ui";

<ClayButton variant="primary" size="lg" loading={isLoading}>
  Submit
</ClayButton>
```

### Input with Icons

```tsx
import { ClayInput } from "@plasma-pay/ui";
import { Search, Mail } from "lucide-react";

<ClayInput
  label="Email"
  placeholder="Enter your email"
  leftIcon={<Mail className="w-5 h-5" />}
/>

<ClayInput
  placeholder="Search..."
  leftIcon={<Search className="w-5 h-5" />}
/>
```

### Progress Steps

```tsx
import { ClayProgressSteps } from "@plasma-pay/ui";

<ClayProgressSteps
  steps={[
    { label: "Upload", completed: true },
    { label: "Process", completed: true, active: true },
    { label: "Complete", completed: false },
  ]}
  size="md"
/>
```

### Toast Notifications

```tsx
import { ClayToastProvider, useClayToast } from "@plasma-pay/ui";

function App() {
  const { success, error } = useClayToast();

  const handleAction = async () => {
    try {
      await doSomething();
      success("Success!", "Your action was completed.");
    } catch (err) {
      error("Error!", "Something went wrong.");
    }
  };

  return (
    <ClayToastProvider>
      <Button onClick={handleAction}>Action</Button>
    </ClayToastProvider>
  );
}
```

### Modal

```tsx
import { ClayModal, ClayModalFooter, ClayButton } from "@plasma-pay/ui";

<ClayModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  description="Are you sure you want to proceed?"
  size="md"
>
  <p className="text-slate-600">This action cannot be undone.</p>
  <ClayModalFooter>
    <ClayButton variant="ghost" onClick={() => setIsOpen(false)}>
      Cancel
    </ClayButton>
    <ClayButton variant="danger" onClick={handleConfirm}>
      Delete
    </ClayButton>
  </ClayModalFooter>
</ClayModal>
```

### Avatar Group

```tsx
import { ClayAvatarGroup } from "@plasma-pay/ui";

<ClayAvatarGroup
  names={["Alice", "Bob", "Charlie", "David", "Eve"]}
  size="md"
  max={3}
  spacing="md"
/>
```

## Tailwind Configuration

Add these shadow utilities to your app's `tailwind.config.ts`:

```typescript
theme: {
  extend: {
    boxShadow: {
      'clay': '8px 8px 16px rgba(163, 177, 198, 0.3), -8px -8px 16px rgba(255, 255, 255, 0.8), inset 2px 2px 4px rgba(255, 255, 255, 0.6), inset -2px -2px 4px rgba(163, 177, 198, 0.3)',
      'clay-sm': '4px 4px 8px rgba(163, 177, 198, 0.25), -4px -4px 8px rgba(255, 255, 255, 0.8), inset 1px 1px 2px rgba(255, 255, 255, 0.6), inset -1px -1px 2px rgba(163, 177, 198, 0.2)',
      'clay-lg': '12px 12px 24px rgba(163, 177, 198, 0.35), -12px -12px 24px rgba(255, 255, 255, 0.9), inset 3px 3px 6px rgba(255, 255, 255, 0.7), inset -3px -3px 6px rgba(163, 177, 198, 0.4)',
      'clay-xl': '16px 16px 32px rgba(163, 177, 198, 0.4), -16px -16px 32px rgba(255, 255, 255, 0.95), inset 4px 4px 8px rgba(255, 255, 255, 0.8), inset -4px -4px 8px rgba(163, 177, 198, 0.5)',
      'clay-pressed': '4px 4px 8px rgba(163, 177, 198, 0.3), -4px -4px 8px rgba(255, 255, 255, 0.6), inset 4px 4px 8px rgba(163, 177, 198, 0.4), inset -2px -2px 4px rgba(255, 255, 255, 0.3)',
      'clay-inset': 'inset 4px 4px 8px rgba(163, 177, 198, 0.15), inset -4px -4px 8px rgba(255, 255, 255, 0.9)',
      'clay-green': '0 4px 20px rgba(29, 185, 84, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
      'clay-green-hover': '0 8px 30px rgba(29, 185, 84, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
    },
    borderRadius: {
      'clay': '24px',
      'clay-sm': '16px',
      'clay-lg': '32px',
      'clay-full': '50px',
    },
  },
},
```

## Best Practices

### Do's
- Use large border-radius (16px-50px) for the soft, puffy look
- Combine outer AND inner shadows for depth
- Use gradients instead of flat colors
- Keep backgrounds light to emphasize shadows
- Add subtle hover animations
- Ensure good contrast for accessibility

### Don'ts
- Don't use on dark backgrounds without adjusting shadow colors
- Don't use flat colors - always use subtle gradients
- Don't use small border-radius - it kills the clay effect
- Don't skip the inner shadows - they create the pillow effect
- Don't overuse - reserve for key interactive elements

### Accessibility

- Ensure sufficient color contrast (4.5:1 minimum)
- Add focus-visible states for keyboard navigation
- Support reduced motion preference
- Include ARIA attributes for screen readers
- Test with screen readers

## When to Use Claymorphism

### Good Use Cases
- Web3 and crypto apps (playful, modern feel)
- Children's apps and educational platforms
- Gaming interfaces
- Dashboard widgets and cards
- Call-to-action buttons
- Fun, consumer-facing products
- Marketing landing pages

### Avoid Using On
- Corporate/enterprise interfaces
- Dense data tables
- Text-heavy content areas
- Serious financial applications
- Accessibility-critical interfaces

## Design System Integration

### Importing Components

```typescript
// Individual components
import { ClayButton, ClayCard, ClayInput } from "@plasma-pay/ui";

// All Claymorphism components
import {
  ClayButton,
  ClayCard,
  ClayInput,
  ClayBadge,
  ClayProgress,
  ClayAvatar,
  ClayContainer,
  ClaySection,
  ClayDivider,
  ClaySpacer,
  ClayAlert,
  ClayModal,
  ClaySheet,
  ClayToastProvider,
  useClayToast,
} from "@plasma-pay/ui";
```

### Design Tokens

Import the design tokens CSS file in your app's global styles:

```css
@import "@plasma-pay/ui/src/styles/clay-tokens.css";
```

Or copy the tokens to your app's CSS variables.

## Migration from Liquid Glass

Claymorphism is a lighter, more playful alternative to Liquid Glass. Consider using Claymorphism for:

- Consumer-facing apps
- Social/peer-to-peer features
- Gamified elements
- Marketing and landing pages

Keep Liquid Glass for:

- Data-heavy dashboards
- Technical interfaces
- Premium/enterprise features

## Contributing

When adding new components:

1. Follow the naming convention: `Clay<ComponentName>`
2. Use CSS variables from `clay-tokens.css`
3. Include prop variations (size, color, variant)
4. Add animations (hover, focus, active states)
5. Ensure accessibility (aria attributes)
6. Export from `packages/ui/src/index.ts`
7. Update this documentation

## Version History

- v1.0.0 (2025-01-23): Initial release with complete component library
  - Core: Card, Button, Input, Badge, Progress, Avatar
  - Layout: Container, Section, Divider, Spacer
  - Feedback: Alert, Modal, Sheet, Toast
  - Design tokens for colors, shadows, spacing, typography

## Support

For issues, questions, or contributions:
- Check the component source files in `packages/ui/src/components/`
- Review design tokens in `packages/ui/src/styles/clay-tokens.css`
- Reference existing implementations in `apps/plasma-venmo/`
