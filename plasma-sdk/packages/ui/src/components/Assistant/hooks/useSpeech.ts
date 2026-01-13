import { useState, useCallback, useRef, useEffect } from 'react';

interface SpeechOptions {
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onViseme?: (viseme: string) => void;
}

// Simple viseme mapping based on phonemes (approximate)
const getVisemeFromChar = (char: string): string => {
  const c = char.toLowerCase();
  if ('aeiou'.includes(c)) {
    if (c === 'a') return 'aa';
    if (c === 'e') return 'E';
    if (c === 'i') return 'I';
    if (c === 'o') return 'O';
    if (c === 'u') return 'U';
  }
  if ('pbm'.includes(c)) return 'PP';
  if ('fv'.includes(c)) return 'FF';
  if ('sz'.includes(c)) return 'SS';
  if ('td'.includes(c)) return 'DD';
  if ('kg'.includes(c)) return 'kk';
  if ('nl'.includes(c)) return 'nn';
  if (c === 'r') return 'RR';
  if ('jy'.includes(c)) return 'CH';
  return 'sil';
};

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentViseme, setCurrentViseme] = useState('sil');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const visemeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Check if speech synthesis is available
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsReady(true);
    }
    return () => {
      if (visemeIntervalRef.current) {
        clearInterval(visemeIntervalRef.current);
      }
    };
  }, []);

  const speak = useCallback(
    async (text: string, options: SpeechOptions = {}): Promise<void> => {
      if (!isReady || typeof window === 'undefined') return;

      const { rate = 1, pitch = 1, onStart, onEnd, onViseme } = options;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.pitch = pitch;

        // Try to find a good voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(
          (v) => v.name.includes('Samantha') || v.name.includes('Karen') || v.lang.startsWith('en')
        );
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onstart = () => {
          setIsSpeaking(true);
          onStart?.();

          // Simple viseme animation based on text
          let charIndex = 0;
          visemeIntervalRef.current = setInterval(() => {
            if (charIndex < text.length) {
              const viseme = getVisemeFromChar(text[charIndex]);
              setCurrentViseme(viseme);
              onViseme?.(viseme);
              charIndex++;
            } else {
              setCurrentViseme('sil');
              onViseme?.('sil');
            }
          }, 80); // Approximate timing
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          setCurrentViseme('sil');
          if (visemeIntervalRef.current) {
            clearInterval(visemeIntervalRef.current);
          }
          onEnd?.();
          resolve();
        };

        utterance.onerror = () => {
          setIsSpeaking(false);
          setCurrentViseme('sil');
          if (visemeIntervalRef.current) {
            clearInterval(visemeIntervalRef.current);
          }
          resolve();
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      });
    },
    [isReady]
  );

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setCurrentViseme('sil');
    if (visemeIntervalRef.current) {
      clearInterval(visemeIntervalRef.current);
    }
  }, []);

  return {
    isReady,
    isSpeaking,
    currentViseme,
    speak,
    stop,
  };
}
