import { create } from "zustand";
import { persist } from "zustand/middleware";

const getEnvOpenAIKey = (): string | null => {
  return import.meta.env.VITE_OPENAI_API_KEY || null;
};

const getEnvElevenLabsKey = (): string | null => {
  return import.meta.env.VITE_ELEVENLABS_API_KEY || null;
};

interface SettingsStore {
  openaiApiKey: string | null;
  elevenLabsApiKey: string | null;
  useOpenAIRealtime: boolean;
  useElevenLabs: boolean;
  ttsEnabled: boolean; // Master TTS toggle
  language: string;

  getEffectiveApiKey: () => string | null;
  getElevenLabsApiKey: () => string | null;
  setOpenAIApiKey: (key: string | null) => void;
  setElevenLabsApiKey: (key: string | null) => void;
  setUseOpenAIRealtime: (use: boolean) => void;
  setUseElevenLabs: (use: boolean) => void;
  setTtsEnabled: (enabled: boolean) => void;
  setLanguage: (lang: string) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      openaiApiKey: null,
      elevenLabsApiKey: null,
      useOpenAIRealtime: true,
      useElevenLabs: true,
      ttsEnabled: true,
      language: "pt",

      getEffectiveApiKey: () => get().openaiApiKey || getEnvOpenAIKey(),
      getElevenLabsApiKey: () => get().elevenLabsApiKey || getEnvElevenLabsKey(),
      setOpenAIApiKey: (key) => set({ openaiApiKey: key }),
      setElevenLabsApiKey: (key) => set({ elevenLabsApiKey: key }),
      setUseOpenAIRealtime: (use) => set({ useOpenAIRealtime: use }),
      setUseElevenLabs: (use) => set({ useElevenLabs: use }),
      setTtsEnabled: (enabled) => set({ ttsEnabled: enabled }),
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: "habit-tracker-settings",
    }
  )
);
