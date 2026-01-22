import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n";
import App from "./App";
import MainWindow from "./pages/MainWindow";
import OnboardingWindow from "./pages/OnboardingWindow";

// Error Boundary for catching and displaying errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: "#0a0a0a",
          color: "#fff",
          padding: "20px",
          fontFamily: "monospace",
          height: "100vh",
          overflow: "auto"
        }}>
          <h2 style={{ color: "#ef4444", marginBottom: "10px" }}>Erro na aplicação</h2>
          <p style={{ color: "#999", marginBottom: "20px" }}>
            Pressione F12 para abrir DevTools e ver mais detalhes.
          </p>
          <pre style={{
            background: "#1a1a1a",
            padding: "15px",
            borderRadius: "8px",
            overflow: "auto",
            fontSize: "12px",
            color: "#f87171"
          }}>
            {this.state.error?.toString()}
            {"\n\n"}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              background: "#333",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const path = window.location.pathname;

// Set background based on route
if (path !== "/" && path !== "") {
  document.documentElement.style.background = "#0a0a0a";
  document.body.style.background = "#0a0a0a";
}

let Component: React.ComponentType;
if (path === "/settings") {
  Component = MainWindow;
} else if (path === "/onboarding") {
  Component = OnboardingWindow;
} else {
  Component = App;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Component />
    </ErrorBoundary>
  </React.StrictMode>
);
