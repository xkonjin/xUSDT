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
import { MockPrivyProvider } from "./mock-provider";
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
 * In dev mode, shows a mock login for testing UI without Privy
 */
function ConfigurationRequired({ children }: { children: ReactNode }) {
  const [mockLoggedIn, setMockLoggedIn] = useState(false);
  const isDev = process.env.NODE_ENV === "development";
  const forceMock = process.env.NEXT_PUBLIC_MOCK_AUTH === "true";

  if (forceMock) {
    return <MockPrivyProvider>{children}</MockPrivyProvider>;
  }

  if (isDev && mockLoggedIn) {
    // Render children with mock context - they'll use the MockPrivyProvider
    return <MockPrivyProvider>{children}</MockPrivyProvider>;
  }

  if (isDev) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Dev Mode</h1>
          <p className="text-gray-400 mb-6">
            Privy not configured. Use mock login to preview UI.
          </p>
          <button
            onClick={() => setMockLoggedIn(true)}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl transition-colors"
          >
            Mock Login (Dev Only)
          </button>
          <p className="text-gray-500 text-sm mt-4">
            Or set NEXT_PUBLIC_PRIVY_APP_ID for real auth
          </p>
        </div>
      </div>
    );
  }

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
    const forceMock = process.env.NEXT_PUBLIC_MOCK_AUTH === "true";
    const [isMounted, setIsMounted] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [error, _setError] = useState<string | null>(null);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    // Show loading during hydration
    if (!isMounted) {
      return <LoadingComponent />;
    }

    // Show error if something went wrong
    if (error) {
      return (
        <div className="min-h-screen flex items-center justify-center text-white bg-black">
          <div className="text-center max-w-md p-6">
            <h1 className="text-2xl font-bold mb-4 text-red-400">Provider Error</h1>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    if (forceMock) {
      return <MockPrivyProvider>{children}</MockPrivyProvider>;
    }

    // Show configuration message if Privy not set up
    if (!privyAppId) {
      console.error("[PlasmaProviders] NEXT_PUBLIC_PRIVY_APP_ID is not set!");
      return <ConfigurationRequired>{children}</ConfigurationRequired>;
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

