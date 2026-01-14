'use client';

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles, X } from 'lucide-react';
import type { AssistantMessage } from './types';

interface AssistantBubbleProps {
  messages: AssistantMessage[];
  onClose: () => void;
  onSend: () => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  isThinking: boolean;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
}

export function AssistantBubble({
  messages,
  onClose,
  onSend,
  inputValue,
  onInputChange,
  isThinking,
  suggestions = [],
  onSuggestionClick,
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
      className="w-72 max-h-96 overflow-hidden flex flex-col rounded-3xl"
      style={{
        background: 'linear-gradient(145deg, rgba(26, 26, 46, 0.98) 0%, rgba(22, 22, 42, 0.98) 100%)',
        boxShadow: `
          12px 12px 24px rgba(0, 0, 0, 0.4),
          -8px -8px 20px rgba(255, 255, 255, 0.05),
          inset 2px 2px 6px rgba(255, 255, 255, 0.1),
          inset -2px -2px 6px rgba(0, 0, 0, 0.2)
        `,
        border: '1px solid rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-sm font-semibold text-white/90 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          Plenny
        </span>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="w-6 h-6 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-48" aria-live="polite" aria-atomic="false">
        {messages.length === 0 && !isThinking && (
          <div className="text-center text-white/70 text-sm py-4">
            Hi! How can I help you today? 👋
          </div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: msg.type === 'user' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 text-sm ${
                msg.type === 'user'
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl rounded-br-md shadow-md'
                  : 'bg-white/10 text-white/90 rounded-2xl rounded-bl-md border border-white/15'
              }`}
              style={{
                minHeight: '36px',
                fontSize: '14px',
                lineHeight: '1.5',
              }}
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
            <div className="bg-white/10 px-4 py-2 rounded-2xl rounded-bl-md border border-white/15 flex items-center gap-1">
              <motion.span
                className="text-emerald-400"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                •
              </motion.span>
              <motion.span
                className="text-purple-400"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
              >
                •
              </motion.span>
              <motion.span
                className="text-emerald-400"
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

      {/* Quick suggestions */}
      {suggestions.length > 0 && messages.length === 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-2">
          {suggestions.map((suggestion, i) => (
            <motion.button
              key={suggestion}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => onSuggestionClick?.(suggestion)}
              className="px-3 py-1.5 text-xs rounded-full bg-emerald-500/10 text-white/70 hover:bg-emerald-500/20 hover:text-white transition-colors border border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {suggestion}
            </motion.button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-white/10">
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
            aria-label="Message to Plenny"
            className="flex-1 py-2 px-3 text-sm rounded-xl border border-white/15 bg-black/30 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            style={{
              boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.2)',
              minHeight: '40px',
              fontSize: '14px',
            }}
          />
          <motion.button
            type="submit"
            disabled={!inputValue.trim() || isThinking}
            aria-label="Send message"
            className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              boxShadow: '4px 4px 8px rgba(29, 185, 84, 0.2)',
            }}
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
