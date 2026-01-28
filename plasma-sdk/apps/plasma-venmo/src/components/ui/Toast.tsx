"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles: Record<ToastType, { bg: string; border: string; text: string; icon: string; glow: string }> = {
  success: {
    bg: "bg-green-500/15",
    border: "border-green-500/30",
    text: "text-green-300",
    icon: "text-green-400",
    glow: "shadow-green-500/20",
  },
  error: {
    bg: "bg-red-500/15",
    border: "border-red-500/30",
    text: "text-red-300",
    icon: "text-red-400",
    glow: "shadow-red-500/20",
  },
  warning: {
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
    text: "text-amber-300",
    icon: "text-amber-400",
    glow: "shadow-amber-500/20",
  },
  info: {
    bg: "bg-blue-500/15",
    border: "border-blue-500/30",
    text: "text-blue-300",
    icon: "text-blue-400",
    glow: "shadow-blue-500/20",
  },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const Icon = icons[toast.type];
  const style = styles[toast.type];
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / toast.duration!) * 100);
      setProgress(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [toast.duration]);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(onRemove, 200);
  };

  return (
    <div
      className={`
        relative overflow-hidden flex items-center gap-3 px-4 py-3.5 rounded-2xl border backdrop-blur-xl
        shadow-lg ${style.glow}
        ${style.bg} ${style.border}
        transition-all duration-200
        ${isExiting ? 'opacity-0 translate-x-full scale-95' : 'opacity-100 translate-x-0 scale-100'}
      `}
      style={{
        animation: isExiting ? 'none' : 'toast-slide-in 0.3s ease-out forwards',
      }}
      role="alert"
    >
      <div className={`p-1.5 rounded-lg ${style.bg}`}>
        <Icon className={`w-4 h-4 flex-shrink-0 ${style.icon}`} />
      </div>
      <p className={`flex-1 text-sm font-medium ${style.text}`}>{toast.message}</p>
      <button
        onClick={handleRemove}
        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4 text-white/40 hover:text-white/60" />
      </button>
      
      {/* Progress bar */}
      {toast.duration && toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
          <div 
            className={`h-full ${style.icon.replace('text-', 'bg-')} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, duration = 5000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => {
        // Limit to 5 toasts max
        const newToasts = [...prev, { id, type, message, duration }];
        if (newToasts.length > 5) {
          return newToasts.slice(-5);
        }
        return newToasts;
      });

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, duration?: number) => addToast("success", message, duration),
    [addToast]
  );
  const error = useCallback(
    (message: string, duration?: number) => addToast("error", message, duration),
    [addToast]
  );
  const warning = useCallback(
    (message: string, duration?: number) => addToast("warning", message, duration),
    [addToast]
  );
  const info = useCallback(
    (message: string, duration?: number) => addToast("info", message, duration),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      {/* Toast Container - positioned for mobile */}
      <div 
        className="fixed top-4 left-4 right-4 md:top-auto md:bottom-4 md:left-auto md:right-4 z-[100] flex flex-col gap-2 md:max-w-sm md:w-full pointer-events-none"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={() => removeToast(toast.id)} />
          </div>
        ))}
      </div>
      <style jsx global>{`
        @keyframes toast-slide-in {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @media (min-width: 768px) {
          @keyframes toast-slide-in {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
