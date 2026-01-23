import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSettingsStore, ELEVENLABS_VOICES, type VoiceId } from "@/store/useSettingsStore";
import { useSettingsSync } from "@/hooks/useSettingsSync";
import { useDatabase } from "@/hooks/useDatabase";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useHabitStore } from "@/store/useHabitStore";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { supportedLanguages, changeLanguage, type SupportedLanguage } from "@/i18n";
import "@/index.css";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<"general" | "api" | "habits">("general");
  const [localOpenAIKey, setLocalOpenAIKey] = useState("");
  const [localElevenLabsKey, setLocalElevenLabsKey] = useState("");
  const [newHabitName, setNewHabitName] = useState("");

  // Initialize database and sync
  useDatabase();
  const { saveSetting } = useSettingsSync();

  const {
    openaiApiKey,
    elevenLabsApiKey,
    getEffectiveApiKey,
    getElevenLabsApiKey,
    useElevenLabs,
    ttsEnabled,
    ttsVolume,
    ttsVoiceId,
    setOpenAIApiKey,
    setElevenLabsApiKey,
    setUseElevenLabs,
    setTtsEnabled,
    setTtsVolume,
    setTtsVoiceId,
  } = useSettingsStore();

  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const selectedVoice = ELEVENLABS_VOICES.find(v => v.id === ttsVoiceId) || ELEVENLABS_VOICES[0];
  const currentLang = supportedLanguages.find(l => l.code === i18n.language) || supportedLanguages[0];

  const { habits } = useHabitStore();
  const { createHabit, deleteHabit } = useDatabase();
  const { syncHabit } = useCloudSync();

  useEffect(() => {
    setLocalOpenAIKey(openaiApiKey || "");
    setLocalElevenLabsKey(elevenLabsApiKey || "");
  }, [openaiApiKey, elevenLabsApiKey]);

  const envOpenAIKey = import.meta.env.VITE_OPENAI_API_KEY || null;
  const envElevenLabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY || null;

  const isOpenAIFromEnv = !openaiApiKey && !!envOpenAIKey;
  const isElevenLabsFromEnv = !elevenLabsApiKey && !!envElevenLabsKey;
  const isOpenAIConfigured = !!getEffectiveApiKey();
  const isElevenLabsConfigured = !!getElevenLabsApiKey();

  const handleSaveApiKeys = async () => {
    const openaiKey = localOpenAIKey.trim() || null;
    const elevenLabsKey = localElevenLabsKey.trim() || null;

    setOpenAIApiKey(openaiKey);
    setElevenLabsApiKey(elevenLabsKey);

    await saveSetting("openaiApiKey", openaiKey);
    await saveSetting("elevenLabsApiKey", elevenLabsKey);
  };

  const handleToggle = async (key: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value);
    await saveSetting(key, value);
  };

  const handleVolumeChange = async (volume: number) => {
    setTtsVolume(volume);
    await saveSetting("ttsVolume", volume);
  };

  const handleVoiceChange = async (voiceId: VoiceId) => {
    setTtsVoiceId(voiceId);
    await saveSetting("ttsVoiceId", voiceId);
    setShowVoiceDropdown(false);
  };

  const handleLanguageChange = async (lang: SupportedLanguage) => {
    await changeLanguage(lang);
    setShowLanguageDropdown(false);
  };

  const handleAddHabit = async () => {
    if (newHabitName.trim()) {
      const habit = await createHabit(newHabitName.trim());
      setNewHabitName("");
      // Sync to cloud immediately after creating
      if (habit) {
        syncHabit(habit);
      }
    }
  };

  const handleDeleteHabit = async (id: number) => {
    await deleteHabit(id);
  };

  const handleClose = () => {
    getCurrentWindow().close();
  };

  // Get voice description based on current language
  const getVoiceDescription = (voiceName: string) => {
    const key = `voices.${voiceName.toLowerCase()}.description`;
    return t(key);
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-950 text-white/90 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <h1 className="text-lg font-medium">{t("settings.title")}</h1>
        <button
          onClick={handleClose}
          className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex px-6 pt-4 gap-1 border-b border-white/[0.06]">
        {[
          { id: "general", label: t("settings.tabs.general") },
          { id: "api", label: t("settings.tabs.api") },
          { id: "habits", label: t("settings.tabs.habits") },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? "bg-white/[0.06] text-white/90"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "general" && (
          <div className="space-y-6 pb-32">
            {/* Language Selector */}
            <div className="p-4 rounded-xl bg-white/[0.03] space-y-3">
              <p className="text-sm text-white/80">{t("settings.language.label")}</p>

              <div className="relative">
                <button
                  onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{currentLang.flag}</span>
                    <span className="text-sm text-white/90">{currentLang.name}</span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-white/40 transition-transform ${showLanguageDropdown ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showLanguageDropdown && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 p-1 rounded-lg bg-neutral-900 border border-white/10 shadow-xl">
                    {supportedLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-white/[0.06] transition-colors ${
                          lang.code === i18n.language ? "bg-purple-500/10" : ""
                        }`}
                      >
                        <span className="text-xl">{lang.flag}</span>
                        <span className="text-sm text-white/90">{lang.name}</span>
                        {lang.code === i18n.language && (
                          <svg className="w-4 h-4 text-purple-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* TTS Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03]">
              <div>
                <p className="text-sm text-white/80">{t("settings.tts.label")}</p>
                <p className="text-xs text-white/40 mt-1">
                  {t("settings.tts.description")}
                </p>
              </div>
              <Switch
                checked={ttsEnabled}
                onCheckedChange={(checked) => handleToggle("ttsEnabled", checked, setTtsEnabled)}
              />
            </div>

            {/* ElevenLabs TTS Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03]">
              <div>
                <p className="text-sm text-white/80">{t("settings.elevenlabs.label")}</p>
                <p className="text-xs text-white/40 mt-1">
                  {t("settings.elevenlabs.description")}
                </p>
              </div>
              <Switch
                checked={useElevenLabs}
                onCheckedChange={(checked) => handleToggle("useElevenLabs", checked, setUseElevenLabs)}
                disabled={!isElevenLabsConfigured}
              />
            </div>

            {/* Voice and Volume Settings - only show when ElevenLabs is enabled */}
            {isElevenLabsConfigured && useElevenLabs && ttsEnabled && (
              <>
                {/* Voice Selector */}
                <div className="p-4 rounded-xl bg-white/[0.03] space-y-3 overflow-visible">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white/80">{t("settings.voice.label")}</p>
                    <span className="text-xs text-white/40">
                      {selectedVoice.gender === "Feminina" ? t("settings.voice.female") : t("settings.voice.male")}
                    </span>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center text-base">
                          {selectedVoice.gender === "Feminina" ? "👩" : "👨"}
                        </div>
                        <div className="text-left">
                          <p className="text-sm text-white/90">{selectedVoice.name}</p>
                          <p className="text-xs text-white/40">{getVoiceDescription(selectedVoice.name)}</p>
                        </div>
                      </div>
                      <svg
                        className={`w-4 h-4 text-white/40 transition-transform ${showVoiceDropdown ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showVoiceDropdown && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 p-1 rounded-lg bg-neutral-900 border border-white/10 shadow-xl max-h-64 overflow-y-auto">
                        {ELEVENLABS_VOICES.map((voice) => (
                          <button
                            key={voice.id}
                            onClick={() => handleVoiceChange(voice.id as VoiceId)}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-white/[0.06] transition-colors ${
                              voice.id === ttsVoiceId ? "bg-purple-500/10" : ""
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-sm">
                              {voice.gender === "Feminina" ? "👩" : "👨"}
                            </div>
                            <div className="text-left flex-1">
                              <p className="text-sm text-white/90">{voice.name}</p>
                              <p className="text-xs text-white/40">{getVoiceDescription(voice.name)}</p>
                            </div>
                            {voice.id === ttsVoiceId && (
                              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Volume Control */}
                <div className="p-4 rounded-xl bg-white/[0.03] space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white/80">{t("settings.volume.label")}</p>
                    <span className="text-sm text-white/60 font-mono tabular-nums">
                      {Math.round(ttsVolume * 100)}%
                    </span>
                  </div>

                  <Slider
                    value={ttsVolume}
                    onChange={handleVolumeChange}
                    min={0}
                    max={1}
                    step={0.05}
                  />

                  <div className="flex justify-between text-xs text-white/30">
                    <span>🔈 {t("settings.volume.low")}</span>
                    <span>{t("settings.volume.high")} 🔊</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "api" && (
          <div className="space-y-6">
            {/* OpenAI */}
            <div className="p-4 rounded-xl bg-white/[0.03] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white/80">{t("settings.api.openai.title")}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  isOpenAIConfigured
                    ? "bg-green-500/20 text-green-400"
                    : "bg-white/10 text-white/40"
                }`}>
                  {isOpenAIConfigured ? t("settings.api.openai.configured") : t("settings.api.openai.notConfigured")}
                </span>
              </div>
              <p className="text-xs text-white/40">
                {t("settings.api.openai.description")}
              </p>
              <input
                type="password"
                placeholder={isOpenAIFromEnv ? t("settings.api.openai.envPlaceholder") : t("settings.api.openai.placeholder")}
                value={localOpenAIKey}
                onChange={(e) => setLocalOpenAIKey(e.target.value)}
                disabled={isOpenAIFromEnv}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.06] text-white/90 placeholder:text-white/20 focus:outline-none focus:border-white/20 disabled:opacity-50 transition-colors"
              />
            </div>

            {/* ElevenLabs */}
            <div className="p-4 rounded-xl bg-white/[0.03] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white/80">{t("settings.api.elevenlabs.title")}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  isElevenLabsConfigured
                    ? "bg-green-500/20 text-green-400"
                    : "bg-white/10 text-white/40"
                }`}>
                  {isElevenLabsConfigured ? t("settings.api.openai.configured") : t("settings.api.openai.notConfigured")}
                </span>
              </div>
              <p className="text-xs text-white/40">
                {t("settings.api.elevenlabs.description")}
              </p>
              <input
                type="password"
                placeholder={isElevenLabsFromEnv ? t("settings.api.elevenlabs.envPlaceholder") : t("settings.api.elevenlabs.placeholder")}
                value={localElevenLabsKey}
                onChange={(e) => setLocalElevenLabsKey(e.target.value)}
                disabled={isElevenLabsFromEnv}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.06] text-white/90 placeholder:text-white/20 focus:outline-none focus:border-white/20 disabled:opacity-50 transition-colors"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveApiKeys}
              className="w-full py-2.5 rounded-lg bg-white/10 text-white/80 hover:bg-white/15 transition-colors font-medium"
            >
              {t("settings.api.saveKeys")}
            </button>
          </div>
        )}

        {activeTab === "habits" && (
          <div className="space-y-6">
            {/* Add Habit */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t("settings.habits.newHabit")}
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddHabit()}
                className="flex-1 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.06] text-white/90 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
              />
              <button
                onClick={handleAddHabit}
                disabled={!newHabitName.trim()}
                className="px-4 py-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/15 disabled:opacity-50 transition-colors"
              >
                {t("settings.habits.add")}
              </button>
            </div>

            {/* Habits List */}
            <div className="space-y-2">
              {habits.length === 0 ? (
                <p className="text-center text-white/30 py-8">
                  {t("settings.habits.empty")}
                </p>
              ) : (
                habits.map((habit) => (
                  <div
                    key={habit.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] group"
                  >
                    <div>
                      <p className="text-sm text-white/80">{habit.name}</p>
                      <p className="text-xs text-white/40">
                        🔥 {t("settings.habits.streak", { count: habit.streak })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteHabit(habit.id)}
                      className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
