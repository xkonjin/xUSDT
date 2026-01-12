/**
 * Client-side Providers for Plenmo
 *
 * Uses the shared provider factory from @plasma-pay/privy-auth.
 */

"use client";

import { createPlasmaProviders } from "@plasma-pay/privy-auth";
import { ErrorBoundary } from "@plasma-pay/ui";

export const Providers = createPlasmaProviders({
  loginMethods: ["email", "sms", "google", "apple"],
  accentColor: "#00d4ff",
  ErrorBoundary,
});
