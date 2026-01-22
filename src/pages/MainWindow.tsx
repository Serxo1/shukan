import { useAuth } from "@/hooks/useAuth";
import { useDatabase } from "@/hooks/useDatabase";
import { useSettingsSync } from "@/hooks/useSettingsSync";
import LoginPage from "./LoginPage";
import DashboardPage from "./DashboardPage";
import "@/index.css";

/**
 * MainWindow - Entry point for the settings/dashboard window
 * Handles auth routing: shows LoginPage or DashboardPage based on auth state
 */
export default function MainWindow() {
  // Initialize database and settings sync
  useDatabase();
  useSettingsSync();

  const { isAuthenticated, isLoading, isConfigured } = useAuth();

  // Debug logging
  console.log("[MainWindow] State:", { isAuthenticated, isLoading, isConfigured });

  // Show loading state while checking auth
  if (isLoading) {
    console.log("[MainWindow] Rendering loading state");
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white/60 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
          <p className="text-white/40 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  // If Supabase is not configured, show dashboard anyway (offline mode)
  // If configured but not authenticated, show login
  if (isConfigured && !isAuthenticated) {
    console.log("[MainWindow] Rendering LoginPage");
    return <LoginPage />;
  }

  // Show dashboard (authenticated or offline mode)
  console.log("[MainWindow] Rendering DashboardPage");
  return <DashboardPage />;
}
