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

export interface AssistantPosition {
  x: number;
  y: number;
}

export interface AssistantMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  emotion?: AssistantEmotion;
}

export interface FormFieldState {
  name: string;
  value: string;
  isValid: boolean;
  isFocused: boolean;
  errorMessage?: string;
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

export interface AssistantConfig {
  personality: 'friendly' | 'professional' | 'playful';
  proactivity: 'shy' | 'moderate' | 'chatty';
  voiceEnabled: boolean;
  voiceId: string;
  voiceSpeed: number;
}

export interface HelpInteraction {
  context: string;
  helpProvided: string;
  wasHelpful: boolean;
  timestamp: number;
}

export interface AssistantMemory {
  userName?: string;
  preferredTopics: string[];
  commonActions: string[];
  helpHistory: HelpInteraction[];
  lastInteraction: number;
}

export interface AssistantProviderProps {
  children: React.ReactNode;
  apiKey?: string;
  enabled?: boolean;
  onNavigate?: (page: string) => void;
}
