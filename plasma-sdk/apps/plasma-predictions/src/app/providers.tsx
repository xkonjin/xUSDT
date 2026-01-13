"use client";

import { createPlasmaProviders } from "@plasma-pay/privy-auth";
import { ErrorBoundary } from "@plasma-pay/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, ReactNode, useEffect } from "react";
import { PriceUpdaterProvider } from "@/lib/price-updater-context";
import { initPostHog } from "@/lib/posthog";

const PlasmaProviders = createPlasmaProviders({
  loginMethods: ["email", "google", "apple", "sms", "wallet"],
  accentColor: "#8B5CF6",
  ErrorBoundary,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  useEffect(() => {
    initPostHog();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PlasmaProviders>
        <PriceUpdaterProvider pollingInterval={30000}>
          {children}
        </PriceUpdaterProvider>
      </PlasmaProviders>
    </QueryClientProvider>
  );
}
