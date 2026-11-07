/**
 * Toast — lightweight feedback for saves, publishes and failures.
 * Mount <ToastProvider> once (App.tsx); call useToast() anywhere below it.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: Tone;
  title: string;
  description?: string;
}

interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_STYLES: Record<Tone, { ring: string; icon: ReactNode; iconWrap: string }> = {
  success: {
    ring: 'ring-success/25',
    icon: <CheckCircle2 className="h-5 w-5" aria-hidden />,
    iconWrap: 'bg-success-bg text-success',
  },
  error: {
    ring: 'ring-danger/25',
    icon: <AlertTriangle className="h-5 w-5" aria-hidden />,
    iconWrap: 'bg-danger-bg text-danger',
  },
  info: {
    ring: 'ring-brand-100',
    icon: <Info className="h-5 w-5" aria-hidden />,
    iconWrap: 'bg-brand-50 text-brand-600',
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (tone: Tone, title: string, description?: string) => {
      const id = nextId.current;
      nextId.current += 1;
      setItems((prev) => [...prev.slice(-2), { id, tone, title, description }]);
      const timer = window.setTimeout(() => dismiss(id), 5000);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
    },
    [],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, description) => push('success', title, description),
      error: (title, description) => push('error', title, description),
      info: (title, description) => push('info', title, description),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== 'undefined'
        ? createPortal(
            <div
              className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end"
              aria-live="polite"
              aria-atomic="false"
            >
              {items.map((item) => {
                const tone = TONE_STYLES[item.tone];
                return (
                  <div
                    key={item.id}
                    className={`animate-fade-up pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-panel border border-line bg-surface p-3.5 shadow-lift ring-1 ring-inset ${tone.ring}`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone.iconWrap}`}
                    >
                      {tone.icon}
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-[13.5px] font-bold leading-5 text-ink">{item.title}</p>
                      {item.description ? (
                        <p className="mt-0.5 text-[12.5px] leading-5 text-muted">{item.description}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => dismiss(item.id)}
                      className="rounded-md p-1 text-muted transition hover:bg-surface-2 hover:text-ink"
                      aria-label="Dismiss notification"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}
