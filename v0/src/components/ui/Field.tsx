"use client";

import React from "react";

export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helpText?: string;
  trailing?: React.ReactNode;
}

/**
 * Field: Label + input with consistent sizing and help text.
 */
export function Field({ label, helpText, trailing, className = "", ...props }: FieldProps) {
  return (
    <label className="xui-field">
      {label ? <span className="xui-field-label">{label}</span> : null}
      <div className="xui-field-row">
        <input className={["xui-input", className].filter(Boolean).join(" ")} {...props} />
        {trailing ? <div className="xui-field-trailing">{trailing}</div> : null}
      </div>
      {helpText ? <span className="xui-field-help">{helpText}</span> : null}
    </label>
  );
}

export default Field;


