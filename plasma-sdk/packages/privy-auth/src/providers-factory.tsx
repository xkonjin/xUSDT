/**
 * Providers Factory
 *
 * Factory function to create a configured Providers component for Plasma apps.
 * Eliminates the need to duplicate providers.tsx across every app.
 *
 * @example
 * ```tsx
 * // In your app's providers.tsx:
 * import { createPlasmaProviders } from '@plasma-pay/privy-auth';
 *
 * export const Providers = createPlasmaProviders({
 *   loginMethods: ['email', 'google', 'apple'],
 *   accentColor: '#00d4ff',
 * });
 * ```
 */

"use client";

import { ReactNode, useState, useEffect, ComponentType } from "react";
import { PlasmaPrivyProvider } from "./provider";
import type { PrivyLoginMethod } from "./types";

export interface PlasmaProvidersConfig {
  /** Login methods to enable (default: ['email', 'google', 'apple']) */
  loginMethods?: PrivyLoginMethod[];
  /** Theme (default: 'dark') */
  theme?: "light" | "dark";
  /** Accent color (default: '#00d4ff') */
  accentColor?: `#${string}`;
  /** Optional ErrorBoundary component to wrap the provider */
  ErrorBoundary?: ComponentType<{ children: ReactNode }>;
  /** Loading component to show during hydration */
  LoadingComponent?: ComponentType;
}

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Default loading spinner component
 */
function DefaultLoadingSpinner() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-[rgb(0,212,255)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/**
 * Default configuration message when Privy is not configured
 */
function ConfigurationRequired() {
  return (
    <div className="min-h-screen flex items-center justify-center text-white bg-black">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Configuration Required</h1>
        <p className="text-gray-400">
          Please set NEXT_PUBLIC_PRIVY_APP_ID environment variable
        </p>
      </div>
    </div>
  );
}

/**
 * Create a configured Providers component for your Plasma app.
 *
 * @param config - Provider configuration
 * @returns A React component that provides Privy context
 */
export function createPlasmaProviders(
  config: PlasmaProvidersConfig = {}
): ComponentType<ProvidersProps> {
  const {
    loginMethods = ["email", "google", "apple"],
    theme = "dark",
    accentColor = "#00d4ff",
    ErrorBoundary,
    LoadingComponent = DefaultLoadingSpinner,
  } = config;

  function Providers({ children }: ProvidersProps) {
    const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    // Show loading during hydration
    if (!isMounted) {
      return <LoadingComponent />;
    }

    // Show configuration message if Privy not set up
    if (!privyAppId) {
      return <ConfigurationRequired />;
    }

    // Render providers
    const content = (
      <PlasmaPrivyProvider
        config={{
          appId: privyAppId,
          loginMethods,
          appearance: {
            theme,
            accentColor,
          },
        }}
      >
        {children}
      </PlasmaPrivyProvider>
    );

    // Optionally wrap with ErrorBoundary
    if (ErrorBoundary) {
      return <ErrorBoundary>{content}</ErrorBoundary>;
    }

    return content;
  }

  // Set display name for React DevTools
  Providers.displayName = "PlasmaProviders";

  return Providers;
}

