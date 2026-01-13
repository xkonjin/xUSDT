"use client";

import { useEffect, useState, useCallback } from "react";

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  velocity: { x: number; y: number };
}

interface CelebrationProps {
  show: boolean;
  onComplete?: () => void;
  duration?: number;
  particleCount?: number;
}

const COLORS = [
  "#00D4FF", // Cyan
  "#A855F7", // Purple
  "#22C55E", // Green
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#3B82F6", // Blue
];

export function Celebration({
  show,
  onComplete,
  duration = 3000,
  particleCount = 50,
}: CelebrationProps) {
  const [particles, setParticles] = useState<ConfettiPiece[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const createParticles = useCallback(() => {
    const newParticles: ConfettiPiece[] = [];
    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        rotation: Math.random() * 360,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 8 + Math.random() * 8,
        velocity: {
          x: (Math.random() - 0.5) * 4,
          y: 2 + Math.random() * 3,
        },
      });
    }
    return newParticles;
  }, [particleCount]);

  useEffect(() => {
    if (show && !isAnimating) {
      setIsAnimating(true);
      setParticles(createParticles());

      const timeout = setTimeout(() => {
        setIsAnimating(false);
        setParticles([]);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timeout);
    }
  }, [show, isAnimating, createParticles, duration, onComplete]);

  useEffect(() => {
    if (!isAnimating || particles.length === 0) return;

    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.velocity.x,
            y: p.y + p.velocity.y,
            rotation: p.rotation + 5,
            velocity: {
              x: p.velocity.x * 0.99,
              y: p.velocity.y + 0.1,
            },
          }))
          .filter((p) => p.y < 120)
      );
    }, 16);

    return () => clearInterval(interval);
  }, [isAnimating, particles.length]);

  if (!isAnimating) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            opacity: Math.max(0, 1 - particle.y / 100),
          }}
        />
      ))}
    </div>
  );
}

interface SuccessCheckmarkProps {
  show: boolean;
  size?: number;
  onComplete?: () => void;
}

export function SuccessCheckmark({
  show,
  size = 80,
  onComplete,
}: SuccessCheckmarkProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (show) {
      setAnimate(true);
      const timeout = setTimeout(() => {
        onComplete?.();
      }, 1000);
      return () => clearTimeout(timeout);
    } else {
      setAnimate(false);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div
      className="flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 52 52"
        className={`${animate ? "animate-checkmark" : ""}`}
        style={{ width: size, height: size }}
      >
        <circle
          className="checkmark-circle"
          cx="26"
          cy="26"
          r="24"
          fill="none"
          stroke="#22C55E"
          strokeWidth="3"
          style={{
            strokeDasharray: 166,
            strokeDashoffset: animate ? 0 : 166,
            transition: "stroke-dashoffset 0.6s ease-out",
          }}
        />
        <path
          className="checkmark-check"
          fill="none"
          stroke="#22C55E"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.1 27.2l7.1 7.2 16.7-16.8"
          style={{
            strokeDasharray: 48,
            strokeDashoffset: animate ? 0 : 48,
            transition: "stroke-dashoffset 0.3s ease-out 0.6s",
          }}
        />
      </svg>
    </div>
  );
}

interface PaymentSuccessProps {
  show: boolean;
  amount: string;
  recipient: string;
  onDone?: () => void;
}

export function PaymentSuccess({
  show,
  amount,
  recipient,
  onDone,
}: PaymentSuccessProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (show) {
      setShowConfetti(true);
      setTimeout(() => setShowContent(true), 200);
    } else {
      setShowConfetti(false);
      setShowContent(false);
    }
  }, [show]);

  if (!show) return null;

  return (
    <>
      <Celebration show={showConfetti} duration={4000} particleCount={60} />
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm">
        <div
          className={`clay-card p-8 text-center max-w-sm mx-4 transform transition-all duration-500 ${
            showContent ? "scale-100 opacity-100" : "scale-90 opacity-0"
          }`}
        >
          <SuccessCheckmark show={showContent} size={80} />
          <h2 className="text-2xl font-bold mt-4 text-[rgb(var(--text-primary))]">
            Payment Sent!
          </h2>
          <p className="text-4xl font-bold my-4 gradient-text">{amount}</p>
          <p className="text-[rgb(var(--text-muted))]">sent to {recipient}</p>
          <button
            onClick={onDone}
            className="clay-button mt-6 w-full"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}

export default Celebration;
