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
      {/* Noise texture overlay */}
      <div className="noise" />

      {/* Custom title bar */}
      <div
        className="h-10 flex items-center justify-between px-4 border-b border-[rgba(168,162,158,0.06)]"
        data-tauri-drag-region
      >
        <span className="font-display text-sm italic text-[#78716c] tracking-wide" data-tauri-drag-region>
          習慣
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleMinimize}
            className="w-7 h-7 flex items-center justify-center text-[#78716c]/40 hover:text-[#a8a29e] transition-all duration-500"
          >
            <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
              <rect width="10" height="1" />
            </svg>
          </button>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center text-[#78716c]/40 hover:text-[#9d6b6b] transition-all duration-500"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1l8 8M9 1l-8 8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Logo - Ensō circle */}
          <div className="flex items-center justify-center mx-auto mb-10">
            <svg width="60" height="60" viewBox="0 0 100 100" className="text-[#a8a29e]">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="240"
                strokeDashoffset="30"
                opacity="0.3"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="font-display text-3xl text-[#fafaf9] text-center mb-2 italic">
            {t("login.title")}
          </h1>
          <p className="text-sm text-[#78716c] text-center mb-10 tracking-wide">
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
              className="w-full px-4 py-3 bg-transparent border border-[rgba(168,162,158,0.1)] rounded-sm text-[#fafaf9] placeholder:text-[#78716c]/50 text-sm focus:outline-none focus:border-[rgba(168,162,158,0.3)] disabled:opacity-40 transition-all duration-500 tracking-wide"
            />
            <input
              type="password"
              placeholder={t("login.passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-3 bg-transparent border border-[rgba(168,162,158,0.1)] rounded-sm text-[#fafaf9] placeholder:text-[#78716c]/50 text-sm focus:outline-none focus:border-[rgba(168,162,158,0.3)] disabled:opacity-40 transition-all duration-500 tracking-wide"
            />

            {error && (
              <p className="text-sm text-[#9d6b6b] text-center tracking-wide">{error}</p>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full border border-[rgba(168,162,158,0.3)] bg-transparent text-[#fafaf9] font-normal px-4 py-3 rounded-sm hover:bg-[rgba(168,162,158,0.1)] hover:border-[rgba(168,162,158,0.5)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-500 text-sm tracking-[0.1em] uppercase"
              >
                {isLoading ? t("login.loading") : t("login.submit")}
              </button>
            </div>
          </form>

          {/* Links */}
          <div className="mt-8 space-y-4 text-center">
            <button
              type="button"
              onClick={() => openUrl("https://habittracker.app/reset-password")}
              className="text-xs text-[#78716c]/50 hover:text-[#a8a29e] transition-all duration-500 tracking-wide"
            >
              {t("login.forgotPassword")}
            </button>
            <p className="text-xs text-[#78716c]/40 tracking-wide">
              {t("login.noAccount")}{" "}
              <button
                type="button"
                onClick={() => openUrl("https://habittracker.app/signup")}
                className="text-[#a8a29e] hover:text-[#fafaf9] transition-all duration-500"
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
