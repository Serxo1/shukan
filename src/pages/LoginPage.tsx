import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import "@/index.css";

export default function LoginPage() {
  const { t } = useTranslation();
  const { signInWithEmail } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signInWithEmail(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("Invalid") || message.includes("credentials")) {
        setError(t("login.errors.invalidCredentials"));
      } else if (message.includes("network") || message.includes("fetch")) {
        setError(t("login.errors.networkError"));
      } else {
        setError(t("login.errors.generic"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    getCurrentWindow().close();
  };

  const handleMinimize = () => {
    getCurrentWindow().minimize();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      {/* Custom title bar */}
      <div
        className="h-10 flex items-center justify-between px-4 bg-[#0a0a0a]"
        data-tauri-drag-region
      >
        <span className="text-xs text-white/30" data-tauri-drag-region>
          {t("app.name")}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleMinimize}
            className="w-7 h-7 flex items-center justify-center rounded-md text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
          >
            <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
              <rect width="10" height="1" />
            </svg>
          </button>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1l8 8M9 1l-8 8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 mx-auto mb-8">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-semibold text-white text-center mb-2">
            {t("login.title")}
          </h1>
          <p className="text-sm text-white/40 text-center mb-8">
            {t("login.subtitle")}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder={t("login.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-xl bg-white/5 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50 transition-all"
            />
            <input
              type="password"
              placeholder={t("login.passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-xl bg-white/5 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50 transition-all"
            />

            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white/10 text-white font-medium px-4 py-3 rounded-full hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
              >
                {isLoading ? t("login.loading") : t("login.submit")}
              </button>
            </div>
          </form>

          {/* Links */}
          <div className="mt-6 space-y-3 text-center">
            <button
              type="button"
              onClick={() => openUrl("https://habittracker.app/reset-password")}
              className="text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              {t("login.forgotPassword")}
            </button>
            <p className="text-xs text-white/30">
              {t("login.noAccount")}{" "}
              <button
                type="button"
                onClick={() => openUrl("https://habittracker.app/signup")}
                className="text-white/60 hover:text-white/80 underline transition-colors"
              >
                {t("login.createAccount")}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
