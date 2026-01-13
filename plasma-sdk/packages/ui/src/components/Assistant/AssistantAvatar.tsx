'use client';

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useMousePosition } from './hooks/useMousePosition';
import { useAssistantStore } from './store/assistantStore';
import { VISEME_MAP, IDLE_TIMEOUT_MS } from './constants';
import type { AssistantState, AssistantEmotion } from './types';

interface AssistantAvatarProps {
  size?: number;
  className?: string;
}

// SVG-based avatar since we're not using Rive yet
// This creates a cute blob character with expressive eyes
export function AssistantAvatar({ size = 120, className = '' }: AssistantAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, emotion, currentViseme, isMinimized } = useAssistantStore();
  const { normalized, idleTime } = useMousePosition(containerRef, !isMinimized);
  const [blinkState, setBlinkState] = useState(false);

  // Auto-blink effect
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinkState(true);
      setTimeout(() => setBlinkState(false), 150);
    }, 3000 + Math.random() * 4000);

    return () => clearInterval(blinkInterval);
  }, []);

  // Auto-sleep after idle
  useEffect(() => {
    if (idleTime > IDLE_TIMEOUT_MS && state === 'idle') {
      useAssistantStore.getState().setState('sleeping');
    }
  }, [idleTime, state]);

  // Eye position based on mouse (with fallback for undefined)
  const eyeOffsetX = (normalized?.x ?? 0) * 8;
  const eyeOffsetY = (normalized?.y ?? 0) * 5;

  // Get mouth shape based on viseme
  const getMouthPath = (): string => {
    const visemeIndex = VISEME_MAP[currentViseme] || 0;
    
    // Different mouth shapes for different visemes
    if (state === 'sleeping') {
      return 'M 45 75 Q 60 72 75 75'; // Slight smile while sleeping
    }
    
    if (visemeIndex === 0) {
      // Closed/neutral
      if (emotion === 'happy' || emotion === 'excited') {
        return 'M 45 73 Q 60 82 75 73'; // Smile
      }
      if (emotion === 'concerned') {
        return 'M 45 78 Q 60 72 75 78'; // Frown
      }
      return 'M 45 75 Q 60 77 75 75'; // Neutral
    }
    
    // Open mouths for speaking
    if ([10, 11, 12, 13, 14].includes(visemeIndex)) {
      // Vowels - open mouth
      return 'M 45 70 Q 60 85 75 70 Q 60 72 45 70'; // Open oval
    }
    
    // Consonants - various shapes
    if ([1, 2].includes(visemeIndex)) {
      return 'M 48 74 Q 60 78 72 74'; // Pursed lips
    }
    
    return 'M 45 73 Q 60 78 75 73'; // Default slightly open
  };

  // Get colors based on emotion/state
  const getColors = () => {
    switch (emotion) {
      case 'happy':
      case 'excited':
        return {
          primary: '#00D4FF',
          secondary: '#A855F7',
          glow: 'rgba(0, 212, 255, 0.4)',
        };
      case 'concerned':
        return {
          primary: '#F59E0B',
          secondary: '#EF4444',
          glow: 'rgba(245, 158, 11, 0.4)',
        };
      case 'thinking':
        return {
          primary: '#8B5CF6',
          secondary: '#06B6D4',
          glow: 'rgba(139, 92, 246, 0.4)',
        };
      case 'sleepy':
        return {
          primary: '#6366F1',
          secondary: '#818CF8',
          glow: 'rgba(99, 102, 241, 0.3)',
        };
      default:
        return {
          primary: '#00D4FF',
          secondary: '#A855F7',
          glow: 'rgba(0, 212, 255, 0.3)',
        };
    }
  };

  const colors = getColors();
  const isSleeping = state === 'sleeping';
  const isSpeaking = state === 'speaking';

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
        position: 'relative',
      }}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow: isSpeaking
            ? [
                `0 0 20px ${colors.glow}`,
                `0 0 40px ${colors.glow}`,
                `0 0 20px ${colors.glow}`,
              ]
            : `0 0 20px ${colors.glow}`,
        }}
        transition={{
          duration: 1,
          repeat: isSpeaking ? Infinity : 0,
        }}
      />

      {/* SVG Avatar */}
      <motion.svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        animate={{
          y: isSleeping ? 0 : [0, -4, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <defs>
          {/* Body gradient */}
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.primary} />
            <stop offset="100%" stopColor={colors.secondary} />
          </linearGradient>

          {/* Clay shadow effect */}
          <filter id="clayShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="4" dy="4" stdDeviation="4" floodColor="rgba(0,0,0,0.15)" />
            <feDropShadow dx="-2" dy="-2" stdDeviation="3" floodColor="rgba(255,255,255,0.3)" />
          </filter>

          {/* Inner highlight */}
          <radialGradient id="highlight" cx="30%" cy="30%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>

        {/* Body */}
        <ellipse
          cx="60"
          cy="65"
          rx="45"
          ry="42"
          fill="url(#bodyGradient)"
          filter="url(#clayShadow)"
        />

        {/* Highlight overlay */}
        <ellipse
          cx="60"
          cy="65"
          rx="45"
          ry="42"
          fill="url(#highlight)"
        />

        {/* Left eye white */}
        <ellipse
          cx={42 + eyeOffsetX * 0.5}
          cy={55 + eyeOffsetY * 0.5}
          rx="12"
          ry={blinkState || isSleeping ? 2 : 14}
          fill="white"
          style={{ transition: 'ry 0.1s ease' }}
        />

        {/* Right eye white */}
        <ellipse
          cx={78 + eyeOffsetX * 0.5}
          cy={55 + eyeOffsetY * 0.5}
          rx="12"
          ry={blinkState || isSleeping ? 2 : 14}
          fill="white"
          style={{ transition: 'ry 0.1s ease' }}
        />

        {/* Left pupil */}
        {!blinkState && !isSleeping && (
          <motion.circle
            cx={42 + eyeOffsetX}
            cy={55 + eyeOffsetY}
            r="5"
            fill="#1E293B"
            animate={{
              cx: 42 + eyeOffsetX,
              cy: 55 + eyeOffsetY,
            }}
            transition={{ duration: 0.1 }}
          />
        )}

        {/* Right pupil */}
        {!blinkState && !isSleeping && (
          <motion.circle
            cx={78 + eyeOffsetX}
            cy={55 + eyeOffsetY}
            r="5"
            fill="#1E293B"
            animate={{
              cx: 78 + eyeOffsetX,
              cy: 55 + eyeOffsetY,
            }}
            transition={{ duration: 0.1 }}
          />
        )}

        {/* Eye shine */}
        {!blinkState && !isSleeping && (
          <>
            <circle cx={40 + eyeOffsetX * 0.8} cy={52 + eyeOffsetY * 0.5} r="2" fill="white" opacity="0.8" />
            <circle cx={76 + eyeOffsetX * 0.8} cy={52 + eyeOffsetY * 0.5} r="2" fill="white" opacity="0.8" />
          </>
        )}

        {/* Mouth */}
        <motion.path
          d={getMouthPath()}
          fill="none"
          stroke="#1E293B"
          strokeWidth="3"
          strokeLinecap="round"
          animate={{ d: getMouthPath() }}
          transition={{ duration: 0.1 }}
        />

        {/* Blush cheeks (when happy/excited) */}
        {(emotion === 'happy' || emotion === 'excited') && (
          <>
            <ellipse cx="28" cy="68" rx="8" ry="5" fill="#FF6B9D" opacity="0.4" />
            <ellipse cx="92" cy="68" rx="8" ry="5" fill="#FF6B9D" opacity="0.4" />
          </>
        )}

        {/* Zzz for sleeping */}
        {isSleeping && (
          <motion.text
            x="85"
            y="35"
            fontSize="16"
            fill={colors.primary}
            animate={{ opacity: [0.5, 1, 0.5], y: [35, 30, 35] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            z
          </motion.text>
        )}

        {/* Sparkles when excited */}
        {emotion === 'excited' && (
          <>
            <motion.text
              x="15"
              y="25"
              fontSize="14"
              animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ✨
            </motion.text>
            <motion.text
              x="95"
              y="30"
              fontSize="12"
              animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
            >
              ✨
            </motion.text>
          </>
        )}

        {/* Thinking dots */}
        {state === 'thinking' && (
          <motion.g>
            <motion.circle
              cx="100"
              cy="25"
              r="4"
              fill={colors.primary}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <motion.circle
              cx="108"
              cy="18"
              r="3"
              fill={colors.primary}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            />
            <motion.circle
              cx="114"
              cy="12"
              r="2"
              fill={colors.primary}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
            />
          </motion.g>
        )}
      </motion.svg>
    </motion.div>
  );
}
