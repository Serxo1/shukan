import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error in development
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="text-4xl text-[#78716c]/20 font-display italic mb-4">
            エラー
          </div>
          <p className="text-[#78716c] text-sm tracking-wide mb-2">
            Something went wrong
          </p>
          <p className="text-[#78716c]/40 text-xs mb-6 max-w-xs">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 border border-[rgba(168,162,158,0.2)] rounded-sm text-sm text-[#a8a29e] hover:bg-[rgba(168,162,158,0.1)] transition-all duration-500 tracking-wide"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lightweight fallback for smaller components
export function ErrorFallback({ message = "Failed to load" }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-4 text-[#78716c]/40 text-xs">
      {message}
    </div>
  );
}
