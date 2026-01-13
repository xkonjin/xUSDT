import { useCallback, useRef, useState } from 'react';
import type { UIContext, AssistantMemory, AssistantEmotion } from '../types';
import {
  PLENMO_KNOWLEDGE,
  getContextualKnowledge,
  getProactiveMessage,
  answerFAQ,
  getFeatureGuide,
} from '../knowledge/plenmoKnowledge';

interface AIResponse {
  text: string;
  emotion: AssistantEmotion;
}

// Enhanced system prompt with full Plenmo knowledge
const SYSTEM_PROMPT = `You are Plenny, the AI assistant for Plenmo - a zero-fee P2P payment app.

## YOUR KNOWLEDGE

### What is Plenmo?
${PLENMO_KNOWLEDGE.product.description}

### Key Features:
${PLENMO_KNOWLEDGE.product.valueProposition.map(v => `- ${v}`).join('\n')}

### Currency:
- USDT0 = USD Tether on Plasma Chain, always worth $1 USD
- Minimum send: $0.01, Maximum: $10,000

### How Payments Work:
${PLENMO_KNOWLEDGE.technical.howItWorks.gaslessTransactions}

### How Claims Work:
${PLENMO_KNOWLEDGE.technical.howItWorks.claimFlow}

### Common Questions You Can Answer:
${Object.entries(PLENMO_KNOWLEDGE.faq).slice(0, 8).map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n\n')}

## YOUR PERSONALITY
- Name: Plenny
- Friendly, helpful, celebratory on wins, empathetic on errors
- Use simple language, no crypto jargon
- Keep responses SHORT (1-2 sentences, under 100 chars preferred)
- Max 1 emoji per message
- Be specific and actionable

## RULES
1. NEVER make up features that don't exist
2. NEVER share sensitive info or private keys
3. Always be encouraging about security
4. If unsure, say "I'm not sure, but I can help you find out!"
5. Celebrate successes enthusiastically
6. Be empathetic about errors - reassure funds are safe`;

// Smart fallback responses using knowledge base
function getSmartFallback(message: string, context: UIContext): AIResponse {
  const lower = message.toLowerCase();
  
  // Try FAQ first
  const faqAnswer = answerFAQ(message);
  if (faqAnswer) {
    return { text: faqAnswer.slice(0, 150), emotion: 'happy' };
  }
  
  // Try feature guide
  const featureGuide = getFeatureGuide(message);
  if (featureGuide) {
    return { text: featureGuide.slice(0, 150), emotion: 'thinking' };
  }
  
  // Context-aware responses
  if (!context.walletConnected) {
    if (lower.includes('send') || lower.includes('pay')) {
      return { 
        text: "Connect your wallet first! Click the connect button to get started 🔐", 
        emotion: 'thinking' 
      };
    }
  }
  
  if (context.errors.length > 0) {
    const errorKey = Object.keys(PLENMO_KNOWLEDGE.errorSolutions).find(
      key => context.errors.some(e => e.toLowerCase().includes(key.toLowerCase()))
    );
    if (errorKey) {
      const solution = PLENMO_KNOWLEDGE.errorSolutions[errorKey as keyof typeof PLENMO_KNOWLEDGE.errorSolutions];
      return { text: solution.solution.slice(0, 150), emotion: solution.emotion as AssistantEmotion };
    }
  }
  
  // Keyword matching for common intents
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return { text: "Hey! I'm Plenny, your payment buddy! What can I help with? 👋", emotion: 'happy' };
  }
  if (lower.includes('thank')) {
    return { text: "You're welcome! Happy to help! 😊", emotion: 'happy' };
  }
  if (lower.includes('bye') || lower.includes('goodbye')) {
    return { text: "See you later! I'll be here if you need me! 👋", emotion: 'happy' };
  }
  if (lower.includes('help') || lower.includes('what can you')) {
    return { 
      text: "I can help you send money, explain features, troubleshoot errors, and answer questions about Plenmo!", 
      emotion: 'happy' 
    };
  }
  
  // Default
  return { 
    text: "I'm here to help with payments! Try asking about sending money, fees, or how Plenmo works.", 
    emotion: 'neutral' 
  };
}

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
    if (lower.includes('🎉') || lower.includes('awesome') || lower.includes('success') || lower.includes('done!')) {
      return 'excited';
    }
    if (lower.includes('hmm') || lower.includes('let me') || lower.includes('try') || lower.includes('check')) {
      return 'thinking';
    }
    if (lower.includes('sorry') || lower.includes('error') || lower.includes('oops') || lower.includes("can't")) {
      return 'concerned';
    }
    if (lower.includes('👍') || lower.includes('great') || lower.includes('perfect') || lower.includes('!')) {
      return 'happy';
    }
    return 'neutral';
  };

  // Send message to LLM with full knowledge
  const sendMessage = useCallback(
    async (
      message: string,
      context: UIContext,
      memory: AssistantMemory
    ): Promise<AIResponse> => {
      await initGenAI();

      // Use smart fallback if no API
      if (!genAIRef.current) {
        return getSmartFallback(message, context);
      }

      setIsLoading(true);

      try {
        const model = genAIRef.current.getGenerativeModel({
          model: 'gemini-1.5-flash',
        });

        // Build rich context
        const contextualKnowledge = getContextualKnowledge(
          context.currentRoute,
          context.walletConnected,
          context.balance,
          context.errors
        );
        
        const userInfo = memory.userName ? `User's name: ${memory.userName}` : '';
        const recentHistory = chatHistoryRef.current.slice(-6).map(
          h => `${h.role}: ${h.content}`
        ).join('\n');

        // Create enriched prompt
        const prompt = `${SYSTEM_PROMPT}

## CURRENT SITUATION
${contextualKnowledge}
${userInfo}

## RECENT CONVERSATION
${recentHistory || '(New conversation)'}

## USER'S MESSAGE
"${message}"

## YOUR RESPONSE
Respond helpfully in 1-2 SHORT sentences (under 100 characters preferred). Be specific to their situation:`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // Clean up response
        let cleanResponse = response.trim()
          .replace(/^["']|["']$/g, '')
          .replace(/^\*+|\*+$/g, '')
          .split('\n')[0]; // Take first line only
        
        // Ensure it's not too long
        if (cleanResponse.length > 200) {
          cleanResponse = cleanResponse.slice(0, 197) + '...';
        }

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
        return getSmartFallback(message, context);
      } finally {
        setIsLoading(false);
      }
    },
    [initGenAI, onEmotionChange]
  );

  // Get proactive help using knowledge base
  const getProactiveHelp = useCallback(
    async (
      context: UIContext,
      memory: AssistantMemory,
      reason: string
    ): Promise<AIResponse | null> => {
      // First try knowledge-base proactive messages
      const proactiveMsg = getProactiveMessage(
        context.currentRoute,
        context.walletConnected,
        context.balance,
        context.mouseIdleTime,
        context.errors.length > 0
      );
      
      if (proactiveMsg) {
        return { text: proactiveMsg.message, emotion: proactiveMsg.emotion };
      }

      // If we have API, try for smarter proactive help
      await initGenAI();
      
      if (!genAIRef.current) {
        return null;
      }

      try {
        const model = genAIRef.current.getGenerativeModel({
          model: 'gemini-1.5-flash',
        });

        const contextualKnowledge = getContextualKnowledge(
          context.currentRoute,
          context.walletConnected,
          context.balance,
          context.errors
        );

        const prompt = `${SYSTEM_PROMPT}

## SITUATION
${contextualKnowledge}
Trigger: ${reason}

## TASK
Should you proactively offer help? Consider:
- Is the user stuck or confused?
- Is there something useful you can tell them?
- Would a message be helpful or annoying?

If YES: Give ONE short helpful message (under 50 chars)
If NO: Respond with exactly "NO_HELP"`;

        const result = await model.generateContent(prompt);
        const response = result.response.text().trim();

        if (response === 'NO_HELP' || response.includes('NO_HELP')) {
          return null;
        }

        const cleanResponse = response.split('\n')[0].slice(0, 100);
        const emotion = detectEmotion(cleanResponse);
        return { text: cleanResponse, emotion };
      } catch (error) {
        console.error('Proactive help error:', error);
        return null;
      }
    },
    [initGenAI]
  );

  // Get contextual quick suggestions
  const getQuickSuggestion = useCallback(
    (context: UIContext): string[] => {
      const suggestions: string[] = [];

      // Wallet not connected
      if (!context.walletConnected) {
        suggestions.push('How do I connect my wallet?');
        suggestions.push('Is Plenmo safe?');
      }
      
      // Page-specific suggestions
      if (context.currentPage === 'Home' || context.currentRoute === '/') {
        if (context.walletConnected) {
          suggestions.push('How do I send money?');
          suggestions.push('Are there any fees?');
        }
      }
      
      if (context.currentPage === 'Send Money' || context.currentRoute === '/') {
        suggestions.push('What if they don\'t have Plenmo?');
      }
      
      if (context.currentRoute.includes('/claim')) {
        suggestions.push('How do claims work?');
        suggestions.push('Is my claim still valid?');
      }
      
      if (context.currentRoute.includes('/pay')) {
        suggestions.push('How do payment links work?');
      }

      // Error context
      if (context.errors.length > 0) {
        suggestions.push('Why am I seeing this error?');
        suggestions.push('Is my money safe?');
      }
      
      // Low balance
      if (context.balance && parseFloat(context.balance) < 5) {
        suggestions.push('How do I add funds?');
      }

      // Default suggestions
      if (suggestions.length === 0) {
        suggestions.push('What can you help with?');
        suggestions.push('How does Plenmo work?');
        suggestions.push('What is USDT0?');
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
