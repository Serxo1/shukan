import { useCallback, useEffect, useRef } from "react";
import Database from "@tauri-apps/plugin-sql";
import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useSettingsStore, type VoiceId } from "@/store/useSettingsStore";

interface DbSetting {
  key: string;
  value: string;
}

const SETTINGS_CHANGED_EVENT = "settings-changed";

export function useSettingsSync() {
  const dbRef = useRef<Database | null>(null);
  const unlistenRef = useRef<UnlistenFn | null>(null);

  const {
    setOpenAIApiKey,
    setElevenLabsApiKey,
    setUseOpenAIRealtime,
    setUseElevenLabs,
    setTtsEnabled,
    setTtsVolume,
    setTtsVoiceId,
    setLanguage,
  } = useSettingsStore();

  const getDb = useCallback(async (): Promise<Database> => {
    if (!dbRef.current) {
      dbRef.current = await Database.load("sqlite:habits.db");
    }
    return dbRef.current;
  }, []);

  // Load settings from database into store
  const loadSettings = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<DbSetting[]>("SELECT * FROM settings");

      const settings: Record<string, string> = {};
      rows.forEach((row) => {
        settings[row.key] = row.value;
      });

      // Apply settings to store
      if (settings.openaiApiKey !== undefined) {
        setOpenAIApiKey(settings.openaiApiKey || null);
      }
      if (settings.elevenLabsApiKey !== undefined) {
        setElevenLabsApiKey(settings.elevenLabsApiKey || null);
      }
      if (settings.useOpenAIRealtime !== undefined) {
        setUseOpenAIRealtime(settings.useOpenAIRealtime === "true");
      }
      if (settings.useElevenLabs !== undefined) {
        setUseElevenLabs(settings.useElevenLabs === "true");
      }
      if (settings.ttsEnabled !== undefined) {
        setTtsEnabled(settings.ttsEnabled === "true");
      }
      if (settings.ttsVolume !== undefined) {
        setTtsVolume(parseFloat(settings.ttsVolume) || 0.5);
      }
      if (settings.ttsVoiceId !== undefined) {
        setTtsVoiceId(settings.ttsVoiceId as VoiceId);
      }
      if (settings.language !== undefined) {
        setLanguage(settings.language);
      }
    } catch (err) {
      console.error("[SettingsSync] Failed to load settings:", err);
    }
  }, [getDb, setOpenAIApiKey, setElevenLabsApiKey, setUseOpenAIRealtime, setUseElevenLabs, setTtsEnabled, setTtsVolume, setTtsVoiceId, setLanguage]);

  // Save a single setting to database and emit event
  const saveSetting = useCallback(
    async (key: string, value: string | boolean | number | null) => {
      try {
        const db = await getDb();
        const stringValue = value === null ? "" : String(value);

        await db.execute(
          `INSERT INTO settings (key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          [key, stringValue]
        );

        // Emit event to notify other windows
        await emit(SETTINGS_CHANGED_EVENT, { key, value: stringValue });
      } catch (err) {
        console.error("[SettingsSync] Failed to save setting:", err);
      }
    },
    [getDb]
  );

  // Save all current settings from store to database
  const saveAllSettings = useCallback(async () => {
    const state = useSettingsStore.getState();
    await saveSetting("openaiApiKey", state.openaiApiKey);
    await saveSetting("elevenLabsApiKey", state.elevenLabsApiKey);
    await saveSetting("useOpenAIRealtime", state.useOpenAIRealtime);
    await saveSetting("useElevenLabs", state.useElevenLabs);
    await saveSetting("ttsEnabled", state.ttsEnabled);
    await saveSetting("ttsVolume", state.ttsVolume);
    await saveSetting("ttsVoiceId", state.ttsVoiceId);
    await saveSetting("language", state.language);
  }, [saveSetting]);

  // Listen for settings changes from other windows
  useEffect(() => {
    const setupListener = async () => {
      unlistenRef.current = await listen<{ key: string; value: string }>(
        SETTINGS_CHANGED_EVENT,
        (event) => {
          const { key, value } = event.payload;
          console.log("[SettingsSync] Received settings change:", key, value);

          // Update store based on key
          switch (key) {
            case "openaiApiKey":
              setOpenAIApiKey(value || null);
              break;
            case "elevenLabsApiKey":
              setElevenLabsApiKey(value || null);
              break;
            case "useOpenAIRealtime":
              setUseOpenAIRealtime(value === "true");
              break;
            case "useElevenLabs":
              setUseElevenLabs(value === "true");
              break;
            case "ttsEnabled":
              setTtsEnabled(value === "true");
              break;
            case "ttsVolume":
              setTtsVolume(parseFloat(value) || 0.5);
              break;
            case "ttsVoiceId":
              setTtsVoiceId(value as VoiceId);
              break;
            case "language":
              setLanguage(value);
              break;
          }
        }
      );
    };

    setupListener();

    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
      }
    };
  }, [setOpenAIApiKey, setElevenLabsApiKey, setUseOpenAIRealtime, setUseElevenLabs, setTtsEnabled, setTtsVolume, setTtsVoiceId, setLanguage]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    loadSettings,
    saveSetting,
    saveAllSettings,
  };
}
