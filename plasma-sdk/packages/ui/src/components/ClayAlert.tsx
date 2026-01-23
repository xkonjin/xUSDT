"use client";

import { forwardRef } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "../lib/utils";

export interface ClayAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "danger";
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

const variantStyles = {
  info: `
    from-blue-50 to-blue-100/80
    border-blue-200/60
    text-blue-800
  `,
  success: `
    from-emerald-50 to-emerald-100/80
    border-emerald-200/60
    text-emerald-800
  `,
  warning: `
    from-amber-50 to-amber-100/80
    border-amber-200/60
    text-amber-800
  `,
  danger: `
    from-red-50 to-red-100/80
    border-red-200/60
    text-red-800
  `,
};

const defaultIcons = {
  info: <Info className="w-5 h-5" />,
  success: <CheckCircle2 className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  danger: <AlertCircle className="w-5 h-5" />,
};

const ClayAlert = forwardRef<HTMLDivElement, ClayAlertProps>(
  (
    {
      className = "",
      variant = "info",
      dismissible = false,
      onDismiss,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex items-start gap-4 p-4 rounded-3xl",
          "bg-gradient-to-br",
          "border",
          "shadow-clay-sm",
          "transition-all duration-300",
          variantStyles[variant],
          className
        )}
        {...props}
      >
        <div className={cn(
          "flex-shrink-0 mt-0.5",
          variant === "info" && "text-blue-600",
          variant === "success" && "text-emerald-600",
          variant === "warning" && "text-amber-600",
          variant === "danger" && "text-red-600"
        )}>
          {icon || defaultIcons[variant]}
        </div>
        <div className="flex-1 min-w-0">
          {typeof children === "string" ? (
            <p className="text-sm font-medium">{children}</p>
          ) : (
            children
          )}
        </div>
        {dismissible && (
          <button
            onClick={onDismiss}
            className={cn(
              "flex-shrink-0 p-1 rounded-full",
              "transition-colors duration-200",
              "hover:bg-black/5",
              variant === "info" && "text-blue-500 hover:text-blue-700",
              variant === "success" && "text-emerald-500 hover:text-emerald-700",
              variant === "warning" && "text-amber-500 hover:text-amber-700",
              variant === "danger" && "text-red-500 hover:text-red-700"
            )}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);

ClayAlert.displayName = "ClayAlert";

export { ClayAlert };
