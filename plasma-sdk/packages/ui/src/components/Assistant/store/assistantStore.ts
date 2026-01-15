import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AssistantState,
  AssistantEmotion,
  AssistantMessage,
  AssistantConfig,
  AssistantMemory,
  UIContext,
} from '../types';
import {
  DEFAULT_CONFIG,
  DEFAULT_MEMORY,
  DEFAULT_UI_CONTEXT,
} from '../constants';

interface AssistantStore {
  // Visibility state
  isVisible: boolean;
  isMinimized: boolean;

  // Animation state
  state: AssistantState;
  emotion: AssistantEmotion;
  currentViseme: string;
  isSpeaking: boolean;

  // Position
  position: { x: number; y: number };

  // Messages
  messages: AssistantMessage[];

  // Configuration (persisted)
  config: AssistantConfig;
  memory: AssistantMemory;

  // UI Context
  uiContext: UIContext;

  // Actions - Visibility
  setVisible: (visible: boolean) => void;
  setMinimized: (minimized: boolean) => void;
  toggle: () => void;

  // Actions - Animation
  setState: (state: AssistantState) => void;
  setEmotion: (emotion: AssistantEmotion) => void;
  setCurrentViseme: (viseme: string) => void;
  setIsSpeaking: (speaking: boolean) => void;

  // Actions - Position
  setPosition: (position: { x: number; y: number }) => void;

  // Actions - Messages
  addMessage: (message: Omit<AssistantMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;

  // Actions - Context
  updateUIContext: (context: Partial<UIContext>) => void;

  // Actions - Config & Memory
  updateConfig: (config: Partial<AssistantConfig>) => void;
  updateMemory: (memory: Partial<AssistantMemory>) => void;

  // Helper actions
  reset: () => void;
  wakeUp: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useAssistantStore = create<AssistantStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isVisible: true,
      isMinimized: false,
      state: 'idle',
      emotion: 'neutral',
      currentViseme: 'sil',
      isSpeaking: false,
      position: { x: 20, y: 500 }, // Will be updated client-side in AssistantProvider
      messages: [],
      config: DEFAULT_CONFIG,
      memory: DEFAULT_MEMORY,
      uiContext: DEFAULT_UI_CONTEXT,

      // Visibility actions
      setVisible: (visible) => set({ isVisible: visible }),
      setMinimized: (minimized) => set({ isMinimized: minimized }),
      toggle: () => set((s) => ({ isMinimized: !s.isMinimized })),

      // Animation actions
      setState: (state) => set({ state }),
      setEmotion: (emotion) => set({ emotion }),
      setCurrentViseme: (viseme) => set({ currentViseme: viseme }),
      setIsSpeaking: (speaking) => set({ isSpeaking: speaking }),

      // Position actions
      setPosition: (position) => set({ position }),

      // Message actions
      addMessage: (message) =>
        set((s) => ({
          messages: [
            ...s.messages.slice(-19), // Keep last 20 messages
            {
              ...message,
              id: generateId(),
              timestamp: Date.now(),
            },
          ],
        })),
      clearMessages: () => set({ messages: [] }),

      // Context actions
      updateUIContext: (context) =>
        set((s) => ({
          uiContext: { ...s.uiContext, ...context },
        })),

      // Config & Memory actions
      updateConfig: (config) =>
        set((s) => ({
          config: { ...s.config, ...config },
        })),
      updateMemory: (memory) =>
        set((s) => ({
          memory: {
            ...s.memory,
            ...memory,
            lastInteraction: Date.now(),
          },
        })),

      // Helper actions
      reset: () =>
        set({
          state: 'idle',
          emotion: 'neutral',
          currentViseme: 'sil',
          isSpeaking: false,
          messages: [],
        }),

      wakeUp: () => {
        const { state } = get();
        if (state === 'sleeping') {
          set({ state: 'idle', emotion: 'neutral' });
        }
      },
    }),
    {
      name: 'plenmo-assistant',
      partialize: (state) => ({
        config: state.config,
        memory: state.memory,
        // Don't persist position - it's calculated client-side based on window size
        isMinimized: state.isMinimized,
      }),
    }
  )
);
