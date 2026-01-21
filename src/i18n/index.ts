import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import pt from "./locales/pt.json";
import en from "./locales/en.json";

export const resources = {
  pt: { translation: pt },
  en: { translation: en },
} as const;

export const supportedLanguages = [
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "en", name: "English", flag: "🇺🇸" },
] as const;

export type SupportedLanguage = typeof supportedLanguages[number]["code"];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "pt",
    defaultNS: "translation",
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "habit-tracker-language",
    },
  });

export default i18n;

// Helper to get current language
export const getCurrentLanguage = (): SupportedLanguage => {
  return (i18n.language?.split("-")[0] as SupportedLanguage) || "pt";
};

// Helper to change language
export const changeLanguage = async (lang: SupportedLanguage): Promise<void> => {
  await i18n.changeLanguage(lang);
  localStorage.setItem("habit-tracker-language", lang);
};
