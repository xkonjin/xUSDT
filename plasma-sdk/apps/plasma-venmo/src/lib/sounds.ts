/**
 * Sound effects for UI feedback
 * Uses Web Audio API for lightweight, instant playback
 */

type SoundType = 'success' | 'error' | 'send' | 'receive' | 'tap';

// Sound enabled state (persisted)
let soundEnabled = true;

// Audio context (lazy initialized)
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const AudioCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    audioContext = new AudioCtor();
  }
  return audioContext;
}

// Generate tones programmatically (no external files needed)
function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  const ctx = getAudioContext();
  if (!ctx || !soundEnabled) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = type;

  // Envelope for smooth sound
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

// Sound definitions
const sounds: Record<SoundType, () => void> = {
  success: () => {
    // Happy ascending arpeggio
    playTone(523.25, 0.15, 'sine', 0.2); // C5
    setTimeout(() => playTone(659.25, 0.15, 'sine', 0.2), 80); // E5
    setTimeout(() => playTone(783.99, 0.25, 'sine', 0.25), 160); // G5
  },
  
  error: () => {
    // Descending minor tone
    playTone(440, 0.15, 'triangle', 0.2); // A4
    setTimeout(() => playTone(349.23, 0.2, 'triangle', 0.15), 100); // F4
  },
  
  send: () => {
    // Whoosh-like ascending tone
    const ctx = getAudioContext();
    if (!ctx || !soundEnabled) return;
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.25);
  },
  
  receive: () => {
    // Gentle coin drop sound
    playTone(880, 0.08, 'sine', 0.15); // A5
    setTimeout(() => playTone(1046.5, 0.12, 'sine', 0.2), 60); // C6
  },
  
  tap: () => {
    // Subtle click
    playTone(1000, 0.03, 'sine', 0.1);
  },
};

export function playSound(type: SoundType): void {
  try {
    sounds[type]?.();
  } catch {
    // Silently fail - audio not critical
  }
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('plasma-sounds', enabled ? '1' : '0');
  }
}

export function isSoundEnabled(): boolean {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('plasma-sounds');
    if (stored !== null) {
      soundEnabled = stored === '1';
    }
  }
  return soundEnabled;
}

// Haptic feedback helper
export function hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    const patterns = {
      light: [10],
      medium: [30],
      heavy: [50, 30, 50],
    };
    navigator.vibrate(patterns[type]);
  }
}
