'use client';

interface ProgressRingProps {
  /** Progress percentage (0-100) */
  progress: number;
  /** Size of the ring in pixels */
  size?: number;
  /** Stroke width of the ring */
  strokeWidth?: number;
  /** Show percentage text in center */
  showText?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * ProgressRing Component
 * 
 * SVG circular progress indicator for stream completion.
 * Animated fill with orange brand color.
 */
export function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 6,
  showText = true,
  className = '',
}: ProgressRingProps) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  // Calculate SVG parameters
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;
  
  // Center point
  const center = size / 2;

  return (
    <div 
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.5))',
          }}
        />
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FB923C" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Center text */}
      {showText && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span 
            className="font-heading font-bold text-white"
            style={{ fontSize: size * 0.2 }}
          >
            {Math.round(clampedProgress)}%
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * StreamProgressRing Component
 * 
 * Extended version specifically for stream cards.
 * Shows amount streamed in addition to percentage.
 */
interface StreamProgressRingProps extends ProgressRingProps {
  /** Amount streamed so far */
  streamedAmount?: string;
  /** Total amount */
  totalAmount?: string;
}

export function StreamProgressRing({
  progress,
  size = 100,
  strokeWidth = 8,
  streamedAmount,
  totalAmount,
  className = '',
}: StreamProgressRingProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;
  const center = size / 2;

  return (
    <div 
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle with glow */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#streamProgressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.4))',
          }}
        />
        
        <defs>
          <linearGradient id="streamProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#FB923C" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        <span 
          className="font-heading font-bold text-white leading-none"
          style={{ fontSize: size * 0.22 }}
        >
          {Math.round(clampedProgress)}%
        </span>
        {streamedAmount && (
          <span 
            className="text-white/60 mt-1"
            style={{ fontSize: size * 0.12 }}
          >
            ${streamedAmount}{totalAmount ? ` / ${totalAmount}` : ""}
          </span>
        )}
      </div>
    </div>
  );
}

export default ProgressRing;
