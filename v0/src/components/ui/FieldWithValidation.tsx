"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  help?: string;
  error?: string;
  trailing?: React.ReactNode;
}

/**
 * Enhanced Field component with inline error display and validation feedback
 */
export function FieldWithValidation({
  label,
  help,
  error,
  trailing,
  className = "",
  ...props
}: FieldProps) {
  const hasError = Boolean(error);

  return (
    <div className="xui-field">
      {label && (
        <label className="xui-field-label" htmlFor={props.id}>
          {label}
        </label>
      )}
      <div className="xui-field-row">
        <input
          className={`xui-input ${hasError ? "xui-input-error" : ""} ${className}`}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${props.id}-error` : help ? `${props.id}-help` : undefined
          }
          {...props}
        />
        {trailing && <div className="xui-field-trailing">{trailing}</div>}
      </div>
      <AnimatePresence mode="wait">
        {error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="xui-field-error"
            id={`${props.id}-error`}
            role="alert"
          >
            {error}
          </motion.div>
        ) : help ? (
          <motion.div
            key="help"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="xui-field-help"
            id={`${props.id}-help`}
          >
            {help}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default FieldWithValidation;
