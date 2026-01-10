"use client";

import { useEffect, useState } from "react";
import { CheckCircle, PartyPopper } from "lucide-react";

export interface SuccessAnimationProps {
  isVisible: boolean;
  title?: string;
  subtitle?: string;
  amount?: string;
  onComplete?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

// CSS keyframes as inline styles
const confettiKeyframes = `
@keyframes plasma-confetti {
  0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}
@keyframes plasma-success-bounce {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.05); }
  70% { transform: scale(0.95); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes plasma-success-check {
  0% { transform: scale(0) rotate(-45deg); }
  50% { transform: scale(1.2) rotate(10deg); }
  100% { transform: scale(1) rotate(0deg); }
}
@keyframes plasma-fade-in-up {
  0% { transform: translateY(10px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
`;

export function SuccessAnimation({
  isVisible,
  title = "Success!",
  subtitle,
  amount,
  onComplete,
  autoHide = false,
  autoHideDelay = 3000,
}: SuccessAnimationProps) {
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; delay: number; color: string }>>([]);

  useEffect(() => {
    if (isVisible) {
      const particles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
        color: ['#00d4ff', '#8b5cf6', '#22c55e', '#f59e0b', '#ec4899'][Math.floor(Math.random() * 5)],
      }));
      setConfetti(particles);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([50, 30, 100]);
      }

      if (autoHide && onComplete) {
        const timer = setTimeout(onComplete, autoHideDelay);
        return () => clearTimeout(timer);
      }
    }
  }, [isVisible, autoHide, autoHideDelay, onComplete]);

  if (!isVisible) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: confettiKeyframes }} />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          style={{ animation: 'plasma-fade-in-up 0.3s ease forwards' }}
        />

        {/* Confetti */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {confetti.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: `${particle.x}%`,
                backgroundColor: particle.color,
                animation: `plasma-confetti 3s ease-out ${particle.delay}s forwards`,
              }}
            />
          ))}
        </div>

        {/* Success content */}
        <div 
          className="relative z-10 text-center"
          style={{ animation: 'plasma-success-bounce 0.5s ease-out forwards' }}
        >
          <div className="relative inline-block mb-6">
            <div 
              className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center"
              style={{ animation: 'plasma-success-check 0.6s ease-out forwards' }}
            >
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 animate-bounce">
              <PartyPopper className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          {amount && (
            <div 
              className="text-5xl font-bold text-white mb-2"
              style={{ animation: 'plasma-fade-in-up 0.4s ease forwards' }}
            >
              {amount}
            </div>
          )}

          <h2 
            className="text-2xl font-bold text-white mb-2"
            style={{ animation: 'plasma-fade-in-up 0.4s ease 0.1s forwards', opacity: 0 }}
          >
            {title}
          </h2>

          {subtitle && (
            <p 
              className="text-white/60"
              style={{ animation: 'plasma-fade-in-up 0.4s ease 0.2s forwards', opacity: 0 }}
            >
              {subtitle}
            </p>
          )}

          {onComplete && !autoHide && (
            <button
              onClick={onComplete}
              className="mt-8 px-8 py-3 bg-white text-black font-semibold rounded-2xl hover:bg-white/90 transition-colors"
              style={{ animation: 'plasma-fade-in-up 0.4s ease 0.3s forwards', opacity: 0 }}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </>
  );
}
