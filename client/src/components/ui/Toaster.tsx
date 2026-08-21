import { X } from "lucide-react";
import { type ReactNode, createContext, useCallback, useContext, useState } from "react";

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

  const toast = {
    error: (message: string) => addToast(message, "error"),
    success: (message: string) => addToast(message, "success"),
    info: (message: string) => addToast(message, "info"),
  };

  const borderColor = {
    error: "border-l-[var(--color-negative)]",
    success: "border-l-[var(--color-positive)]",
    info: "border-l-[var(--color-primary)]",
  };

  return (
    <ToastContext.Provider value={{ toast }}>
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
