"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import React from "react";

type ButtonVariant = "primary" | "outline" | "ghost";

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

/**
 * Button: Accessible, theme-aware button with subtle Framer Motion hover/press.
 */
export function Button({
  variant = "primary",
  fullWidth = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base = "xui-btn";
  const map: Record<ButtonVariant, string> = {
    primary: "xui-btn--primary",
    outline: "xui-btn--outline",
    ghost: "xui-btn--ghost",
  };
  const widthCls = fullWidth ? "xui-w-full" : "";

  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      className={[base, map[variant], widthCls, className].filter(Boolean).join(" ")}
      type="button"
      {...props}
    >
      {children}
    </motion.button>
  );
}

export default Button;


