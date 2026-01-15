/**
 * Client-side Providers for Plasma Stream
 *
 * Uses the shared provider factory from @plasma-pay/privy-auth.
 */

"use client";

import { createPlasmaProviders } from "@plasma-pay/privy-auth";
import { ErrorBoundary } from "@plasma-pay/ui";
import { ReactNode, useEffect } from "react";
import { initPostHog } from "@/lib/posthog";

const PlasmaProviders = createPlasmaProviders({
  loginMethods: ["email", "google", "wallet"],
  accentColor: "#00d4ff",
  ErrorBoundary,
});

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  return <PlasmaProviders>{children}</PlasmaProviders>;
}
