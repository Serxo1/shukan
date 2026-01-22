import { useState, useRef, memo } from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useSettingsStore, ELEVENLABS_VOICES, type VoiceId } from "@/store/useSettingsStore";
import { useSettingsSync } from "@/hooks/useSettingsSync";
import { supportedLanguages, changeLanguage, type SupportedLanguage } from "@/i18n";
import type { Profile } from "@/types/database";

interface SettingsTabProps {
  isAuthenticated: boolean;
  profile: Profile | null;
  onUpdateProfile: (updates: Partial<Profile>) => Promise<void>;
  onUploadAvatar: (file: File) => Promise<void>;
}

export const SettingsTab = memo(function SettingsTab({
  isAuthenticated,
  profile,
  onUpdateProfile,
  onUploadAvatar,
}: SettingsTabProps) {
  const { t, i18n } = useTranslation();
  const { saveSetting } = useSettingsSync();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const {
    apiMode,
    openaiApiKey,
    elevenLabsApiKey,
    getElevenLabsApiKey,
    useElevenLabs,
    ttsEnabled,
    ttsVolume,
    ttsVoiceId,
    setApiMode,
    setOpenAIApiKey,
    setElevenLabsApiKey,
    setUseElevenLabs,
    setTtsEnabled,
    setTtsVolume,
    setTtsVoiceId,
  } = useSettingsStore();

  const [localOpenAIKey, setLocalOpenAIKey] = useState(openaiApiKey || "");
  const [localElevenLabsKey, setLocalElevenLabsKey] = useState(elevenLabsApiKey || "");
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const selectedVoice = ELEVENLABS_VOICES.find((v) => v.id === ttsVoiceId) || ELEVENLABS_VOICES[0];
  const currentLang = supportedLanguages.find((l) => l.code === i18n.language) || supportedLanguages[0];

  const envOpenAIKey = import.meta.env.VITE_OPENAI_API_KEY || null;
  const envElevenLabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY || null;
  const isOpenAIFromEnv = !openaiApiKey && !!envOpenAIKey;
  const isElevenLabsFromEnv = !elevenLabsApiKey && !!envElevenLabsKey;
  const usingEdgeFunctions = apiMode === 'default' && isAuthenticated;
  const isElevenLabsConfigured = usingEdgeFunctions || !!getElevenLabsApiKey();

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

  const handleSaveApiKeys = async () => {
    const openaiKey = localOpenAIKey.trim() || null;
    const elevenLabsKey = localElevenLabsKey.trim() || null;
    setOpenAIApiKey(openaiKey);
    setElevenLabsApiKey(elevenLabsKey);
    await saveSetting("openaiApiKey", openaiKey);
    await saveSetting("elevenLabsApiKey", elevenLabsKey);
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      await onUploadAvatar(file);
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  const handleSaveProfile = async () => {
    if (editDisplayName.trim()) {
      setIsSavingProfile(true);
      try {
        await onUpdateProfile({ display_name: editDisplayName.trim() });
      } finally {
        setIsSavingProfile(false);
      }
    }
    setIsEditingProfile(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-md space-y-8">
        {/* Profile Section */}
        {isAuthenticated && profile && (
          <div className="space-y-5 pb-6 border-b border-[rgba(168,162,158,0.06)]">
            <h3 className="text-[10px] text-[#78716c] uppercase tracking-[0.3em]">
              {t("settings.profile.title", "Perfil")}
            </h3>

            <div className="flex items-center gap-5">
              {/* Avatar */}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <button
                onClick={handleAvatarClick}
                disabled={isUploadingAvatar}
                className="relative w-16 h-16 rounded-sm bg-[rgba(168,162,158,0.08)] flex items-center justify-center overflow-hidden group hover:ring-1 hover:ring-[rgba(168,162,158,0.3)] transition-all duration-500 disabled:opacity-50"
                title="Upload avatar"
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[#78716c] text-lg font-display italic">
                    {(profile.display_name || profile.username || "?")[0].toUpperCase()}
                  </span>
                )}
                {/* Upload overlay */}
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                  {isUploadingAvatar ? (
                    <div className="w-4 h-4 border border-[#a8a29e]/40 border-t-[#a8a29e] rounded-full animate-spin" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#a8a29e]">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  )}
                </div>
              </button>

              {/* Info */}
              <div className="flex-1">
                {isEditingProfile ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      placeholder={t("settings.profile.displayName", "Nome de exibição")}
                      className="flex-1 px-3 py-1.5 bg-transparent border border-[rgba(168,162,158,0.1)] rounded-sm text-sm text-[#fafaf9]/80 placeholder:text-[#78716c]/40 focus:outline-none focus:border-[rgba(168,162,158,0.3)] transition-all duration-500"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="px-3 py-1.5 rounded-sm border border-[rgba(168,162,158,0.2)] text-[#a8a29e] text-xs hover:bg-[rgba(168,162,158,0.1)] transition-all duration-500 disabled:opacity-50"
                    >
                      {isSavingProfile ? "..." : t("common.save")}
                    </button>
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      className="px-3 py-1.5 rounded-sm text-[#78716c] text-xs hover:text-[#a8a29e] transition-all duration-500"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-[#fafaf9]/80 tracking-wide">{profile.display_name || profile.username}</p>
                      <button
                        onClick={() => {
                          setEditDisplayName(profile.display_name || "");
                          setIsEditingProfile(true);
                        }}
                        className="p-1.5 rounded-sm text-[#78716c]/40 hover:text-[#a8a29e] transition-all duration-500"
                        title={t("settings.profile.edit", "Editar")}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-[#78716c]/50 tracking-wide">@{profile.username}</p>
                  </>
                )}
              </div>
            </div>

            {/* Public Profile Toggle */}
            <div className="flex items-center justify-between py-3 px-4 rounded-sm border border-[rgba(168,162,158,0.06)] bg-[rgba(168,162,158,0.02)]">
              <div>
                <p className="text-sm text-[#a8a29e] tracking-wide">{t("settings.profile.publicProfile", "Perfil público")}</p>
                <p className="text-[10px] text-[#78716c]/50 mt-1 tracking-wide">
                  {t("settings.profile.publicDescription", "Aparecer no ranking global")}
                </p>
              </div>
              <Switch
                checked={profile.is_public || false}
                onCheckedChange={async (checked) => {
                  await onUpdateProfile({ is_public: checked });
                }}
              />
            </div>
          </div>
        )}

        {/* Language */}
        <div className="space-y-3">
          <label className="text-[10px] text-[#78716c] uppercase tracking-[0.3em]">
            {t("settings.language.label")}
          </label>
          <div className="relative">
            <button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="w-full flex items-center justify-between px-4 py-3 border border-[rgba(168,162,158,0.1)] rounded-sm text-sm text-[#a8a29e] hover:border-[rgba(168,162,158,0.2)] transition-all duration-500"
            >
              <div className="flex items-center gap-3">
                <span>{currentLang.flag}</span>
                <span className="tracking-wide">{currentLang.name}</span>
              </div>
              <svg className={`w-4 h-4 text-[#78716c] transition-transform duration-500 ${showLanguageDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showLanguageDropdown && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 py-1 bg-[#0a0a0a] rounded-sm border border-[rgba(168,162,158,0.1)] shadow-xl">
                {supportedLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[rgba(168,162,158,0.05)] transition-all duration-500 ${
                      lang.code === i18n.language ? "text-[#fafaf9]" : "text-[#78716c]"
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span className="tracking-wide">{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* API Mode */}
        <div className="space-y-4 py-5 border-t border-b border-[rgba(168,162,158,0.06)]">
          <div>
            <p className="text-sm text-[#a8a29e] tracking-wide">{t("settings.apiMode.label", "API Mode")}</p>
            <p className="text-[10px] text-[#78716c]/50 mt-1 tracking-wide">
              {t("settings.apiMode.description", "Choose how to connect to AI services")}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                setApiMode('default');
                await saveSetting('apiMode', 'default');
              }}
              className={`flex-1 px-4 py-3 rounded-sm text-xs transition-all duration-500 border ${
                apiMode === 'default'
                  ? 'border-[rgba(168,162,158,0.3)] bg-[rgba(168,162,158,0.1)] text-[#fafaf9]'
                  : 'border-[rgba(168,162,158,0.08)] text-[#78716c] hover:border-[rgba(168,162,158,0.15)]'
              }`}
            >
              <div className="font-medium tracking-wide">{t("settings.apiMode.default", "Default")}</div>
              <div className="text-[10px] mt-1 opacity-50">
                {t("settings.apiMode.defaultDesc", "Use our servers (requires login)")}
              </div>
            </button>
            <button
              onClick={async () => {
                setApiMode('custom');
                await saveSetting('apiMode', 'custom');
              }}
              className={`flex-1 px-4 py-3 rounded-sm text-xs transition-all duration-500 border ${
                apiMode === 'custom'
                  ? 'border-[rgba(168,162,158,0.3)] bg-[rgba(168,162,158,0.1)] text-[#fafaf9]'
                  : 'border-[rgba(168,162,158,0.08)] text-[#78716c] hover:border-[rgba(168,162,158,0.15)]'
              }`}
            >
              <div className="font-medium tracking-wide">{t("settings.apiMode.custom", "Custom Keys")}</div>
              <div className="text-[10px] mt-1 opacity-50">
                {t("settings.apiMode.customDesc", "Use your own API keys")}
              </div>
            </button>
          </div>
          {apiMode === 'default' && !isAuthenticated && (
            <p className="text-[10px] text-[#b5a27d] tracking-wide">
              {t("settings.apiMode.loginRequired", "Login required for default mode")}
            </p>
          )}
          {apiMode === 'default' && isAuthenticated && (
            <p className="text-[10px] text-[#78716c]/50 tracking-wide">
              {t("settings.apiMode.voiceNote", "Note: Voice input requires custom keys (OpenAI Realtime API)")}
            </p>
          )}
        </div>

        {/* TTS */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm text-[#a8a29e] tracking-wide">{t("settings.tts.label")}</p>
            <p className="text-[10px] text-[#78716c]/50 mt-1 tracking-wide">{t("settings.tts.description")}</p>
          </div>
          <Switch checked={ttsEnabled} onCheckedChange={(v) => handleToggle("ttsEnabled", v, setTtsEnabled)} />
        </div>

        {/* ElevenLabs toggle */}
        {ttsEnabled && (
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm text-[#a8a29e] tracking-wide">{t("settings.elevenlabs.label")}</p>
              <p className="text-[10px] text-[#78716c]/50 mt-1 tracking-wide">{t("settings.elevenlabs.description")}</p>
            </div>
            <Switch
              checked={useElevenLabs}
              onCheckedChange={(v) => handleToggle("useElevenLabs", v, setUseElevenLabs)}
              disabled={!isElevenLabsConfigured}
            />
          </div>
        )}

        {/* Voice selector */}
        {ttsEnabled && useElevenLabs && isElevenLabsConfigured && (
          <>
            <div className="space-y-3">
              <label className="text-[10px] text-[#78716c] uppercase tracking-[0.3em]">
                {t("settings.voice.label")}
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 border border-[rgba(168,162,158,0.1)] rounded-sm text-sm text-[#a8a29e] hover:border-[rgba(168,162,158,0.2)] transition-all duration-500"
                >
                  <span className="tracking-wide">{selectedVoice.name}</span>
                  <svg className={`w-4 h-4 text-[#78716c] transition-transform duration-500 ${showVoiceDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showVoiceDropdown && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 py-1 bg-[#0a0a0a] rounded-sm border border-[rgba(168,162,158,0.1)] shadow-xl max-h-48 overflow-y-auto">
                    {ELEVENLABS_VOICES.map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => handleVoiceChange(voice.id as VoiceId)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[rgba(168,162,158,0.05)] transition-all duration-500 ${
                          voice.id === ttsVoiceId ? "text-[#fafaf9]" : "text-[#78716c]"
                        }`}
                      >
                        <span className="tracking-wide">{voice.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Volume */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-[#78716c] uppercase tracking-[0.3em]">
                  {t("settings.volume.label")}
                </label>
                <span className="font-mono text-xs text-[#78716c]/50">{Math.round(ttsVolume * 100)}%</span>
              </div>
              <Slider value={ttsVolume} onChange={handleVolumeChange} min={0} max={1} step={0.05} />
            </div>
          </>
        )}

        {/* Advanced section - Only show in custom API mode */}
        {apiMode === 'custom' && (
          <div className="pt-5 border-t border-[rgba(168,162,158,0.06)]">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-[10px] text-[#78716c] uppercase tracking-[0.3em] hover:text-[#a8a29e] transition-all duration-500"
            >
              <svg className={`w-3 h-3 transition-transform duration-500 ${showAdvanced ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {t("settings.tabs.api")}
            </button>

            {showAdvanced && (
              <div className="mt-5 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] text-[#78716c] tracking-[0.2em]">OpenAI</label>
                  <input
                    type="password"
                    placeholder={isOpenAIFromEnv ? t("settings.api.openai.envPlaceholder") : "sk-..."}
                    value={localOpenAIKey}
                    onChange={(e) => setLocalOpenAIKey(e.target.value)}
                    disabled={isOpenAIFromEnv}
                    className="w-full px-4 py-2.5 bg-transparent border border-[rgba(168,162,158,0.1)] rounded-sm text-sm text-[#fafaf9]/80 placeholder:text-[#78716c]/40 focus:outline-none focus:border-[rgba(168,162,158,0.3)] disabled:opacity-40 transition-all duration-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-[#78716c] tracking-[0.2em]">ElevenLabs</label>
                  <input
                    type="password"
                    placeholder={isElevenLabsFromEnv ? t("settings.api.elevenlabs.envPlaceholder") : "xi-..."}
                    value={localElevenLabsKey}
                    onChange={(e) => setLocalElevenLabsKey(e.target.value)}
                    disabled={isElevenLabsFromEnv}
                    className="w-full px-4 py-2.5 bg-transparent border border-[rgba(168,162,158,0.1)] rounded-sm text-sm text-[#fafaf9]/80 placeholder:text-[#78716c]/40 focus:outline-none focus:border-[rgba(168,162,158,0.3)] disabled:opacity-40 transition-all duration-500"
                  />
                </div>
                <button
                  onClick={handleSaveApiKeys}
                  className="w-full py-2.5 border border-[rgba(168,162,158,0.2)] rounded-sm text-sm text-[#a8a29e] hover:bg-[rgba(168,162,158,0.1)] hover:border-[rgba(168,162,158,0.4)] transition-all duration-500 tracking-wide"
                >
                  {t("settings.api.saveKeys")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
