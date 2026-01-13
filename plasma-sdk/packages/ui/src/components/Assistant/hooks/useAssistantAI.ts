import { useCallback, useRef, useState } from 'react';
import type { UIContext, AssistantMemory, AssistantEmotion } from '../types';
import { SYSTEM_PROMPT } from '../constants';
import { formatContextForLLM } from '../utils/contextCollector';

interface AIResponse {
  text: string;
  emotion: AssistantEmotion;
}

// Fallback responses when API is not available
const FALLBACK_RESPONSES: Record<string, AIResponse> = {
  greeting: { text: "Hi there! I'm Plenny, your payment buddy! 👋", emotion: 'happy' },
  help: { text: "I'm here to help! What do you need?", emotion: 'neutral' },
  error: { text: "Oops! Something went wrong. Try again?", emotion: 'concerned' },
  success: { text: 'Awesome! That worked perfectly! 🎉', emotion: 'excited' },
  wallet: { text: 'Connect your wallet to get started!', emotion: 'thinking' },
  idle: { text: 'Still there? Let me know if you need help!', emotion: 'thinking' },
};

export function useAssistantAI(
  apiKey?: string,
  onNavigate?: (page: string) => void,
  onHighlight?: (selector: string, message?: string) => void,
  onEmotionChange?: (emotion: AssistantEmotion) => void
) {
  const [isLoading, setIsLoading] = useState(false);
  const chatHistoryRef = useRef<Array<{ role: string; content: string }>>([]);
  const genAIRef = useRef<any>(null);

  // Initialize Gemini (lazy load)
  const initGenAI = useCallback(async () => {
    if (!apiKey || genAIRef.current) return;

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      genAIRef.current = new GoogleGenerativeAI(apiKey);
    } catch (error) {
      console.warn('Failed to initialize Gemini:', error);
    }
  }, [apiKey]);

  // Determine emotion from response text
  const detectEmotion = (text: string): AssistantEmotion => {
    const lower = text.toLowerCase();
    if (lower.includes('!') || lower.includes('🎉') || lower.includes('awesome') || lower.includes('great')) {
      return 'excited';
    }
    if (lower.includes('?') || lower.includes('let me') || lower.includes('thinking')) {
      return 'thinking';
    }
    if (lower.includes('sorry') || lower.includes('error') || lower.includes('oops')) {
      return 'concerned';
    }
    if (lower.includes('👍') || lower.includes('nice') || lower.includes('good')) {
      return 'happy';
    }
    return 'neutral';
  };

  // Send message to LLM
  const sendMessage = useCallback(
    async (
      message: string,
      context: UIContext,
      memory: AssistantMemory
    ): Promise<AIResponse> => {
      await initGenAI();

      // If no API key or genAI failed, use fallback
      if (!genAIRef.current) {
        // Simple keyword matching for fallback
        const lower = message.toLowerCase();
        if (lower.includes('hello') || lower.includes('hi')) {
          return FALLBACK_RESPONSES.greeting;
        }
        if (lower.includes('help')) {
          return FALLBACK_RESPONSES.help;
        }
        if (lower.includes('wallet') || lower.includes('connect')) {
          return FALLBACK_RESPONSES.wallet;
        }
        return FALLBACK_RESPONSES.help;
      }

      setIsLoading(true);

      try {
        const model = genAIRef.current.getGenerativeModel({
          model: 'gemini-1.5-flash',
        });

        // Build context message
        const contextStr = formatContextForLLM(context);
        const userInfo = memory.userName ? `User's name: ${memory.userName}` : '';

        // Create prompt
        const prompt = `${SYSTEM_PROMPT}

Current Context:
${contextStr}
${userInfo}

User message: ${message}

Respond briefly (under 100 characters if possible):`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // Clean up response
        const cleanResponse = response.trim().replace(/^["']|["']$/g, '');
        const emotion = detectEmotion(cleanResponse);

        // Update chat history
        chatHistoryRef.current.push(
          { role: 'user', content: message },
          { role: 'assistant', content: cleanResponse }
        );

        // Keep history manageable
        if (chatHistoryRef.current.length > 20) {
          chatHistoryRef.current = chatHistoryRef.current.slice(-20);
        }

        onEmotionChange?.(emotion);

        return { text: cleanResponse, emotion };
      } catch (error) {
        console.error('LLM error:', error);
        return FALLBACK_RESPONSES.error;
      } finally {
        setIsLoading(false);
      }
    },
    [initGenAI, onEmotionChange]
  );

  // Get proactive help suggestion
  const getProactiveHelp = useCallback(
    async (
      context: UIContext,
      memory: AssistantMemory,
      reason: string
    ): Promise<AIResponse | null> => {
      await initGenAI();

      // Fallback responses based on reason
      if (!genAIRef.current) {
        switch (reason) {
          case 'error':
            return { text: 'I see an error. Need help fixing it?', emotion: 'concerned' };
          case 'wallet_required':
            return FALLBACK_RESPONSES.wallet;
          case 'idle_on_form':
            return FALLBACK_RESPONSES.idle;
          case 'first_visit':
            return FALLBACK_RESPONSES.greeting;
          default:
            return null;
        }
      }

      try {
        const model = genAIRef.current.getGenerativeModel({
          model: 'gemini-1.5-flash',
        });

        const contextStr = formatContextForLLM(context);

        const prompt = `${SYSTEM_PROMPT}

Current Context:
${contextStr}

Reason for checking: ${reason}

Should you proactively offer help? If yes, give a SHORT helpful message (under 50 characters).
If the user seems fine, respond with just "NO_HELP".`;

        const result = await model.generateContent(prompt);
        const response = result.response.text().trim();

        if (response === 'NO_HELP' || response.includes('NO_HELP')) {
          return null;
        }

        const emotion = detectEmotion(response);
        return { text: response, emotion };
      } catch (error) {
        console.error('Proactive help error:', error);
        return null;
      }
    },
    [initGenAI]
  );

  // Get quick suggestion based on context
  const getQuickSuggestion = useCallback(
    (context: UIContext): string[] => {
      const suggestions: string[] = [];

      if (!context.walletConnected) {
        suggestions.push('How do I connect my wallet?');
      }

      if (context.currentPage === 'Send Money') {
        suggestions.push('How do I send money?');
        suggestions.push('What are the fees?');
      }

      if (context.currentPage === 'Receive Money') {
        suggestions.push('How do I share my link?');
      }

      if (context.errors.length > 0) {
        suggestions.push('Why am I seeing this error?');
      }

      // Default suggestions
      if (suggestions.length === 0) {
        suggestions.push('What can you help me with?');
        suggestions.push('Show me around');
      }

      return suggestions.slice(0, 3);
    },
    []
  );

  return {
    isLoading,
    sendMessage,
    getProactiveHelp,
    getQuickSuggestion,
  };
}
