import { useState, useEffect, useCallback, useRef } from 'react';

interface MousePosition {
  x: number;
  y: number;
  normalized: { x: number; y: number };
  idleTime: number;
}

export function useMousePosition(
  avatarRef: React.RefObject<HTMLElement | null>,
  enabled: boolean = true
): MousePosition {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [normalized, setNormalized] = useState({ x: 0, y: 0 });
  const [idleTime, setIdleTime] = useState(0);
  const lastMoveRef = useRef(Date.now());
  const idleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const calculateNormalized = useCallback(
    (mouseX: number, mouseY: number) => {
      if (!avatarRef.current) return { x: 0, y: 0 };

      const rect = avatarRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = mouseX - centerX;
      const dy = mouseY - centerY;

      // Normalize to -1 to 1 range with max distance
      const maxDistance = 400;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const scale = Math.min(distance / maxDistance, 1);

      const angle = Math.atan2(dy, dx);

      return {
        x: Math.cos(angle) * scale,
        y: Math.sin(angle) * scale,
      };
    },
    [avatarRef]
  );

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setNormalized(calculateNormalized(e.clientX, e.clientY));
      lastMoveRef.current = Date.now();
      setIdleTime(0);
    };

    // Track idle time
    idleTimerRef.current = setInterval(() => {
      setIdleTime(Date.now() - lastMoveRef.current);
    }, 1000);

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, [enabled, calculateNormalized]);

  return { x: position.x, y: position.y, normalized, idleTime };
}
