import { create } from "zustand";
import { persist } from "zustand/middleware";

// API Mode types
export type ApiMode = 'default' | 'custom';

const getEnvOpenAIKey = (): string | null => {
  return import.meta.env.VITE_OPENAI_API_KEY || null;
};

const getEnvElevenLabsKey = (): string | null => {
  return import.meta.env.VITE_ELEVENLABS_API_KEY || null;
};

// ElevenLabs voices that work well with Portuguese
export const ELEVENLABS_VOICES = [
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", gender: "Feminina", description: "Suave e natural" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", gender: "Feminina", description: "Clara e expressiva" },
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", gender: "Feminina", description: "Amigável e calorosa" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", gender: "Masculina", description: "Grave e confiante" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", gender: "Masculina", description: "Jovem e dinâmica" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", gender: "Masculina", description: "Profunda e calma" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", gender: "Feminina", description: "Jovem e energética" },
  { id: "jBpfuIE2acCO8z3wKNLl", name: "Gigi", gender: "Feminina", description: "Animada e vibrante" },
] as const;

export type VoiceId = typeof ELEVENLABS_VOICES[number]["id"];

interface SettingsStore {
  apiMode: ApiMode; // 'default' uses Edge Functions, 'custom' uses user's keys
  openaiApiKey: string | null;
  elevenLabsApiKey: string | null;
  useOpenAIRealtime: boolean;
  useElevenLabs: boolean;
  ttsEnabled: boolean; // Master TTS toggle
  ttsVolume: number; // 0-1 volume level
  ttsVoiceId: VoiceId; // Selected ElevenLabs voice
  language: string;

  // Getters
  getEffectiveApiKey: () => string | null;
  getElevenLabsApiKey: () => string | null;
  isUsingEdgeFunctions: () => boolean;
  canUseVoiceInput: () => boolean; // Voice input requires custom keys

  // Setters
  setApiMode: (mode: ApiMode) => void;
  setOpenAIApiKey: (key: string | null) => void;
  setElevenLabsApiKey: (key: string | null) => void;
  setUseOpenAIRealtime: (use: boolean) => void;
  setUseElevenLabs: (use: boolean) => void;
  setTtsEnabled: (enabled: boolean) => void;
  setTtsVolume: (volume: number) => void;
  setTtsVoiceId: (voiceId: VoiceId) => void;
  setLanguage: (lang: string) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      apiMode: 'default' as ApiMode, // Default uses Edge Functions
      openaiApiKey: null,
      elevenLabsApiKey: null,
      useOpenAIRealtime: true,
      useElevenLabs: true,
      ttsEnabled: true,
      ttsVolume: 0.5, // Default 50% volume
      ttsVoiceId: "pFZP5JQG7iQjIQuC4Bku", // Lily as default
      language: "pt",

      // Returns API key only in custom mode (or from env for dev)
      getEffectiveApiKey: () => {
        const { apiMode, openaiApiKey } = get();
        if (apiMode === 'custom') {
          return openaiApiKey || getEnvOpenAIKey();
        }
        // In default mode, return env key for dev or null for Edge Functions
        return getEnvOpenAIKey();
      },

      getElevenLabsApiKey: () => {
        const { apiMode, elevenLabsApiKey } = get();
        if (apiMode === 'custom') {
          return elevenLabsApiKey || getEnvElevenLabsKey();
        }
        return getEnvElevenLabsKey();
      },

      isUsingEdgeFunctions: () => {
        const { apiMode } = get();
        // Use Edge Functions in default mode AND when no env keys present
        return apiMode === 'default' && !getEnvOpenAIKey();
      },

      canUseVoiceInput: () => {
        const { apiMode, openaiApiKey } = get();
        // Voice input requires user's own OpenAI key (Realtime API uses WebSocket)
        return apiMode === 'custom' && !!(openaiApiKey || getEnvOpenAIKey());
      },

      setApiMode: (mode) => set({ apiMode: mode }),
      setOpenAIApiKey: (key) => set({ openaiApiKey: key }),
      setElevenLabsApiKey: (key) => set({ elevenLabsApiKey: key }),
      setUseOpenAIRealtime: (use) => set({ useOpenAIRealtime: use }),
      setUseElevenLabs: (use) => set({ useElevenLabs: use }),
      setTtsEnabled: (enabled) => set({ ttsEnabled: enabled }),
      setTtsVolume: (volume) => set({ ttsVolume: Math.max(0, Math.min(1, volume)) }),
      setTtsVoiceId: (voiceId) => set({ ttsVoiceId: voiceId }),
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: "habit-tracker-settings",
    }
  )
);
