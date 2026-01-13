'use client';

import { createContext, useContext, useCallback, useEffect } from 'react';
import { Assistant } from './Assistant';
import { AssistantErrorBoundary } from './AssistantErrorBoundary';
import { useAssistantStore } from './store/assistantStore';
import type {
  AssistantProviderProps,
  AssistantEmotion,
  UIContext,
} from './types';

interface AssistantContextValue {
  // Visibility controls
  show: () => void;
  hide: () => void;
  minimize: () => void;
  toggle: () => void;

  // State controls
  setEmotion: (emotion: AssistantEmotion) => void;
  setState: (state: string) => void;

  // Context updates
  updateContext: (context: Partial<UIContext>) => void;

  // Memory
  setUserName: (name: string) => void;

  // Message
  showMessage: (message: string, emotion?: AssistantEmotion) => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({
  children,
  apiKey,
  enabled = true,
  onNavigate,
}: AssistantProviderProps) {
  const store = useAssistantStore();

  // Initialize position on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined' && store.position.y === 500) {
      store.setPosition({
        x: 20,
        y: window.innerHeight - 200,
      });
    }
  }, [store.position.y, store.setPosition]);

  const showMessage = useCallback(
    (message: string, emotion?: AssistantEmotion) => {
      store.addMessage({
        type: 'assistant',
        content: message,
        emotion,
      });
      if (emotion) {
        store.setEmotion(emotion);
      }
      // Ensure assistant is visible and not minimized
      store.setVisible(true);
      store.setMinimized(false);
    },
    [store]
  );

  const contextValue: AssistantContextValue = {
    show: () => store.setVisible(true),
    hide: () => store.setVisible(false),
    minimize: () => store.setMinimized(true),
    toggle: () => store.toggle(),
    setEmotion: (emotion) => store.setEmotion(emotion),
    setState: (state) => store.setState(state as any),
    updateContext: (context) => store.updateUIContext(context),
    setUserName: (name) => store.updateMemory({ userName: name }),
    showMessage,
  };

  return (
    <AssistantContext.Provider value={contextValue}>
      {children}
      {enabled && (
        <AssistantErrorBoundary>
          <Assistant apiKey={apiKey} onNavigate={onNavigate} />
        </AssistantErrorBoundary>
      )}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within AssistantProvider');
  }
  return context;
}

// Hook for triggering assistant reactions to events
export function useAssistantReaction() {
  const context = useContext(AssistantContext);
  if (!context) {
    // Return no-op functions if not within provider
    return {
      onSuccess: () => {},
      onError: () => {},
      onLoading: () => {},
      onComplete: () => {},
    };
  }

  return {
    onSuccess: (message?: string) => {
      context.setEmotion('excited');
      if (message) {
        context.showMessage(message, 'excited');
      }
    },
    onError: (message?: string) => {
      context.setEmotion('concerned');
      if (message) {
        context.showMessage(message, 'concerned');
      }
    },
    onLoading: () => {
      context.setState('thinking');
    },
    onComplete: () => {
      context.setState('idle');
      context.setEmotion('neutral');
    },
  };
}
