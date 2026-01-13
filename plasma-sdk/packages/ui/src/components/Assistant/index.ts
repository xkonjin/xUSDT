// Main components
export { Assistant } from './Assistant';
export { AssistantProvider, useAssistant, useAssistantReaction } from './AssistantProvider';
export { AssistantAvatar } from './AssistantAvatar';
export { AssistantBubble } from './AssistantBubble';

// Store
export { useAssistantStore } from './store/assistantStore';

// Hooks
export { useMousePosition } from './hooks/useMousePosition';
export { useSpeech } from './hooks/useSpeech';
export { useAssistantAI } from './hooks/useAssistantAI';

// Utils
export { collectUIContext, formatContextForLLM } from './utils/contextCollector';
export { PersonalityEngine } from './utils/personalityEngine';

// Types
export type {
  AssistantState,
  AssistantEmotion,
  AssistantPosition,
  AssistantMessage,
  AssistantConfig,
  AssistantMemory,
  UIContext,
  FormFieldState,
  HelpInteraction,
  AssistantProviderProps,
} from './types';

// Constants
export {
  DEFAULT_CONFIG,
  DEFAULT_MEMORY,
  DEFAULT_UI_CONTEXT,
  VISEME_MAP,
  STATE_MAP,
  EMOTION_MAP,
  PAGE_NAMES,
  SYSTEM_PROMPT,
} from './constants';
