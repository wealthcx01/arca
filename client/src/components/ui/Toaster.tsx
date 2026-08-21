import { X } from "lucide-react";
import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";

interface Toast {
  id: number;
  message: string;
  type: "error" | "success" | "info";
}

interface ToastContextType {
  toast: {
    error: (message: string) => void;
    success: (message: string) => void;
    info: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast["type"]) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ARCA-65. Both of these were fresh objects on every render, which had two costs.
  //
  // The visible one: the context value changed identity on every ToastProvider render, so every
  // consumer re-rendered whenever any toast appeared or expired — the provider re-renders on its own
  // `toasts` state.
  //
  // The one that blocked this ticket: `toast` could not honestly be named as an effect dependency
  // anywhere, because doing so would re-run that effect on every provider render. Several pages
  // load their data in a `[]` effect and call `toast.error` in the failure path; naming it there
  // without this would have turned "load once" into "reload whenever a toast appears".
  //
  // addToast is already stable, so both memos have a genuinely constant identity.
  const toast = useMemo(
    () => ({
      error: (message: string) => addToast(message, "error"),
      success: (message: string) => addToast(message, "success"),
      info: (message: string) => addToast(message, "info"),
    }),
    [addToast],
  );

  const contextValue = useMemo(() => ({ toast }), [toast]);

  const borderColor = {
    error: "border-l-[var(--color-negative)]",
    success: "border-l-[var(--color-positive)]",
    info: "border-l-[var(--color-primary)]",
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2 rounded border border-[var(--color-border)] border-l-4 ${borderColor[t.type]} bg-[var(--color-card)] px-3 py-2 shadow-lg animate-in slide-in-from-right`}
            style={{ minWidth: 280, maxWidth: 400 }}
          >
            <p className="flex-1 text-xs text-[var(--color-foreground)]">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
