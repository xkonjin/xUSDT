"use client";

export interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "card";
  width?: string | number;
  height?: string | number;
  animation?: "pulse" | "wave" | "none";
}

export function Skeleton({
  className = "",
  variant = "text",
  width,
  height,
  animation = "wave",
}: SkeletonProps) {
  const variantStyles = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-xl",
    card: "h-32 rounded-2xl",
  };

  const animationStyles = {
    pulse: "animate-pulse bg-white/10",
    wave: `
      bg-gradient-to-r from-white/5 via-white/10 to-white/5
      bg-[length:200%_100%]
      animate-[shimmer_1.5s_infinite]
    `,
    none: "bg-white/10",
  };

  const style: React.CSSProperties = {
    width: width,
    height: height,
  };

  return (
    <div
      className={`
        ${variantStyles[variant]}
        ${animationStyles[animation]}
        ${className}
      `}
      style={style}
      role="status"
      aria-label="Loading"
    />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-white/5 p-6 space-y-4 ${className}`}>
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
      <Skeleton variant="rectangular" height={60} />
    </div>
  );
}

export function SkeletonList({
  count = 3,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
