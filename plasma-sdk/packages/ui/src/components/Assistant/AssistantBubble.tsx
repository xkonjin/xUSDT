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
        background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
        boxShadow: `
          12px 12px 24px rgba(166, 180, 200, 0.25),
          -12px -12px 24px rgba(255, 255, 255, 0.95),
          inset 2px 2px 6px rgba(255, 255, 255, 0.8),
          inset -2px -2px 6px rgba(166, 180, 200, 0.08)
        `,
        border: '1px solid rgba(255, 255, 255, 0.9)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50">
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-500" />
          Plenny
        </span>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-48">
        {messages.length === 0 && !isThinking && (
          <div className="text-center text-gray-600 text-sm py-4">
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
                  ? 'bg-gradient-to-br from-cyan-400 to-cyan-500 text-white rounded-2xl rounded-br-md shadow-md'
                  : 'bg-white text-gray-800 rounded-2xl rounded-bl-md shadow-sm border border-gray-100'
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
            <div className="bg-white px-4 py-2 rounded-2xl rounded-bl-md shadow-sm border border-gray-100 flex items-center gap-1">
              <motion.span
                className="text-cyan-500"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                •
              </motion.span>
              <motion.span
                className="text-purple-500"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
              >
                •
              </motion.span>
              <motion.span
                className="text-cyan-500"
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
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => onSuggestionClick?.(suggestion)}
              className="px-3 py-1.5 text-xs rounded-full bg-cyan-50 text-gray-700 hover:bg-cyan-100 transition-colors border border-cyan-200"
            >
              {suggestion}
            </motion.button>
          ))}
        </div>
      )}

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
            className="flex-1 py-2 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100 transition-all"
            style={{
              boxShadow: 'inset 2px 2px 4px rgba(166, 180, 200, 0.1)',
            }}
          />
          <motion.button
            type="submit"
            disabled={!inputValue.trim() || isThinking}
            className="p-2 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              boxShadow: '4px 4px 8px rgba(0, 212, 255, 0.2)',
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
