/**
 * Client-side Providers for Plenmo
 *
 * Uses the shared provider factory from @plasma-pay/privy-auth.
 */

"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPlasmaProviders } from "@plasma-pay/privy-auth";
import { ErrorBoundary, AssistantProvider } from "@plasma-pay/ui";
import { initPostHog } from "@/lib/posthog";

const BaseProviders = createPlasmaProviders({
  loginMethods: ["email", "sms", "google", "apple"],
  accentColor: "#00d4ff",
  ErrorBoundary,
});

// Wrapper that adds the AI Assistant
export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    initPostHog();
  }, []);

  return (
    <BaseProviders>
      <AssistantProvider
        apiKey={process.env.NEXT_PUBLIC_GEMINI_API_KEY}
        enabled={true}
        onNavigate={(page: string) => router.push(page)}
      >
        {children}
      </AssistantProvider>
    </BaseProviders>
  );
}
