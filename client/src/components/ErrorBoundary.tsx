import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm text-[var(--color-foreground)]">
            Something went wrong loading this page.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90"
            >
              Reload
            </button>
            <a
              href="/overview"
              className="rounded border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
            >
              Back to Overview
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
