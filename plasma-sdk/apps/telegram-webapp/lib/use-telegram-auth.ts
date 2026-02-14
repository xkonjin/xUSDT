/**
 * Telegram Auth Hook
 *
 * TG-WEB-001: Frontend hook for Telegram initData validation
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getWebApp } from './telegram';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  user: TelegramUser | null;
  sessionToken: string | null;
  startParam: string | null;
}

interface AuthResponse {
  success?: boolean;
  error?: string;
  user?: TelegramUser;
  authDate?: number;
  startParam?: string;
  sessionToken?: string;
}

/**
 * Hook for Telegram WebApp authentication
 *
 * Automatically validates initData with the backend on mount
 */
export function useTelegramAuth() {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    error: null,
    user: null,
    sessionToken: null,
    startParam: null,
  });

  const validateAuth = useCallback(async () => {
    const webapp = getWebApp();

    // If not in Telegram, skip validation
    if (!webapp) {
      setState({
        isLoading: false,
        isAuthenticated: false,
        error: 'Not running in Telegram WebApp',
        user: null,
        sessionToken: null,
        startParam: null,
      });
      return;
    }

    const initData = webapp.initData;

    // If no initData, authentication not possible
    if (!initData) {
      setState({
        isLoading: false,
        isAuthenticated: false,
        error: 'No initData available',
        user: null,
        sessionToken: null,
        startParam: null,
      });
      return;
    }

    try {
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ initData }),
      });

      const data: AuthResponse = await response.json();

      if (response.ok && data.success) {
        setState({
          isLoading: false,
          isAuthenticated: true,
          error: null,
          user: data.user || null,
          sessionToken: data.sessionToken || null,
          startParam: data.startParam || null,
        });
      } else {
        setState({
          isLoading: false,
          isAuthenticated: false,
          error: data.error || 'Authentication failed',
          user: null,
          sessionToken: null,
          startParam: null,
        });
      }
    } catch {
      setState({
        isLoading: false,
        isAuthenticated: false,
        error: 'Network error during authentication',
        user: null,
        sessionToken: null,
        startParam: null,
      });
    }
  }, []);

  useEffect(() => {
    validateAuth();
  }, [validateAuth]);

  return {
    ...state,
    retry: validateAuth,
  };
}
