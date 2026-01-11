"use client";

import { createPlasmaProviders } from "@plasma-pay/privy-auth";
import { ErrorBoundary } from "@plasma-pay/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, ReactNode } from "react";

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

  return (
    <QueryClientProvider client={queryClient}>
      <PlasmaProviders>{children}</PlasmaProviders>
    </QueryClientProvider>
  );
}
