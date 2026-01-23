"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  forwardRef,
} from "react";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "../lib/utils";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toast: (toast: Omit<Toast, "id">) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };

    setToasts((prev) => {
      const exists = prev.some((t) => t.title === toast.title);
      if (exists) return prev;
      return [...prev, newToast];
    });

    if (toast.duration !== 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, toast.duration || 5000);
    }
  }, []);

  const toast = useCallback(
    (props: Omit<Toast, "id">) => addToast(props),
    [addToast]
  );

  const success = useCallback(
    (title: string, message?: string) =>
      addToast({ type: "success", title, message }),
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string) =>
      addToast({ type: "error", title, message }),
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string) =>
      addToast({ type: "info", title, message }),
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string) =>
      addToast({ type: "warning", title, message }),
    [addToast]
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

export const useSuccessToast = () => {
  const { success } = useToast();
  return success;
};

export const useErrorToast = () => {
  const { error } = useToast();
  return error;
};

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ToastContainer = ({ toasts, onRemove }: ToastContainerProps) => {
  return (
    <div className="fixed top-4 right-4 z-[1080] flex flex-col gap-3 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem = forwardRef<HTMLDivElement, ToastItemProps>(
  ({ toast, onRemove }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex items-start gap-4 p-4 rounded-3xl",
          "bg-gradient-to-br from-white to-slate-50",
          "shadow-clay-lg",
          "border",
          "animate-in slide-in-from-right-full duration-300",
          "transition-all duration-300",
          "hover:shadow-clay-xl",
          toast.type === "success" && "border-emerald-200/60",
          toast.type === "error" && "border-red-200/60",
          toast.type === "info" && "border-blue-200/60",
          toast.type === "warning" && "border-amber-200/60"
        )}
      >
        <div
          className={cn(
            "flex-shrink-0 mt-0.5",
            toast.type === "success" && "text-emerald-500",
            toast.type === "error" && "text-red-500",
            toast.type === "info" && "text-blue-500",
            toast.type === "warning" && "text-amber-500"
          )}
        >
          {toast.type === "success" && <CheckCircle2 className="w-5 h-5" />}
          {toast.type === "error" && <AlertCircle className="w-5 h-5" />}
          {toast.type === "info" && <Info className="w-5 h-5" />}
          {toast.type === "warning" && <AlertTriangle className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-bold mb-0.5",
              toast.type === "success" && "text-emerald-800",
              toast.type === "error" && "text-red-800",
              toast.type === "info" && "text-blue-800",
              toast.type === "warning" && "text-amber-800"
            )}
          >
            {toast.title}
          </p>
          {toast.message && (
            <p className="text-sm text-slate-600">{toast.message}</p>
          )}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className={cn(
            "flex-shrink-0 p-1 rounded-full",
            "text-slate-400 hover:text-slate-600",
            "transition-colors duration-200",
            "hover:bg-slate-200/60"
          )}
          aria-label="Dismiss toast"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }
);

ToastItem.displayName = "ToastItem";
