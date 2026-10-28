import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AlertOctagon, AlertTriangle, CheckCircle2, ExternalLink, X, Mail, Calendar, Bug, ShieldAlert } from "lucide-react";
import { soundEngine } from "../utils/audio";
import { sendDesktopNotification } from "../utils/browserNotifications";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  urgencyScore?: number;
  importanceScore?: number;
  category?: "Email Action" | "Meeting" | "Blocker" | "Bug" | string;
  isP0?: boolean;
  nativeUrl?: string | null;
  duration?: number;
  onDone?: () => void;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, "id">) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, "id">): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { ...toast, id };

      // Play audio alert for urgent/P0 alerts
      const score = toast.urgencyScore ?? 0;
      const isUrgent = score > 70 || score > 0.7 || toast.isP0;

      if (isUrgent) {
        soundEngine.playUrgentChime();
        // Dispatch browser desktop notification
        sendDesktopNotification(
          toast.isP0 ? `🚨 P0 Alert: ${toast.title}` : `⚡ High Priority: ${toast.title}`,
          {
            body: toast.description || `Category: ${toast.category || "Action Item"}`,
            tag: id,
          },
        );
      }

      setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // max 5 concurrent toasts

      // Auto dismiss after duration (default 7 seconds)
      const duration = toast.duration ?? 7000;
      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex max-w-md flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastCard: React.FC<{ toast: ToastItem; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  const rawScore = toast.urgencyScore ?? 0;
  const scorePercent = rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore);
  const isP0 = toast.isP0 || scorePercent >= 85;
  const isUrgent = isP0 || scorePercent >= 70;

  const getCategoryIcon = (cat?: string) => {
    switch (cat) {
      case "Email Action":
        return <Mail className="h-4 w-4 text-indigo-400" />;
      case "Meeting":
        return <Calendar className="h-4 w-4 text-sky-400" />;
      case "Bug":
        return <Bug className="h-4 w-4 text-amber-400" />;
      case "Blocker":
      default:
        return <AlertOctagon className="h-4 w-4 text-rose-400" />;
    }
  };

  return (
    <div
      className={`pointer-events-auto relative w-full overflow-hidden rounded-2xl border bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-md transition-all duration-300 animate-slide-up ${
        isP0
          ? "border-rose-500/70 shadow-[0_0_24px_rgba(244,63,94,0.35)] ring-1 ring-rose-500/50"
          : isUrgent
            ? "border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/40"
            : "border-slate-700/80 shadow-lg"
      }`}
    >
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {isP0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-rose-300 border border-rose-500/40 animate-pulse">
              <ShieldAlert className="h-3 w-3" />
              P0 Critical Blocker
            </span>
          ) : isUrgent ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-300 border border-amber-500/40">
              <AlertTriangle className="h-3 w-3" />
              Urgent Priority ({scorePercent}/100)
            </span>
          ) : null}

          {toast.category && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700">
              {getCategoryIcon(toast.category)}
              {toast.category}
            </span>
          )}
        </div>

        <button
          onClick={onDismiss}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Title & Description */}
      <h4 className="text-sm font-semibold text-white leading-snug">{toast.title}</h4>
      {toast.description && (
        <p className="mt-1 text-xs text-slate-300 line-clamp-2 leading-relaxed">
          {toast.description}
        </p>
      )}

      {/* Action Footer */}
      <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
        {toast.nativeUrl && (
          <a
            href={toast.nativeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            <ExternalLink className="h-3 w-3" />
            Open Source
          </a>
        )}

        {toast.onDone && (
          <button
            onClick={() => {
              toast.onDone?.();
              onDismiss();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-sm transition cursor-pointer"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark Done
          </button>
        )}
      </div>

      {/* Subtle bottom progress bar */}
      <div className="absolute bottom-0 left-0 h-0.5 w-full bg-slate-800">
        <div
          className={`h-full ${
            isP0 ? "bg-rose-500" : isUrgent ? "bg-amber-500" : "bg-blue-500"
          } animate-shrink-progress`}
        />
      </div>
    </div>
  );
};
