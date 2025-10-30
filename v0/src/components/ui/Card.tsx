"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import React from "react";

export interface CardProps extends Omit<HTMLMotionProps<"section">, "children"> {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

/**
 * Card: Frosted-glass container with soft shadow and animated entrance.
 */
export function Card({ title, subtitle, className = "", children, ...props }: CardProps) {
  return (
    <motion.section
      initial={{ y: 6, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={["xui-card", className].filter(Boolean).join(" ")}
      {...props}
    >
      {title ? (
        <header className="xui-card-head">
          <h3 className="xui-card-title">{title}</h3>
          {subtitle ? <p className="xui-card-subtitle">{subtitle}</p> : null}
        </header>
      ) : null}
      <div className="xui-card-body">{children}</div>
    </motion.section>
  );
}

export default Card;


