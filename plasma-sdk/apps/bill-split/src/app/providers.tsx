/**
 * Client-side Providers for Bill Split (Splitzy)
 *
 * Uses the shared provider factory from @plasma-pay/privy-auth.
 */

"use client";

import { createPlasmaProviders } from "@plasma-pay/privy-auth";
import { ErrorBoundary } from "@plasma-pay/ui";
import { ReactNode, useEffect } from "react";
import { initPostHog } from "@/lib/posthog";

const PlasmaProviders = createPlasmaProviders({
  loginMethods: ["email", "sms", "google", "apple"],
  accentColor: "#14B8A6",
  ErrorBoundary,
});

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  return <PlasmaProviders>{children}</PlasmaProviders>;
}
