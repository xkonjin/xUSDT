"use client";

import React, { createContext, useContext, useEffect, useCallback, useMemo } from 'react';
import posthog from 'posthog-js';
import { PlasmaEvents, type PlasmaEventName } from './events';

interface AnalyticsContextValue {
  track: (event: PlasmaEventName | string, properties?: Record<string, any>) => void;
  identify: (userId: string, properties?: Record<string, any>) => void;
  reset: () => void;
  isReady: boolean;
  getFeatureFlag: (flag: string) => boolean | string | undefined;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export interface PlasmaAnalyticsProviderProps {
  children: React.ReactNode;
  apiKey: string;
  host?: string;
  enabled?: boolean;
  debug?: boolean;
  appName?: string;
  appVersion?: string;
}

export function PlasmaAnalyticsProvider({
  children,
  apiKey,
  host = 'https://us.i.posthog.com',
  enabled = true,
  debug = false,
  appName,
  appVersion,
}: PlasmaAnalyticsProviderProps) {
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
    if (!enabled || !apiKey || typeof window === 'undefined') {
      return;
    }

    posthog.init(apiKey, {
      api_host: host,
      loaded: () => {
        setIsReady(true);
        if (debug) {
          console.log('[PlasmaAnalytics] PostHog initialized');
        }
      },
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      persistence: 'localStorage',
      bootstrap: {
        distinctID: undefined,
        featureFlags: {},
      },
    });

    // Set super properties
    posthog.register({
      app_name: appName,
      app_version: appVersion,
      platform: 'web',
    });

    return () => {
      // Cleanup on unmount if needed
    };
  }, [apiKey, host, enabled, debug, appName, appVersion]);

  const track = useCallback(
    (event: PlasmaEventName | string, properties?: Record<string, any>) => {
      if (!enabled) return;

      const enrichedProperties = {
        ...properties,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      };

      posthog.capture(event, enrichedProperties);

      if (debug) {
        console.log('[PlasmaAnalytics] Track:', event, enrichedProperties);
      }
    },
    [enabled, debug]
  );

  const identify = useCallback(
    (userId: string, properties?: Record<string, any>) => {
      if (!enabled) return;

      posthog.identify(userId, properties);

      if (debug) {
        console.log('[PlasmaAnalytics] Identify:', userId, properties);
      }
    },
    [enabled, debug]
  );

  const reset = useCallback(() => {
    if (!enabled) return;
    posthog.reset();

    if (debug) {
      console.log('[PlasmaAnalytics] Reset');
    }
  }, [enabled, debug]);

  const getFeatureFlag = useCallback(
    (flag: string): boolean | string | undefined => {
      if (!enabled) return undefined;
      return posthog.getFeatureFlag(flag);
    },
    [enabled]
  );

  const value = useMemo(
    () => ({
      track,
      identify,
      reset,
      isReady,
      getFeatureFlag,
    }),
    [track, identify, reset, isReady, getFeatureFlag]
  );

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);
  if (!context) {
    // Return no-op functions if used outside provider
    return {
      track: () => {},
      identify: () => {},
      reset: () => {},
      isReady: false,
      getFeatureFlag: () => undefined,
    };
  }
  return context;
}

// Convenience hooks for common tracking patterns
export function useTrackPageView(pageName: string, properties?: Record<string, any>) {
  const { track, isReady } = useAnalytics();

  useEffect(() => {
    if (isReady) {
      track('$pageview', { page_name: pageName, ...properties });
    }
  }, [isReady, pageName, track, properties]);
}

export function useTrackEvent() {
  const { track } = useAnalytics();
  return track;
}

// Export events for convenience
export { PlasmaEvents };
