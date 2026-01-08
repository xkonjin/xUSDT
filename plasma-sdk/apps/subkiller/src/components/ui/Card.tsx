"use client";

import { cn } from "@/lib/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "interactive" | "elevated" | "plasma";
}

export function Card({
  className,
  variant = "default",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl transition-all duration-300 ease-out",
        {
          "liquid-glass": variant === "default",
          "liquid-glass hover:scale-[1.02] hover:shadow-[0_16px_48px_rgba(0,0,0,0.4),0_0_20px_rgba(0,212,255,0.1)] cursor-pointer":
            variant === "interactive",
          "liquid-glass-elevated": variant === "elevated",
          "liquid-glass-plasma": variant === "plasma",
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-6 py-5 border-b border-white/10", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-6 py-5 border-t border-white/10", className)}
      {...props}
    >
      {children}
    </div>
  );
}
