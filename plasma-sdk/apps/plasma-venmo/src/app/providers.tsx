/**
 * Client-side Providers for Plenmo
 *
 * Uses the shared provider factory from @plasma-pay/privy-auth.
 */

"use client";

import { ReactNode, useEffect, useState } from "react";
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
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    initPostHog();
    
    // Global error handler to capture unhandled errors
    const errorHandler = (event: ErrorEvent) => {
      console.error("[Global Error]", event.error);
      setGlobalError(`${event.message}\n\nStack: ${event.error?.stack || "N/A"}`);
    };
    
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      console.error("[Unhandled Rejection]", event.reason);
      setGlobalError(`Unhandled Promise Rejection: ${event.reason}\n\nStack: ${event.reason?.stack || "N/A"}`);
    };
    
    window.addEventListener("error", errorHandler);
    window.addEventListener("unhandledrejection", rejectionHandler);
    
    return () => {
      window.removeEventListener("error", errorHandler);
      window.removeEventListener("unhandledrejection", rejectionHandler);
    };
  }, []);
  
  // Show global error if captured
  if (globalError) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <h1 className="text-2xl font-bold text-red-400 mb-4">Global JavaScript Error</h1>
        <pre className="bg-gray-900 p-4 rounded-lg overflow-auto text-xs text-red-300 whitespace-pre-wrap">
          {globalError}
        </pre>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-cyan-500 text-black rounded-lg"
        >
          Reload
        </button>
      </div>
    );
  }

  return (
    <BaseProviders>
      <AssistantProvider
        enabled={true}
        onNavigate={(page) => router.push(page)}
      >
        {children}
      </AssistantProvider>
    </BaseProviders>
  );
}
