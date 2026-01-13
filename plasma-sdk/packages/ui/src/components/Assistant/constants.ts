import type { AssistantConfig, AssistantMemory, UIContext } from './types';

export const DEFAULT_CONFIG: AssistantConfig = {
  personality: 'friendly',
  proactivity: 'moderate',
  voiceEnabled: true,
  voiceId: 'af_bella',
  voiceSpeed: 1,
};

export const DEFAULT_MEMORY: AssistantMemory = {
  userName: undefined,
  preferredTopics: [],
  commonActions: [],
  helpHistory: [],
  lastInteraction: Date.now(),
};

export const DEFAULT_UI_CONTEXT: UIContext = {
  currentPage: 'Home',
  currentRoute: '/',
  formFields: {},
  walletConnected: false,
  balance: null,
  pendingTransactions: 0,
  mouseIdleTime: 0,
  lastAction: null,
  hoverTarget: null,
  errors: [],
};

// Viseme mapping for Oculus/Ready Player Me standard
export const VISEME_MAP: Record<string, number> = {
  sil: 0,
  PP: 1,
  FF: 2,
  TH: 3,
  DD: 4,
  kk: 5,
  CH: 6,
  SS: 7,
  nn: 8,
  RR: 9,
  aa: 10,
  E: 11,
  I: 12,
  O: 13,
  U: 14,
};

// State machine state mapping
export const STATE_MAP: Record<string, number> = {
  idle: 0,
  listening: 1,
  thinking: 2,
  speaking: 3,
  sleeping: 4,
  excited: 5,
  concerned: 6,
};

// Emotion mapping
export const EMOTION_MAP: Record<string, number> = {
  neutral: 0,
  happy: 1,
  thinking: 2,
  concerned: 3,
  excited: 4,
  sleepy: 5,
};

// Timing constants
export const IDLE_TIMEOUT_MS = 30000; // Go to sleep after 30s
export const PROACTIVE_CHECK_INTERVAL_MS = 5000;
export const CONTEXT_UPDATE_INTERVAL_MS = 2000;
export const MOUSE_IDLE_HELP_THRESHOLD_MS = 15000;

// Page name mappings
export const PAGE_NAMES: Record<string, string> = {
  '/': 'Home',
  '/send': 'Send Money',
  '/receive': 'Receive Money',
  '/history': 'Transaction History',
  '/settings': 'Settings',
  '/claim': 'Claim Payment',
  '/profile': 'Profile',
};

// System prompt for the LLM
export const SYSTEM_PROMPT = `You are Plenny, a friendly and helpful assistant for Plenmo, a modern payment app.

Your personality:
- Warm, encouraging, and playful
- Use casual language but stay professional
- Keep responses SHORT (1-2 sentences max, under 100 characters preferred)
- Use emojis sparingly (max 1 per message)
- Be proactive but not annoying
- Celebrate user successes

Your capabilities:
- Help users send/receive money
- Explain features and answer questions
- Guide through the app
- Celebrate successes with excitement
- Help troubleshoot errors with empathy

IMPORTANT RULES:
1. Keep responses under 100 characters when possible
2. Never share sensitive information
3. If unsure, admit it and offer to help another way
4. Match the user's energy level`;
