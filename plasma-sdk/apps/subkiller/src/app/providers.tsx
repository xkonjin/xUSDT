/**
 * Client-side Providers for SubKiller
 *
 * Combines NextAuth SessionProvider with Plasma Privy for dual auth support.
 * - NextAuth: Google OAuth for Gmail access
 * - Privy: Embedded wallet for payments
 */

"use client";

import { SessionProvider } from "next-auth/react";
import { createPlasmaProviders } from "@plasma-pay/privy-auth";
import { ErrorBoundary } from "@plasma-pay/ui";

const PlasmaProviders = createPlasmaProviders({
  loginMethods: ["email", "google"],
  accentColor: "#00d4ff",
  ErrorBoundary,
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PlasmaProviders>{children}</PlasmaProviders>
    </SessionProvider>
  );
}
