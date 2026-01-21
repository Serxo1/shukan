import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { getOS, getModifierKey } from "@/store/useOnboardingStore";
import { supportedLanguages, changeLanguage, type SupportedLanguage } from "@/i18n";
import "@/index.css";

export default function OnboardingWindow() {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(0);
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(
    (i18n.language as SupportedLanguage) || "pt"
  );

  const os = getOS();
  const modifierKey = getModifierKey();

  const handleLanguageSelect = async (lang: SupportedLanguage) => {
    setSelectedLang(lang);
    await changeLanguage(lang);
  };

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Call Rust command to complete onboarding, close window, and show orb
      try {
        await invoke("complete_onboarding");
      } catch (e) {
        console.error("Failed to complete onboarding:", e);
      }
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleClose = async () => {
    // User clicked X without completing - still show the orb
    try {
      await invoke("complete_onboarding");
    } catch (e) {
      console.error("Failed to close onboarding:", e);
    }
  };

  const steps = [
    // Step 0: Language selection
    {
      title: "Welcome / Bem-vindo",
      content: (
        <div className="space-y-6">
          <p className="text-white/60 text-center text-sm">
            Choose your language / Escolha seu idioma
          </p>
          <div className="flex flex-col gap-2">
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageSelect(lang.code)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  selectedLang === lang.code
                    ? "bg-white/10 border border-white/20"
                    : "bg-white/[0.03] border border-transparent hover:bg-white/[0.06]"
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <span className="text-white/80">{lang.name}</span>
                {selectedLang === lang.code && (
                  <svg className="w-5 h-5 ml-auto text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    // Step 1: Show orb with hotkey
    {
      title: t("onboarding.showOrb.title", "Open the Orb"),
      content: (
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/30 to-white/10" />
          </div>
          <p className="text-white/60 text-sm">
            {t("onboarding.showOrb.description", "Use this keyboard shortcut to show the orb anywhere:")}
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
            <kbd className="px-2 py-1 rounded bg-white/10 text-white/80 text-sm font-mono">
              {modifierKey}
            </kbd>
            <span className="text-white/40">+</span>
            <kbd className="px-2 py-1 rounded bg-white/10 text-white/80 text-sm font-mono">
              Shift
            </kbd>
            <span className="text-white/40">+</span>
            <kbd className="px-2 py-1 rounded bg-white/10 text-white/80 text-sm font-mono">
              H
            </kbd>
          </div>
          <p className="text-white/40 text-xs">
            {os === "macos"
              ? t("onboarding.showOrb.macos", "Command + Shift + H")
              : t("onboarding.showOrb.windows", "Windows + Shift + H")}
          </p>
        </div>
      ),
    },
    // Step 2: Hide orb with ESC
    {
      title: t("onboarding.hideOrb.title", "Hide the Orb"),
      content: (
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 flex items-center justify-center relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/30 to-white/10 opacity-30" />
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </motion.div>
          </div>
          <p className="text-white/60 text-sm">
            {t("onboarding.hideOrb.description", "Press ESC to hide the orb when you're done:")}
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
            <kbd className="px-3 py-1 rounded bg-white/10 text-white/80 text-sm font-mono">
              ESC
            </kbd>
          </div>
          <p className="text-white/40 text-xs">
            {t("onboarding.hideOrb.hint", "Or hover over the orb and click the X button")}
          </p>
        </div>
      ),
    },
    // Step 3: System tray
    {
      title: t("onboarding.tray.title", "System Tray"),
      content: (
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/60">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8" />
              <path d="M12 17v4" />
              <circle cx="12" cy="10" r="2" />
            </svg>
          </div>
          <p className="text-white/60 text-sm">
            {t("onboarding.tray.description", "The app lives in your system tray. Right-click to access:")}
          </p>
          <div className="space-y-2 text-left mx-auto max-w-[200px]">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40">
                <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
              <span className="text-white/70 text-sm">{t("onboarding.tray.settings", "Settings")}</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="text-white/70 text-sm">{t("onboarding.tray.quit", "Quit")}</span>
            </div>
          </div>
          <p className="text-white/40 text-xs">
            {os === "macos"
              ? t("onboarding.tray.locationMac", "Look for the icon in your menu bar")
              : t("onboarding.tray.locationWin", "Look for the icon in your taskbar (bottom right)")}
          </p>
        </div>
      ),
    },
  ];

  const currentStepData = steps[step];

  return (
    <div
      className="h-screen flex flex-col text-white overflow-hidden select-none"
      style={{ backgroundColor: '#0a0a0a' }}
    >
      {/* Title bar */}
      <div className="h-9 flex-shrink-0 flex items-center justify-between px-3" data-tauri-drag-region>
        <span className="text-[11px] text-white/20 tracking-wide uppercase" data-tauri-drag-region>
          Habit Tracker
        </span>
        <button
          onClick={handleClose}
          className="w-6 h-6 flex items-center justify-center text-white/20 hover:text-white/50 transition-colors"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M1 1l6 6M7 1l-6 6" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-white/5">
        <motion.div
          className="h-full bg-white/30"
          initial={{ width: 0 }}
          animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <h2 className="text-xl font-medium text-white/90 text-center">
              {currentStepData.title}
            </h2>
            {currentStepData.content}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-8 pb-6 flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={step === 0}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            step === 0
              ? "text-white/20 cursor-not-allowed"
              : "text-white/50 hover:text-white/70 hover:bg-white/5"
          }`}
        >
          {t("common.back", "Back")}
        </button>

        <div className="flex items-center gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === step ? "bg-white/60" : "bg-white/15"
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="px-4 py-2 rounded-lg bg-white/10 text-white/80 text-sm hover:bg-white/15 transition-colors"
        >
          {step === steps.length - 1
            ? t("onboarding.finish", "Get Started")
            : t("common.next", "Next")}
        </button>
      </div>
    </div>
  );
}
