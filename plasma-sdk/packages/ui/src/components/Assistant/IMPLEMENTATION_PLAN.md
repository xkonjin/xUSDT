# Plenmo Assistant - Full Implementation Plan

## Overview

Building an LLM-powered, floating talking head assistant that:
- Floats around the UI (draggable, dockable)
- Tracks mouse position with eyes
- Provides contextual help based on current page/actions
- Has dynamic personality and emotions
- Features real-time lip-sync when speaking
- Uses claymorphism design matching the app theme
- Learns from interactions (remembers preferences)

---

## Tech Stack

| Component | Technology | Why |
|-----------|------------|-----|
| **2D Character** | Rive (`@rive-app/react-canvas`) | State machines, data binding, performant |
| **Lip Sync** | `wawa-lipsync` | Real-time browser-based, no API costs |
| **Text-to-Speech** | `@met4citizen/headtts` | Free neural TTS with visemes, runs in-browser via WebGPU |
| **LLM** | Google Gemini Flash | Fast, cheap, function calling support |
| **State Management** | Zustand | Lightweight, perfect for assistant state |
| **Animations** | Framer Motion | Smooth floating/bouncing animations |
| **Storage** | LocalStorage + IndexedDB | Remember user preferences and learning |

---

## Phase 1: Core Structure & Static Avatar (Day 1)

### 1.1 Package Setup

```bash
# In plasma-sdk root
cd packages/ui
npm install @rive-app/react-canvas zustand framer-motion
```

### 1.2 File Structure

```
packages/ui/src/components/Assistant/
├── index.ts                    # Public exports
├── Assistant.tsx               # Main container component
├── AssistantAvatar.tsx         # Rive character renderer
├── AssistantBubble.tsx         # Speech bubble UI
├── AssistantDock.tsx           # Minimized dock state
├── AssistantProvider.tsx       # Context provider
├── hooks/
│   ├── useAssistant.ts         # Main hook for using assistant
│   ├── useMousePosition.ts     # Mouse tracking
│   ├── useUIContext.ts         # Current page/form/action context
│   ├── useLipSync.ts           # Audio lip sync
│   ├── useTTS.ts               # Text-to-speech
│   └── useAssistantAI.ts       # LLM integration
├── store/
│   └── assistantStore.ts       # Zustand store
├── types.ts                    # TypeScript types
├── constants.ts                # Configuration constants
├── utils/
│   ├── contextCollector.ts     # Gather UI context
│   └── personalityEngine.ts    # Emotion/personality logic
└── assets/
    └── plenmo-assistant.riv    # Rive animation file
```

### 1.3 Core Types

```typescript
// types.ts
export type AssistantState = 
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'sleeping'
  | 'excited'
  | 'concerned';

export type AssistantEmotion =
  | 'neutral'
  | 'happy'
  | 'thinking'
  | 'concerned'
  | 'excited'
  | 'sleepy';

export type AssistantPosition = {
  x: number;
  y: number;
};

export interface AssistantMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  emotion?: AssistantEmotion;
}

export interface UIContext {
  currentPage: string;
  currentRoute: string;
  formFields: Record<string, FormFieldState>;
  walletConnected: boolean;
  balance: string | null;
  pendingTransactions: number;
  mouseIdleTime: number;
  lastAction: string | null;
  hoverTarget: string | null;
  errors: string[];
}

export interface FormFieldState {
  name: string;
  value: string;
  isValid: boolean;
  isFocused: boolean;
  errorMessage?: string;
}

export interface AssistantConfig {
  personality: 'friendly' | 'professional' | 'playful';
  proactivity: 'shy' | 'moderate' | 'chatty';
  voiceEnabled: boolean;
  voiceId: string;
  voiceSpeed: number;
}

export interface AssistantMemory {
  userName?: string;
  preferredTopics: string[];
  commonActions: string[];
  helpHistory: Array<{
    context: string;
    helpProvided: string;
    wasHelpful: boolean;
  }>;
  lastInteraction: number;
}
```

### 1.4 Zustand Store

```typescript
// store/assistantStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AssistantStore {
  // State
  isVisible: boolean;
  isMinimized: boolean;
  state: AssistantState;
  emotion: AssistantEmotion;
  position: { x: number; y: number };
  messages: AssistantMessage[];
  isSpeaking: boolean;
  currentViseme: string;
  
  // Config (persisted)
  config: AssistantConfig;
  memory: AssistantMemory;
  
  // UI Context
  uiContext: UIContext;
  
  // Actions
  setVisible: (visible: boolean) => void;
  setMinimized: (minimized: boolean) => void;
  setState: (state: AssistantState) => void;
  setEmotion: (emotion: AssistantEmotion) => void;
  setPosition: (position: { x: number; y: number }) => void;
  addMessage: (message: Omit<AssistantMessage, 'id' | 'timestamp'>) => void;
  setIsSpeaking: (speaking: boolean) => void;
  setCurrentViseme: (viseme: string) => void;
  updateUIContext: (context: Partial<UIContext>) => void;
  updateConfig: (config: Partial<AssistantConfig>) => void;
  updateMemory: (memory: Partial<AssistantMemory>) => void;
  
  // Helper actions
  speak: (text: string, emotion?: AssistantEmotion) => Promise<void>;
  askForHelp: () => void;
  dismiss: () => void;
  reset: () => void;
}
```

---

## Phase 2: Rive Character Design & Animation (Day 1-2)

### 2.1 Character Design Requirements

**Style**: Cute, friendly blob/creature with claymorphism aesthetics

**Elements**:
- Round body with soft shadows (clay effect)
- Large expressive eyes (follow mouse)
- Small mouth with viseme shapes
- Gradient colors matching Plenmo theme (cyan/purple)
- Subtle floating animation
- Glow effect when active

**Animation States (State Machine)**:
```
Entry → Idle
Idle → Listening (on user interaction)
Idle → Sleeping (after 30s idle)
Listening → Thinking (waiting for LLM)
Thinking → Speaking (LLM response)
Speaking → Idle (finished speaking)
Any → Excited (success events)
Any → Concerned (error events)
```

### 2.2 Rive Inputs

| Input | Type | Purpose |
|-------|------|---------|
| `mouseX` | Number | Eye tracking X (-1 to 1) |
| `mouseY` | Number | Eye tracking Y (-1 to 1) |
| `viseme` | Number | Mouth shape (0-14 for 15 visemes) |
| `state` | Number | Current state enum |
| `emotion` | Number | Current emotion enum |
| `isHovered` | Boolean | Mouse over assistant |
| `bounce` | Trigger | Play bounce animation |

### 2.3 Rive File Creation

Will create `plenmo-assistant.riv` with:
- Artboard: 256x256 px
- Layers: Body, Eyes, Mouth, Glow
- State Machine: MainStateMachine
- Timeline animations for each state
- Blend states for smooth transitions

---

## Phase 3: Mouse Tracking & Eye Gaze (Day 2)

### 3.1 Mouse Position Hook

```typescript
// hooks/useMousePosition.ts
import { useState, useEffect, useCallback, useRef } from 'react';

interface MousePosition {
  x: number;
  y: number;
  normalized: { x: number; y: number }; // -1 to 1 range
  idleTime: number;
}

export function useMousePosition(
  avatarRef: React.RefObject<HTMLElement>,
  enabled: boolean = true
): MousePosition {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [normalized, setNormalized] = useState({ x: 0, y: 0 });
  const [idleTime, setIdleTime] = useState(0);
  const lastMoveRef = useRef(Date.now());
  const idleTimerRef = useRef<NodeJS.Timeout>();

  const calculateNormalized = useCallback((mouseX: number, mouseY: number) => {
    if (!avatarRef.current) return { x: 0, y: 0 };
    
    const rect = avatarRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate direction from avatar center to mouse
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    
    // Normalize to -1 to 1 range with max distance
    const maxDistance = 500; // pixels
    const distance = Math.sqrt(dx * dx + dy * dy);
    const scale = Math.min(distance / maxDistance, 1);
    
    const angle = Math.atan2(dy, dx);
    
    return {
      x: Math.cos(angle) * scale,
      y: Math.sin(angle) * scale
    };
  }, [avatarRef]);

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setNormalized(calculateNormalized(e.clientX, e.clientY));
      lastMoveRef.current = Date.now();
      setIdleTime(0);
    };

    // Track idle time
    idleTimerRef.current = setInterval(() => {
      setIdleTime(Date.now() - lastMoveRef.current);
    }, 1000);

    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, [enabled, calculateNormalized]);

  return { x: position.x, y: position.y, normalized, idleTime };
}
```

---

## Phase 4: Text-to-Speech Integration (Day 2-3)

### 4.1 HeadTTS Hook

```typescript
// hooks/useTTS.ts
import { useState, useEffect, useCallback, useRef } from 'react';

interface TTSOptions {
  voice?: string;
  speed?: number;
  onViseme?: (viseme: string, duration: number) => void;
  onWord?: (word: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export function useTTS() {
  const [isReady, setIsReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentViseme, setCurrentViseme] = useState('sil');
  const headttsRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Initialize HeadTTS
  useEffect(() => {
    const initTTS = async () => {
      // Dynamic import for HeadTTS
      const { HeadTTS } = await import('@met4citizen/headtts');
      
      audioCtxRef.current = new AudioContext();
      
      headttsRef.current = new HeadTTS({
        endpoints: ['webgpu', 'wasm'], // Try WebGPU first, fallback to WASM
        audioCtx: audioCtxRef.current,
        voices: ['af_bella'], // Preload default voice
        languages: ['en-us'],
      });

      await headttsRef.current.connect();
      setIsReady(true);
    };

    initTTS().catch(console.error);

    return () => {
      if (headttsRef.current) {
        headttsRef.current.clear();
      }
    };
  }, []);

  const speak = useCallback(async (
    text: string,
    options: TTSOptions = {}
  ): Promise<void> => {
    if (!headttsRef.current || !isReady) {
      console.warn('TTS not ready');
      return;
    }

    const { voice = 'af_bella', speed = 1, onViseme, onWord, onStart, onEnd } = options;

    // Setup voice
    headttsRef.current.setup({
      voice,
      language: 'en-us',
      speed,
      audioEncoding: 'wav'
    });

    // Handle messages
    headttsRef.current.onmessage = (message: any) => {
      if (message.type === 'audio') {
        setIsSpeaking(true);
        onStart?.();

        // Process visemes
        const { visemes, vtimes, vdurations, words, wtimes } = message.data;
        
        // Schedule viseme changes
        visemes.forEach((viseme: string, i: number) => {
          setTimeout(() => {
            setCurrentViseme(viseme);
            onViseme?.(viseme, vdurations[i]);
          }, vtimes[i]);
        });

        // Schedule word callbacks
        words.forEach((word: string, i: number) => {
          setTimeout(() => onWord?.(word), wtimes[i]);
        });

        // Schedule end
        const totalDuration = vtimes[vtimes.length - 1] + vdurations[vdurations.length - 1];
        setTimeout(() => {
          setIsSpeaking(false);
          setCurrentViseme('sil');
          onEnd?.();
        }, totalDuration);

        // Play audio
        const audio = new Audio();
        audio.src = URL.createObjectURL(new Blob([message.data.audio], { type: 'audio/wav' }));
        audio.play();
      }
    };

    // Synthesize
    await headttsRef.current.synthesize({ input: text });
  }, [isReady]);

  const stop = useCallback(() => {
    if (headttsRef.current) {
      headttsRef.current.clear();
      setIsSpeaking(false);
      setCurrentViseme('sil');
    }
  }, []);

  return {
    isReady,
    isSpeaking,
    currentViseme,
    speak,
    stop
  };
}
```

---

## Phase 5: LLM Integration with Context (Day 3)

### 5.1 Context Collection

```typescript
// utils/contextCollector.ts
import { UIContext } from '../types';

export function collectUIContext(): UIContext {
  // Get current route from URL
  const currentRoute = window.location.pathname;
  
  // Map routes to friendly names
  const pageNames: Record<string, string> = {
    '/': 'Home',
    '/send': 'Send Money',
    '/receive': 'Receive Money',
    '/history': 'Transaction History',
    '/settings': 'Settings',
    '/claim': 'Claim Payment',
  };
  
  const currentPage = pageNames[currentRoute] || currentRoute;

  // Collect form fields
  const formFields: Record<string, any> = {};
  document.querySelectorAll('input, textarea, select').forEach((el) => {
    const input = el as HTMLInputElement;
    if (input.name || input.id) {
      formFields[input.name || input.id] = {
        name: input.name || input.id,
        value: input.value,
        isValid: input.validity.valid,
        isFocused: document.activeElement === input,
        errorMessage: input.validationMessage,
      };
    }
  });

  // Detect errors on page
  const errors: string[] = [];
  document.querySelectorAll('[class*="error"], [class*="Error"]').forEach((el) => {
    if (el.textContent) {
      errors.push(el.textContent.trim());
    }
  });

  // Get hover target
  let hoverTarget: string | null = null;
  const hoveredElement = document.querySelector(':hover');
  if (hoveredElement) {
    hoverTarget = hoveredElement.getAttribute('data-assistant-tip') || 
                  hoveredElement.getAttribute('aria-label') ||
                  null;
  }

  return {
    currentPage,
    currentRoute,
    formFields,
    walletConnected: false, // Will be set by app
    balance: null, // Will be set by app
    pendingTransactions: 0, // Will be set by app
    mouseIdleTime: 0, // Set by mouse hook
    lastAction: null,
    hoverTarget,
    errors,
  };
}
```

### 5.2 LLM Hook with Function Calling

```typescript
// hooks/useAssistantAI.ts
import { useCallback, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { UIContext, AssistantMemory, AssistantEmotion } from '../types';

const SYSTEM_PROMPT = `You are Plenny, a friendly and helpful assistant for Plenmo, a modern payment app.

Your personality:
- Warm, encouraging, and playful
- Use casual language but stay professional
- Keep responses SHORT (1-2 sentences max)
- Use emojis sparingly (1 per message max)
- Be proactive but not annoying

Your capabilities:
- Help users send/receive money
- Explain features and answer questions
- Guide through the app
- Celebrate successes
- Help with errors

Current user context will be provided. Use it to give contextual help.

IMPORTANT: Keep responses under 100 characters when possible.`;

const tools = [
  {
    name: 'navigate',
    description: 'Navigate user to a different page',
    parameters: {
      type: 'object',
      properties: {
        page: { type: 'string', enum: ['/', '/send', '/receive', '/history', '/settings'] }
      },
      required: ['page']
    }
  },
  {
    name: 'highlightElement',
    description: 'Highlight a UI element to draw attention',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        message: { type: 'string' }
      },
      required: ['selector']
    }
  },
  {
    name: 'setEmotion',
    description: 'Set your emotional state',
    parameters: {
      type: 'object',
      properties: {
        emotion: { type: 'string', enum: ['happy', 'excited', 'thinking', 'concerned', 'neutral'] }
      },
      required: ['emotion']
    }
  }
];

export function useAssistantAI(
  apiKey: string,
  onNavigate?: (page: string) => void,
  onHighlight?: (selector: string, message?: string) => void,
  onEmotion?: (emotion: AssistantEmotion) => void
) {
  const genAI = useRef(new GoogleGenerativeAI(apiKey));
  const chatRef = useRef<any>(null);

  const initChat = useCallback((context: UIContext, memory: AssistantMemory) => {
    const model = genAI.current.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const contextPrompt = `
Current context:
- Page: ${context.currentPage}
- Wallet: ${context.walletConnected ? 'Connected' : 'Not connected'}
- Balance: ${context.balance || 'Unknown'}
- Active fields: ${Object.keys(context.formFields).join(', ') || 'None'}
- Errors: ${context.errors.join(', ') || 'None'}
- User idle for: ${Math.floor(context.mouseIdleTime / 1000)}s

User memory:
- Name: ${memory.userName || 'Unknown'}
- Preferred topics: ${memory.preferredTopics.join(', ') || 'None'}
- Common actions: ${memory.commonActions.join(', ') || 'None'}
`;

    chatRef.current = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: contextPrompt }]
        },
        {
          role: 'model', 
          parts: [{ text: 'Got it! I understand the context. Ready to help! 😊' }]
        }
      ]
    });
  }, []);

  const sendMessage = useCallback(async (
    message: string,
    context: UIContext,
    memory: AssistantMemory
  ): Promise<{ text: string; emotion: AssistantEmotion }> => {
    if (!chatRef.current) {
      initChat(context, memory);
    }

    // Add context update
    const contextUpdate = `[Context Update: Page=${context.currentPage}, Errors=${context.errors.length}]`;
    
    try {
      const result = await chatRef.current.sendMessage(contextUpdate + '\n\nUser: ' + message);
      const response = result.response.text();
      
      // Determine emotion from response
      let emotion: AssistantEmotion = 'neutral';
      if (response.includes('!') || response.includes('🎉') || response.includes('awesome')) {
        emotion = 'excited';
      } else if (response.includes('?') || response.includes('let me')) {
        emotion = 'thinking';
      } else if (response.includes('sorry') || response.includes('error')) {
        emotion = 'concerned';
      } else if (response.includes('👍') || response.includes('great')) {
        emotion = 'happy';
      }

      return { text: response, emotion };
    } catch (error) {
      console.error('LLM error:', error);
      return { 
        text: "Oops, I'm having trouble thinking. Try again?", 
        emotion: 'concerned' 
      };
    }
  }, [initChat]);

  const getProactiveHelp = useCallback(async (
    context: UIContext,
    memory: AssistantMemory
  ): Promise<{ text: string; emotion: AssistantEmotion } | null> => {
    if (!chatRef.current) {
      initChat(context, memory);
    }

    // Determine if we should offer help
    const shouldHelp = 
      context.errors.length > 0 ||
      context.mouseIdleTime > 10000 ||
      (context.currentPage === 'Send Money' && !context.walletConnected);

    if (!shouldHelp) return null;

    const prompt = `
Based on the current context, should I proactively offer help?
- Errors on page: ${context.errors.length > 0 ? 'Yes' : 'No'}
- User idle: ${Math.floor(context.mouseIdleTime / 1000)}s
- Page: ${context.currentPage}

If yes, give a SHORT helpful message (under 50 chars).
If no, respond with just "NO_HELP".
`;

    try {
      const result = await chatRef.current.sendMessage(prompt);
      const response = result.response.text();
      
      if (response.includes('NO_HELP')) return null;
      
      return { text: response, emotion: 'thinking' };
    } catch {
      return null;
    }
  }, [initChat]);

  return {
    initChat,
    sendMessage,
    getProactiveHelp
  };
}
```

---

## Phase 6: Main Component Assembly (Day 3-4)

### 6.1 Assistant Avatar Component

```typescript
// AssistantAvatar.tsx
'use client';

import { useRef, useEffect } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { motion } from 'framer-motion';
import { useMousePosition } from './hooks/useMousePosition';
import { useAssistantStore } from './store/assistantStore';

const VISEME_MAP: Record<string, number> = {
  'sil': 0, 'PP': 1, 'FF': 2, 'TH': 3, 'DD': 4,
  'kk': 5, 'CH': 6, 'SS': 7, 'nn': 8, 'RR': 9,
  'aa': 10, 'E': 11, 'I': 12, 'O': 13, 'U': 14
};

const STATE_MAP: Record<string, number> = {
  'idle': 0, 'listening': 1, 'thinking': 2, 'speaking': 3,
  'sleeping': 4, 'excited': 5, 'concerned': 6
};

const EMOTION_MAP: Record<string, number> = {
  'neutral': 0, 'happy': 1, 'thinking': 2, 
  'concerned': 3, 'excited': 4, 'sleepy': 5
};

interface AssistantAvatarProps {
  size?: number;
  className?: string;
}

export function AssistantAvatar({ size = 120, className = '' }: AssistantAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, emotion, currentViseme, isMinimized } = useAssistantStore();
  const { normalized, idleTime } = useMousePosition(containerRef, !isMinimized);

  // Rive setup
  const { rive, RiveComponent } = useRive({
    src: '/assets/plenmo-assistant.riv',
    stateMachines: 'MainStateMachine',
    autoplay: true,
  });

  // Rive inputs
  const mouseXInput = useStateMachineInput(rive, 'MainStateMachine', 'mouseX');
  const mouseYInput = useStateMachineInput(rive, 'MainStateMachine', 'mouseY');
  const visemeInput = useStateMachineInput(rive, 'MainStateMachine', 'viseme');
  const stateInput = useStateMachineInput(rive, 'MainStateMachine', 'state');
  const emotionInput = useStateMachineInput(rive, 'MainStateMachine', 'emotion');

  // Update Rive inputs
  useEffect(() => {
    if (mouseXInput) mouseXInput.value = normalized.x;
    if (mouseYInput) mouseYInput.value = normalized.y;
  }, [normalized, mouseXInput, mouseYInput]);

  useEffect(() => {
    if (visemeInput) visemeInput.value = VISEME_MAP[currentViseme] || 0;
  }, [currentViseme, visemeInput]);

  useEffect(() => {
    if (stateInput) stateInput.value = STATE_MAP[state] || 0;
  }, [state, stateInput]);

  useEffect(() => {
    if (emotionInput) emotionInput.value = EMOTION_MAP[emotion] || 0;
  }, [emotion, emotionInput]);

  // Auto-sleep after idle
  useEffect(() => {
    if (idleTime > 30000 && state === 'idle') {
      useAssistantStore.getState().setState('sleeping');
    }
  }, [idleTime, state]);

  return (
    <motion.div
      ref={containerRef}
      className={`assistant-avatar ${className}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.05 }}
      style={{
        width: size,
        height: size,
        filter: 'drop-shadow(0 8px 16px rgba(0, 212, 255, 0.3))',
      }}
    >
      <RiveComponent />
    </motion.div>
  );
}
```

### 6.2 Main Assistant Component

```typescript
// Assistant.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Volume2, VolumeX, Settings } from 'lucide-react';
import { AssistantAvatar } from './AssistantAvatar';
import { AssistantBubble } from './AssistantBubble';
import { useAssistantStore } from './store/assistantStore';
import { useTTS } from './hooks/useTTS';
import { useAssistantAI } from './hooks/useAssistantAI';
import { collectUIContext } from './utils/contextCollector';

interface AssistantProps {
  apiKey: string;
  initialPosition?: { x: number; y: number };
  onNavigate?: (page: string) => void;
}

export function Assistant({ 
  apiKey, 
  initialPosition = { x: 20, y: window.innerHeight - 200 },
  onNavigate 
}: AssistantProps) {
  const {
    isVisible,
    isMinimized,
    state,
    emotion,
    position,
    messages,
    config,
    memory,
    uiContext,
    setVisible,
    setMinimized,
    setState,
    setEmotion,
    setPosition,
    addMessage,
    updateUIContext,
    updateMemory,
  } = useAssistantStore();

  const [inputText, setInputText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showBubble, setShowBubble] = useState(false);

  const { isReady: ttsReady, isSpeaking, speak, stop } = useTTS();
  const { sendMessage, getProactiveHelp } = useAssistantAI(
    apiKey,
    onNavigate,
    undefined,
    setEmotion
  );

  // Update UI context periodically
  useEffect(() => {
    const interval = setInterval(() => {
      updateUIContext(collectUIContext());
    }, 2000);
    return () => clearInterval(interval);
  }, [updateUIContext]);

  // Check for proactive help
  useEffect(() => {
    if (isMinimized || state !== 'idle') return;

    const checkProactive = async () => {
      const help = await getProactiveHelp(uiContext, memory);
      if (help) {
        addMessage({ type: 'assistant', content: help.text, emotion: help.emotion });
        setShowBubble(true);
        setEmotion(help.emotion);
        
        if (config.voiceEnabled && ttsReady) {
          setState('speaking');
          await speak(help.text, {
            voice: config.voiceId,
            speed: config.voiceSpeed,
            onEnd: () => setState('idle'),
          });
        }
      }
    };

    const timeout = setTimeout(checkProactive, 5000);
    return () => clearTimeout(timeout);
  }, [uiContext.mouseIdleTime, uiContext.errors, isMinimized]);

  // Handle user message
  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;

    addMessage({ type: 'user', content: inputText });
    setInputText('');
    setState('thinking');
    setShowBubble(true);

    const response = await sendMessage(inputText, uiContext, memory);
    
    addMessage({ type: 'assistant', content: response.text, emotion: response.emotion });
    setEmotion(response.emotion);

    if (config.voiceEnabled && ttsReady) {
      setState('speaking');
      await speak(response.text, {
        voice: config.voiceId,
        speed: config.voiceSpeed,
        onEnd: () => setState('idle'),
      });
    } else {
      setState('idle');
    }
  }, [inputText, uiContext, memory, config, ttsReady]);

  // Handle drag
  const handleDragEnd = useCallback((event: any, info: any) => {
    setIsDragging(false);
    setPosition({
      x: position.x + info.offset.x,
      y: position.y + info.offset.y,
    });
  }, [position, setPosition]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed z-[9999] select-none"
        style={{ left: position.x, top: position.y }}
        drag={!isMinimized}
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
      >
        {/* Minimized dock */}
        {isMinimized ? (
          <motion.button
            className="clay-button w-14 h-14 rounded-full p-0 flex items-center justify-center"
            onClick={() => setMinimized(false)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        ) : (
          <div className="flex flex-col items-end gap-3">
            {/* Speech bubble */}
            <AnimatePresence>
              {showBubble && messages.length > 0 && (
                <AssistantBubble
                  messages={messages.slice(-3)}
                  onClose={() => setShowBubble(false)}
                  onSend={handleSend}
                  inputValue={inputText}
                  onInputChange={setInputText}
                  isThinking={state === 'thinking'}
                />
              )}
            </AnimatePresence>

            {/* Avatar with controls */}
            <div className="relative">
              {/* Close button */}
              <motion.button
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 z-10"
                onClick={() => setMinimized(true)}
                whileHover={{ scale: 1.1 }}
              >
                <X className="w-4 h-4" />
              </motion.button>

              {/* Avatar */}
              <motion.div
                onClick={() => !isDragging && setShowBubble(!showBubble)}
                className="cursor-pointer"
              >
                <AssistantAvatar size={120} />
              </motion.div>

              {/* Voice toggle */}
              <motion.button
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20"
                onClick={() => {
                  if (isSpeaking) stop();
                  useAssistantStore.getState().updateConfig({ 
                    voiceEnabled: !config.voiceEnabled 
                  });
                }}
                whileHover={{ scale: 1.1 }}
              >
                {config.voiceEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
```

---

## Phase 7: Speech Bubble UI (Day 4)

### 7.1 Claymorphism Speech Bubble

```typescript
// AssistantBubble.tsx
'use client';

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';
import { AssistantMessage } from './types';

interface AssistantBubbleProps {
  messages: AssistantMessage[];
  onClose: () => void;
  onSend: () => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  isThinking: boolean;
}

export function AssistantBubble({
  messages,
  onClose,
  onSend,
  inputValue,
  onInputChange,
  isThinking,
}: AssistantBubbleProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className="clay-card w-72 max-h-80 overflow-hidden flex flex-col"
    >
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-48">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: msg.type === 'user' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                msg.type === 'user'
                  ? 'bg-gradient-to-br from-cyan-400 to-cyan-500 text-white rounded-br-md'
                  : 'bg-white/80 text-gray-800 rounded-bl-md shadow-sm'
              }`}
            >
              {msg.content}
            </div>
          </motion.div>
        ))}

        {/* Thinking indicator */}
        {isThinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white/80 px-4 py-2 rounded-2xl rounded-bl-md shadow-sm flex items-center gap-1">
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                •
              </motion.span>
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
              >
                •
              </motion.span>
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
              >
                •
              </motion.span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200/50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSend();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Ask me anything..."
            className="clay-input flex-1 py-2 px-3 text-sm"
          />
          <motion.button
            type="submit"
            disabled={!inputValue.trim() || isThinking}
            className="clay-button p-2 disabled:opacity-50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isThinking ? (
              <Sparkles className="w-4 h-4 animate-pulse" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
}
```

---

## Phase 8: Learning & Memory (Day 4-5)

### 8.1 Personality Engine

```typescript
// utils/personalityEngine.ts
import { AssistantMemory, UIContext, AssistantEmotion } from '../types';

export class PersonalityEngine {
  private memory: AssistantMemory;

  constructor(memory: AssistantMemory) {
    this.memory = memory;
  }

  // Learn from user actions
  trackAction(action: string, context: UIContext) {
    const commonActions = this.memory.commonActions || [];
    
    if (!commonActions.includes(action)) {
      commonActions.push(action);
      if (commonActions.length > 10) {
        commonActions.shift(); // Keep last 10
      }
    }

    return { ...this.memory, commonActions };
  }

  // Learn from help interactions
  recordHelpInteraction(context: string, helpProvided: string, wasHelpful: boolean) {
    const helpHistory = this.memory.helpHistory || [];
    
    helpHistory.push({
      context,
      helpProvided,
      wasHelpful,
    });

    if (helpHistory.length > 20) {
      helpHistory.shift(); // Keep last 20
    }

    return { ...this.memory, helpHistory };
  }

  // Determine appropriate emotion based on context
  suggestEmotion(context: UIContext): AssistantEmotion {
    // Error state
    if (context.errors.length > 0) {
      return 'concerned';
    }

    // Success indicators
    if (context.currentPage === 'Transaction History' && context.pendingTransactions === 0) {
      return 'happy';
    }

    // User struggling (long idle on form)
    if (context.mouseIdleTime > 15000 && Object.keys(context.formFields).length > 0) {
      return 'thinking';
    }

    // Long idle, maybe sleepy
    if (context.mouseIdleTime > 60000) {
      return 'sleepy';
    }

    return 'neutral';
  }

  // Determine if should proactively help
  shouldOfferHelp(context: UIContext): { should: boolean; reason?: string } {
    // Errors on page
    if (context.errors.length > 0) {
      return { should: true, reason: 'error' };
    }

    // User stuck on send page without wallet
    if (context.currentPage === 'Send Money' && !context.walletConnected) {
      return { should: true, reason: 'wallet_required' };
    }

    // Long idle on a form
    if (context.mouseIdleTime > 20000 && Object.keys(context.formFields).length > 0) {
      return { should: true, reason: 'idle_on_form' };
    }

    // First time on certain pages
    if (!this.memory.commonActions?.includes(`visited_${context.currentPage}`)) {
      return { should: true, reason: 'first_visit' };
    }

    return { should: false };
  }

  // Get personalized greeting
  getGreeting(context: UIContext): string {
    const hour = new Date().getHours();
    const name = this.memory.userName || '';
    
    let greeting = '';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';
    else greeting = 'Good evening';

    if (name) greeting += `, ${name}`;
    greeting += '! ';

    // Add contextual message
    if (context.currentPage === 'Send Money') {
      greeting += "Ready to send some money? 💸";
    } else if (context.currentPage === 'Home') {
      greeting += "What can I help you with? ✨";
    }

    return greeting;
  }
}
```

---

## Phase 9: Provider & Integration (Day 5)

### 9.1 Assistant Provider

```typescript
// AssistantProvider.tsx
'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { Assistant } from './Assistant';
import { useAssistantStore } from './store/assistantStore';

interface AssistantContextValue {
  show: () => void;
  hide: () => void;
  minimize: () => void;
  speak: (text: string) => void;
  setEmotion: (emotion: string) => void;
  updateContext: (context: Partial<any>) => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

interface AssistantProviderProps {
  children: ReactNode;
  apiKey: string;
  enabled?: boolean;
  onNavigate?: (page: string) => void;
}

export function AssistantProvider({ 
  children, 
  apiKey, 
  enabled = true,
  onNavigate 
}: AssistantProviderProps) {
  const store = useAssistantStore();

  const contextValue: AssistantContextValue = {
    show: () => store.setVisible(true),
    hide: () => store.setVisible(false),
    minimize: () => store.setMinimized(true),
    speak: (text: string) => store.speak(text),
    setEmotion: (emotion: string) => store.setEmotion(emotion as any),
    updateContext: (context) => store.updateUIContext(context),
  };

  return (
    <AssistantContext.Provider value={contextValue}>
      {children}
      {enabled && <Assistant apiKey={apiKey} onNavigate={onNavigate} />}
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
```

### 9.2 Integration in Plenmo App

```typescript
// In apps/plasma-venmo/src/app/layout.tsx
import { AssistantProvider } from '@plasma-pay/ui';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AssistantProvider 
          apiKey={process.env.NEXT_PUBLIC_GEMINI_API_KEY!}
          onNavigate={(page) => router.push(page)}
        >
          {children}
        </AssistantProvider>
      </body>
    </html>
  );
}

// Usage in any component
import { useAssistant } from '@plasma-pay/ui';

function SendMoneyForm() {
  const { speak, setEmotion, updateContext } = useAssistant();

  const handleSuccess = () => {
    setEmotion('excited');
    speak('Yay! Payment sent successfully! 🎉');
  };

  const handleError = (error: string) => {
    setEmotion('concerned');
    speak('Oops, something went wrong. Let me help!');
  };

  // Update context when wallet changes
  useEffect(() => {
    updateContext({
      walletConnected: !!wallet,
      balance: wallet?.balance,
    });
  }, [wallet]);
}
```

---

## Phase 10: Polish & Testing (Day 5-6)

### 10.1 CSS Additions for Assistant

```css
/* Add to globals.css or assistant.css */

/* Assistant-specific claymorphism */
.assistant-avatar {
  border-radius: 50%;
  background: linear-gradient(
    145deg,
    rgba(0, 212, 255, 0.1) 0%,
    rgba(168, 85, 247, 0.1) 100%
  );
  box-shadow:
    0 8px 32px rgba(0, 212, 255, 0.3),
    0 4px 16px rgba(168, 85, 247, 0.2),
    inset 0 0 20px rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.assistant-avatar:hover {
  box-shadow:
    0 12px 40px rgba(0, 212, 255, 0.4),
    0 6px 20px rgba(168, 85, 247, 0.3),
    inset 0 0 30px rgba(255, 255, 255, 0.15);
}

/* Glow effect for speaking state */
.assistant-avatar.speaking {
  animation: assistant-glow 1.5s ease-in-out infinite;
}

@keyframes assistant-glow {
  0%, 100% {
    box-shadow:
      0 8px 32px rgba(0, 212, 255, 0.3),
      0 4px 16px rgba(168, 85, 247, 0.2);
  }
  50% {
    box-shadow:
      0 12px 48px rgba(0, 212, 255, 0.5),
      0 6px 24px rgba(168, 85, 247, 0.4);
  }
}

/* Floating animation */
.assistant-float {
  animation: assistant-float 3s ease-in-out infinite;
}

@keyframes assistant-float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}
```

### 10.2 Accessibility

- Add ARIA labels for screen readers
- Keyboard navigation support
- Respect `prefers-reduced-motion`
- High contrast mode support

### 10.3 Performance

- Lazy load Rive runtime
- Lazy load TTS (WebGPU model is large)
- Debounce context collection
- Throttle mouse tracking updates

---

## Summary: Files to Create

1. `packages/ui/src/components/Assistant/index.ts`
2. `packages/ui/src/components/Assistant/types.ts`
3. `packages/ui/src/components/Assistant/constants.ts`
4. `packages/ui/src/components/Assistant/store/assistantStore.ts`
5. `packages/ui/src/components/Assistant/hooks/useMousePosition.ts`
6. `packages/ui/src/components/Assistant/hooks/useTTS.ts`
7. `packages/ui/src/components/Assistant/hooks/useAssistantAI.ts`
8. `packages/ui/src/components/Assistant/hooks/useLipSync.ts`
9. `packages/ui/src/components/Assistant/utils/contextCollector.ts`
10. `packages/ui/src/components/Assistant/utils/personalityEngine.ts`
11. `packages/ui/src/components/Assistant/AssistantAvatar.tsx`
12. `packages/ui/src/components/Assistant/AssistantBubble.tsx`
13. `packages/ui/src/components/Assistant/AssistantDock.tsx`
14. `packages/ui/src/components/Assistant/Assistant.tsx`
15. `packages/ui/src/components/Assistant/AssistantProvider.tsx`
16. `packages/ui/public/assets/plenmo-assistant.riv` (Rive file)

---

## Dependencies to Install

```bash
npm install @rive-app/react-canvas zustand framer-motion @google/generative-ai wawa-lipsync @met4citizen/headtts
```

---

## Timeline

| Day | Tasks |
|-----|-------|
| 1 | Package setup, types, store, basic structure |
| 2 | Mouse tracking, Rive integration, avatar component |
| 3 | TTS integration, LLM hook, context collection |
| 4 | Main component assembly, speech bubble, drag/dock |
| 5 | Learning system, provider, app integration |
| 6 | Polish, testing, accessibility, performance |

---

Ready to start building! 🚀
