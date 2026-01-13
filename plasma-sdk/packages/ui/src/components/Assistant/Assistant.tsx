'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Volume2, VolumeX } from 'lucide-react';
import { AssistantAvatar } from './AssistantAvatar';
import { AssistantBubble } from './AssistantBubble';
import { useAssistantStore } from './store/assistantStore';
import { useSpeech } from './hooks/useSpeech';
import { useAssistantAI } from './hooks/useAssistantAI';
import { collectUIContext } from './utils/contextCollector';
import { PersonalityEngine } from './utils/personalityEngine';
import {
  CONTEXT_UPDATE_INTERVAL_MS,
  PROACTIVE_CHECK_INTERVAL_MS,
} from './constants';

interface AssistantProps {
  apiKey?: string;
  onNavigate?: (page: string) => void;
}

export function Assistant({ apiKey, onNavigate }: AssistantProps) {
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
    setCurrentViseme,
    addMessage,
    updateUIContext,
    updateMemory,
    wakeUp,
  } = useAssistantStore();

  const [inputText, setInputText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const personalityRef = useRef(new PersonalityEngine(memory));
  const lastProactiveCheckRef = useRef(0);

  const { isReady: speechReady, isSpeaking, speak, stop } = useSpeech();
  const { isLoading, sendMessage, getProactiveHelp, getQuickSuggestion } = useAssistantAI(
    apiKey,
    onNavigate,
    undefined,
    setEmotion
  );

  // Update personality engine when memory changes
  useEffect(() => {
    personalityRef.current.updateMemory(memory);
  }, [memory]);

  // Update UI context periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const context = collectUIContext();
      updateUIContext(context);
    }, CONTEXT_UPDATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [updateUIContext]);

  // Update suggestions when context changes
  useEffect(() => {
    const newSuggestions = getQuickSuggestion(uiContext);
    setSuggestions(newSuggestions);
  }, [uiContext.currentPage, uiContext.walletConnected, getQuickSuggestion]);

  // Check for proactive help
  useEffect(() => {
    if (isMinimized || state !== 'idle' || isLoading) return;

    const checkProactive = async () => {
      const now = Date.now();
      if (now - lastProactiveCheckRef.current < PROACTIVE_CHECK_INTERVAL_MS) {
        return;
      }
      lastProactiveCheckRef.current = now;

      const { should, reason } = personalityRef.current.shouldOfferHelp(uiContext);
      if (!should || !reason) return;

      const help = await getProactiveHelp(uiContext, memory, reason);
      if (help) {
        addMessage({ type: 'assistant', content: help.text, emotion: help.emotion });
        setShowBubble(true);
        setEmotion(help.emotion);

        // Track this as an action
        const memoryUpdate = personalityRef.current.trackAction(`proactive_${reason}`);
        updateMemory(memoryUpdate);

        if (config.voiceEnabled && speechReady) {
          setState('speaking');
          await speak(help.text, {
            rate: config.voiceSpeed,
            onViseme: setCurrentViseme,
            onEnd: () => setState('idle'),
          });
        }
      }
    };

    const timeout = setTimeout(checkProactive, 3000);
    return () => clearTimeout(timeout);
  }, [
    uiContext.mouseIdleTime,
    uiContext.errors.length,
    uiContext.currentPage,
    isMinimized,
    state,
    isLoading,
  ]);

  // Handle user message
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    // Wake up if sleeping
    wakeUp();

    addMessage({ type: 'user', content: inputText });
    setInputText('');
    setState('thinking');
    setShowBubble(true);

    const response = await sendMessage(inputText, uiContext, memory);

    addMessage({ type: 'assistant', content: response.text, emotion: response.emotion });
    setEmotion(response.emotion);

    // Track interaction
    const memoryUpdate = personalityRef.current.trackAction('chat');
    updateMemory(memoryUpdate);

    if (config.voiceEnabled && speechReady) {
      setState('speaking');
      await speak(response.text, {
        rate: config.voiceSpeed,
        onViseme: setCurrentViseme,
        onEnd: () => setState('idle'),
      });
    } else {
      setState('idle');
    }
  }, [
    inputText,
    isLoading,
    uiContext,
    memory,
    config.voiceEnabled,
    config.voiceSpeed,
    speechReady,
  ]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInputText(suggestion);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: any, info: any) => {
      setIsDragging(false);
      const newX = Math.max(0, Math.min(position.x + info.offset.x, window.innerWidth - 150));
      const newY = Math.max(0, Math.min(position.y + info.offset.y, window.innerHeight - 150));
      setPosition({ x: newX, y: newY });
    },
    [position, setPosition]
  );

  // Handle avatar click
  const handleAvatarClick = useCallback(() => {
    if (isDragging) return;
    wakeUp();
    setShowBubble(!showBubble);
  }, [isDragging, showBubble, wakeUp]);

  // Toggle voice
  const toggleVoice = useCallback(() => {
    if (isSpeaking) stop();
    useAssistantStore.getState().updateConfig({
      voiceEnabled: !config.voiceEnabled,
    });
  }, [isSpeaking, stop, config.voiceEnabled]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed z-[9999] select-none"
        style={{ left: position.x, bottom: 20 }}
        drag={!isMinimized}
        dragMomentum={false}
        dragElastic={0.1}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
      >
        {/* Minimized dock */}
        {isMinimized ? (
          <motion.button
            className="w-14 h-14 rounded-full p-0 flex items-center justify-center cursor-pointer"
            onClick={() => setMinimized(false)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: 'linear-gradient(145deg, #00D4FF 0%, #A855F7 100%)',
              boxShadow: '6px 6px 16px rgba(0, 212, 255, 0.35), -4px -4px 12px rgba(255, 255, 255, 0.6)',
            }}
          >
            <MessageCircle className="w-6 h-6 text-white" />
          </motion.button>
        ) : (
          <div className="flex flex-col items-end gap-3">
            {/* Speech bubble */}
            <AnimatePresence>
              {showBubble && (
                <AssistantBubble
                  messages={messages.slice(-5)}
                  onClose={() => setShowBubble(false)}
                  onSend={handleSend}
                  inputValue={inputText}
                  onInputChange={setInputText}
                  isThinking={state === 'thinking' || isLoading}
                  suggestions={messages.length === 0 ? suggestions : []}
                  onSuggestionClick={handleSuggestionClick}
                />
              )}
            </AnimatePresence>

            {/* Avatar with controls */}
            <div className="relative">
              {/* Minimize button */}
              <motion.button
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white z-10 shadow-md"
                onClick={() => setMinimized(true)}
                whileHover={{ scale: 1.1 }}
              >
                <X className="w-4 h-4" />
              </motion.button>

              {/* Avatar */}
              <motion.div
                onClick={handleAvatarClick}
                className="cursor-pointer"
                whileTap={{ scale: 0.95 }}
              >
                <AssistantAvatar size={120} />
              </motion.div>

              {/* Voice toggle */}
              <motion.button
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-white shadow-md"
                onClick={toggleVoice}
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
