import { useState, useCallback, useRef, useEffect } from 'react';

interface SpeechOptions {
  rate?: number;
  pitch?: number;
  voice?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onViseme?: (viseme: string) => void;
}

// Simple viseme mapping for lip sync animation
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

// Available browser voices - try to find natural sounding ones
const PREFERRED_VOICES = [
  'Samantha', // macOS - very natural
  'Karen',    // macOS Australian
  'Daniel',   // macOS British male
  'Google US English', // Chrome
  'Microsoft Zira', // Windows
  'Microsoft David', // Windows
];

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentViseme, setCurrentViseme] = useState('sil');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const visemeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize and load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
        setIsReady(true);
        console.log('[Plenny] Speech synthesis ready with', voices.length, 'voices');
      }
    };

    // Load voices - they may load async
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (visemeIntervalRef.current) {
        clearInterval(visemeIntervalRef.current);
      }
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Find the best available voice
  const getBestVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (availableVoices.length === 0) return null;

    // Try to find a preferred voice
    for (const preferred of PREFERRED_VOICES) {
      const voice = availableVoices.find(v => v.name.includes(preferred));
      if (voice) return voice;
    }

    // Fall back to first English voice
    const englishVoice = availableVoices.find(v => v.lang.startsWith('en'));
    if (englishVoice) return englishVoice;

    // Last resort - first voice
    return availableVoices[0];
  }, [availableVoices]);

  // Main speak function using browser TTS
  const speak = useCallback(
    async (text: string, options: SpeechOptions = {}): Promise<void> => {
      if (!isReady || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        console.warn('[Plenny] Speech synthesis not ready');
        return;
      }

      const { rate = 1.0, pitch = 1.0, onStart, onEnd, onViseme } = options;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Use best available voice
        const voice = getBestVoice();
        if (voice) {
          utterance.voice = voice;
          console.log('[Plenny] Using voice:', voice.name);
        }

        // Slightly slower rate sounds more natural
        utterance.rate = Math.max(0.8, Math.min(rate, 1.2));
        utterance.pitch = pitch;

        utterance.onstart = () => {
          setIsSpeaking(true);
          setIsLoading(false);
          onStart?.();

          // Simple viseme animation based on text characters
          let charIndex = 0;
          const charInterval = 70; // ms per character, adjust for natural pacing
          
          visemeIntervalRef.current = setInterval(() => {
            if (charIndex < text.length) {
              const viseme = getVisemeFromChar(text[charIndex]);
              setCurrentViseme(viseme);
              onViseme?.(viseme);
              charIndex++;
            } else {
              // Reached end of text, close mouth
              setCurrentViseme('sil');
              onViseme?.('sil');
            }
          }, charInterval);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          setCurrentViseme('sil');
          if (visemeIntervalRef.current) {
            clearInterval(visemeIntervalRef.current);
            visemeIntervalRef.current = null;
          }
          onViseme?.('sil');
          onEnd?.();
          resolve();
        };

        utterance.onerror = (event) => {
          console.warn('[Plenny] Speech synthesis error:', event.error);
          setIsSpeaking(false);
          setIsLoading(false);
          setCurrentViseme('sil');
          if (visemeIntervalRef.current) {
            clearInterval(visemeIntervalRef.current);
            visemeIntervalRef.current = null;
          }
          resolve();
        };

        utteranceRef.current = utterance;
        setIsLoading(true);
        window.speechSynthesis.speak(utterance);
      });
    },
    [isReady, getBestVoice]
  );

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    setIsSpeaking(false);
    setIsLoading(false);
    setCurrentViseme('sil');
    
    if (visemeIntervalRef.current) {
      clearInterval(visemeIntervalRef.current);
      visemeIntervalRef.current = null;
    }
  }, []);

  return {
    isReady,
    isLoading,
    isSpeaking,
    currentViseme,
    availableVoices,
    speak,
    stop,
  };
}
