# Claymorphism Component Usage Examples

This file provides practical, copy-paste examples for using Claymorphism components.

## Quick Start

```tsx
import {
  ClayCard,
  ClayButton,
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

// Wrap your app with ToastProvider
export default function App() {
  return (
    <ClayToastProvider>
      <YourApp />
    </ClayToastProvider>
  );
}
```

## 1. ClayCard Examples

### Basic Card

```tsx
<ClayCard padding="lg">
  <p>A simple clay card.</p>
</ClayCard>
```

### Colored Card with Header

```tsx
<ClayCard color="blue" variant="elevated" padding="lg">
  <ClayCardHeader>
    <ClayCardTitle>Blue Card</ClayCardTitle>
  </ClayCardHeader>
  <ClayCardContent>
    <p>This card has a blue gradient background.</p>
  </ClayCardContent>
</ClayCard>
```

### Interactive Card

```tsx
<ClayCard
  color="green"
  variant="elevated"
  padding="lg"
  interactive
  onClick={() => console.log("Clicked!")}
>
  <ClayCardHeader>
    <ClayCardTitle>Click Me</ClayCardTitle>
  </ClayCardHeader>
  <ClayCardContent>
    <p>This card has hover and click effects.</p>
  </ClayCardContent>
</ClayCard>
```

### Card with Footer

```tsx
<ClayCard padding="lg" variant="elevated">
  <ClayCardHeader>
    <ClayCardTitle>Actions</ClayCardTitle>
  </ClayCardHeader>
  <ClayCardContent>
    <p>This card has footer actions.</p>
  </ClayCardContent>
  <ClayCardFooter>
    <ClayButton size="sm" variant="ghost">
      Cancel
    </ClayButton>
    <ClayButton size="sm" variant="primary">
      Confirm
    </ClayButton>
  </ClayCardFooter>
</ClayCard>
```

## 2. ClayButton Examples

### Primary Button

```tsx
<ClayButton variant="primary" size="md">
  Click Me
</ClayButton>
```

### Success Button with Icon

```tsx
<ClayButton variant="success" size="lg" icon={<Check className="w-5 h-5" />}>
  Success
</ClayButton>
```

### Loading Button

```tsx
<ClayButton variant="primary" size="lg" loading={isLoading}>
  {isLoading ? "Loading..." : "Submit"}
</ClayButton>
```

### Danger Button

```tsx
<ClayButton variant="danger" size="md">
  Delete
</ClayButton>
```

### Secondary Button

```tsx
<ClayButton variant="secondary" size="md">
  Cancel
</ClayButton>
```

### Ghost Button

```tsx
<ClayButton variant="ghost" size="md">
  Learn More
</ClayButton>
```

## 3. ClayInput Examples

### Basic Input

```tsx
<ClayInput
  label="Name"
  placeholder="Enter your name"
/>
```

### Input with Error

```tsx
<ClayInput
  label="Email"
  placeholder="Enter your email"
  error="Invalid email format"
/>
```

### Input with Icons

```tsx
<ClayInput
  label="Search"
  placeholder="Search..."
  leftIcon={<Search className="w-5 h-5" />}
  rightIcon={<X className="w-5 h-5" />}
/>
```

### Input with Hint

```tsx
<ClayInput
  label="Password"
  type="password"
  hint="Must be at least 8 characters"
/>
```

## 4. ClayBadge Examples

### Default Badge

```tsx
<ClayBadge>New</ClayBadge>
```

### Success Badge with Dot

```tsx
<ClayBadge variant="success" dot>
  Active
</ClayBadge>
```

### Warning Badge

```tsx
<ClayBadge variant="warning" size="lg">
  Pending
</ClayBadge>
```

### Danger Badge

```tsx
<ClayBadge variant="danger">
  Error
</ClayBadge>
```

### Primary Badge

```tsx
<ClayBadge variant="primary" size="sm">
  Pro
</ClayBadge>
```

## 5. ClayProgress Examples

### Basic Progress Bar

```tsx
<ClayProgress value={50} max={100} />
```

### Progress with Label

```tsx
<ClayProgress value={75} max={100} showLabel />
```

### Success Progress

```tsx
<ClayProgress value={90} variant="success" size="lg" />
```

### Progress Steps

```tsx
<ClayProgressSteps
  steps={[
    { label: "Upload", completed: true },
    { label: "Process", completed: true, active: true },
    { label: "Complete", completed: false },
  ]}
/>
```

### Large Progress Steps

```tsx
<ClayProgressSteps
  size="lg"
  steps={[
    { label: "Step 1", completed: true },
    { label: "Step 2", completed: true },
    { label: "Step 3", completed: true },
    { label: "Step 4", completed: true, active: true },
  ]}
/>
```

## 6. ClayAvatar Examples

### Text Avatar

```tsx
<ClayAvatar name="Alice Johnson" size="md" />
```

### Image Avatar

```tsx
<ClayAvatar
  name="Alice"
  src="https://example.com/avatar.jpg"
  size="lg"
/>
```

### Avatar with Status

```tsx
<ClayAvatar name="Bob" size="xl" status="online" />
<ClayAvatar name="Charlie" size="xl" status="busy" />
<ClayAvatar name="David" size="xl" status="away" />
```

### Avatar Group

```tsx
<ClayAvatarGroup
  names={["Alice", "Bob", "Charlie", "David", "Eve"]}
  size="md"
  max={3}
/>
```

### Rounded Avatar (not full circle)

```tsx
<ClayAvatar name="Alice" size="2xl" rounded="2xl" />
```

## 7. ClayContainer Examples

### Basic Container

```tsx
<ClayContainer>
  <p>This content is centered with max width.</p>
</ClayContainer>
```

### Small Container

```tsx
<ClayContainer size="sm" padding="sm">
  <p>Small centered container.</p>
</ClayContainer>
```

### Full Width Container

```tsx
<ClayContainer size="full" centered={false} padding="lg">
  <div className="grid grid-cols-3 gap-4">
    <div>Column 1</div>
    <div>Column 2</div>
    <div>Column 3</div>
  </div>
</ClayContainer>
```

## 8. ClaySection Examples

### Basic Section

```tsx
<ClaySection size="lg">
  <p>Section content here.</p>
</ClaySection>
```

### Section with Title

```tsx
<ClaySection title="Features" description="Explore our amazing features">
  <div className="grid grid-cols-3 gap-6">
    <ClayCard><p>Feature 1</p></ClayCard>
    <ClayCard><p>Feature 2</p></ClayCard>
    <ClayCard><p>Feature 3</p></ClayCard>
  </div>
</ClaySection>
```

### Colored Section

```tsx
<ClaySection
  variant="primary"
  title="Pricing"
  centered
  size="xl"
>
  <div className="grid grid-cols-3 gap-6">
    <ClayCard><p>Basic</p></ClayCard>
    <ClayCard><p>Pro</p></ClayCard>
    <ClayCard><p>Enterprise</p></ClayCard>
  </div>
</ClaySection>
```

## 9. ClayDivider Examples

### Horizontal Divider

```tsx
<ClayDivider />
```

### Divider with Label

```tsx
<ClayDivider label="Or continue with" />
```

### Colored Divider

```tsx
<ClayDivider variant="success" size="lg" />
```

### Vertical Divider

```tsx
<div className="h-20">
  <ClayDivider orientation="vertical" />
</div>
```

## 10. ClaySpacer Examples

### Vertical Spacer

```tsx
<div>
  <p>Content</p>
  <ClaySpacer size="lg" />
  <p>More content</p>
</div>
```

### Horizontal Spacer

```tsx
<div className="flex">
  <span>Left</span>
  <ClaySpacer size="md" axis="horizontal" />
  <span>Right</span>
</div>
```

### Both Axes (Box)

```tsx
<ClaySpacer size="xl" axis="both" />
```

## 11. ClayAlert Examples

### Info Alert

```tsx
<ClayAlert variant="info">
  This is an informational alert.
</ClayAlert>
```

### Success Alert with Dismiss

```tsx
<ClayAlert
  variant="success"
  dismissible
  onDismiss={() => console.log("Dismissed")}
>
  Your changes have been saved successfully!
</ClayAlert>
```

### Warning Alert

```tsx
<ClayAlert variant="warning">
  Please review your information before submitting.
</ClayAlert>
```

### Danger Alert

```tsx
<ClayAlert variant="danger" dismissible>
  Error: Failed to load data. Please try again.
</ClayAlert>
```

### Custom Icon Alert

```tsx
<ClayAlert variant="info" icon={<Bell className="w-5 h-5" />}>
  You have 3 new notifications.
</ClayAlert>
```

## 12. ClayModal Examples

### Basic Modal

```tsx
<ClayModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Welcome"
>
  <p>This is a modal dialog.</p>
</ClayModal>
```

### Modal with Description

```tsx
<ClayModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Delete Account"
  description="This action cannot be undone."
  size="md"
>
  <p className="text-slate-600">
    Are you sure you want to permanently delete your account?
  </p>
</ClayModal>
```

### Modal with Actions

```tsx
<ClayModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Purchase"
  size="lg"
>
  <p className="text-slate-600 mb-4">
    Total: $99.00
  </p>
  <ClayModalFooter>
    <ClayButton variant="secondary" onClick={() => setIsOpen(false)}>
      Cancel
    </ClayButton>
    <ClayButton variant="success" onClick={handlePurchase}>
      Confirm Purchase
    </ClayButton>
  </ClayModalFooter>
</ClayModal>
```

## 13. ClaySheet Examples

### Right Sheet

```tsx
<ClaySheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  position="right"
  size="lg"
>
  <nav className="flex flex-col gap-4">
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
  </nav>
</ClaySheet>
```

### Bottom Sheet

```tsx
<ClaySheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  position="bottom"
  size="xl"
>
  <p>Sheet content</p>
  <ClaySheetFooter>
    <ClayButton onClick={() => setIsOpen(false)}>
      Close
    </ClayButton>
  </ClaySheetFooter>
</ClaySheet>
```

## 14. Toast Examples

### Basic Toast Usage

```tsx
function MyComponent() {
  const { success, error, info, warning } = useClayToast();

  const handleSuccess = () => {
    success("Success!", "Your action was completed.");
  };

  const handleError = () => {
    error("Error!", "Something went wrong.");
  };

  return (
    <div className="flex flex-col gap-4">
      <ClayButton onClick={handleSuccess}>Show Success</ClayButton>
      <ClayButton variant="danger" onClick={handleError}>
        Show Error
      </ClayButton>
    </div>
  );
}
```

### Toast Provider Setup

```tsx
import { ClayToastProvider } from "@plasma-pay/ui";

export default function App() {
  return (
    <ClayToastProvider>
      <MyComponent />
    </ClayToastProvider>
  );
}
```

## 15. Combined Examples

### Payment Card

```tsx
<ClayCard color="blue" variant="elevated" padding="lg">
  <ClayCardHeader>
    <ClayCardTitle>Payment Summary</ClayCardTitle>
  </ClayCardHeader>
  <ClayCardContent className="space-y-4">
    <div className="flex justify-between">
      <span className="text-slate-600">Amount</span>
      <span className="font-bold text-lg">$99.00</span>
    </div>
    <ClayDivider />
    <ClayInput
      label="Card Number"
      placeholder="0000 0000 0000 0000"
      leftIcon={<CreditCard className="w-5 h-5" />}
    />
    <div className="grid grid-cols-2 gap-4">
      <ClayInput label="Expiry" placeholder="MM/YY" />
      <ClayInput label="CVC" placeholder="123" />
    </div>
  </ClayCardContent>
  <ClayCardFooter>
    <ClayButton variant="secondary" className="flex-1">
      Cancel
    </ClayButton>
    <ClayButton variant="success" className="flex-1" icon={<Check className="w-4 h-4" />}>
      Pay Now
    </ClayButton>
  </ClayCardFooter>
</ClayCard>
```

### Profile Page

```tsx
<ClaySection size="xl" centered>
  <ClayAvatar name="Alice" size="2xl" status="online" />
  <ClaySpacer size="lg" />
  <h1 className="text-2xl font-bold text-slate-800">Alice Johnson</h1>
  <p className="text-slate-600">@alicej</p>
  <ClaySpacer size="md" />
  <div className="flex gap-3">
    <ClayBadge variant="primary" dot>Verified</ClayBadge>
    <ClayBadge variant="success" dot>Active</ClayBadge>
  </div>
  <ClaySpacer size="lg" />
  <ClayContainer size="md">
    <ClayCard padding="lg">
      <ClayCardHeader>
        <ClayCardTitle>About Me</ClayCardTitle>
      </ClayCardHeader>
      <ClayCardContent>
        <p className="text-slate-600">
          Software developer and design enthusiast.
        </p>
      </ClayCardContent>
    </ClayCard>
  </ClayContainer>
</ClaySection>
```

### Form with Validation

```tsx
<ClayCard variant="elevated" padding="lg">
  <ClayCardHeader>
    <ClayCardTitle>Sign Up</ClayCardTitle>
  </ClayCardHeader>
  <ClayCardContent className="space-y-4">
    <ClayInput
      label="Name"
      placeholder="Enter your name"
    />
    <ClayInput
      label="Email"
      type="email"
      placeholder="Enter your email"
    />
    <ClayInput
      label="Password"
      type="password"
      placeholder="Enter your password"
      hint="Must be at least 8 characters"
    />
    {errorMessage && (
      <ClayAlert variant="danger" dismissible>
        {errorMessage}
      </ClayAlert>
    )}
    <ClayProgress value={50} showLabel />
  </ClayCardContent>
  <ClayCardFooter>
    <ClayButton variant="secondary" onClick={onCancel}>
      Cancel
    </ClayButton>
    <ClayButton variant="primary" onClick={onSubmit} loading={isSubmitting}>
      {isSubmitting ? "Submitting..." : "Create Account"}
    </ClayButton>
  </ClayCardFooter>
</ClayCard>
```

### Onboarding Flow

```tsx
<ClayContainer size="lg" padding="lg">
  <ClayProgressSteps
    steps={[
      { label: "Profile", completed: step > 1 },
      { label: "Preferences", completed: step > 2, active: step === 2 },
      { label: "Confirmation", completed: step > 3, active: step === 3 },
    ]}
    size="lg"
  />
  <ClaySpacer size="xl" />

  {step === 1 && (
    <ClayCard padding="lg">
      <ClayCardHeader>
        <ClayCardTitle>Step 1: Profile</ClayCardTitle>
      </ClayCardHeader>
      <ClayCardContent className="space-y-4">
        <ClayInput label="Name" placeholder="Your name" />
        <ClayAvatarGroup names={["Alice", "Bob"]} size="xl" />
      </ClayCardContent>
      <ClayCardFooter>
        <ClayButton onClick={nextStep}>Continue</ClayButton>
      </ClayCardFooter>
    </ClayCard>
  )}

  {step === 2 && (
    <ClayCard padding="lg">
      <ClayCardHeader>
        <ClayCardTitle>Step 2: Preferences</ClayCardTitle>
      </ClayCardHeader>
      <ClayCardContent>
        <div className="flex gap-3">
          <ClayBadge variant="primary" dot>Notifications</ClayBadge>
          <ClayBadge variant="secondary" dot>Email</ClayBadge>
        </div>
      </ClayCardContent>
      <ClayCardFooter>
        <ClayButton onClick={nextStep}>Continue</ClayButton>
      </ClayCardFooter>
    </ClayCard>
  )}
</ClayContainer>
```

## Notes

1. All components use the `cn` utility for Tailwind class merging
2. Components are fully typed with TypeScript
3. All components support responsive design
4. Components include accessibility features (aria attributes)
5. Animations respect `prefers-reduced-motion`
6. Dark mode support via CSS variables (when configured)
