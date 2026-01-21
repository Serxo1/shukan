import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useDatabase } from "@/hooks/useDatabase";
import { useHabitStore } from "@/store/useHabitStore";
import { useSettingsStore, ELEVENLABS_VOICES, type VoiceId } from "@/store/useSettingsStore";
import { useSettingsSync } from "@/hooks/useSettingsSync";
import { useCloudSync } from "@/hooks/useCloudSync";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { SocialTab } from "@/components/social";
import { supportedLanguages, changeLanguage, type SupportedLanguage } from "@/i18n";
import { ACHIEVEMENTS } from "@/lib/achievements";
import type { Achievement } from "@/types";
import "@/index.css";

type Tab = "habits" | "stats" | "social" | "settings";

// Map snake_case codes to camelCase for i18n
const codeToI18nKey = (code: string): string => {
  const map: Record<string, string> = {
    first_habit: "firstHabit",
    first_completion: "firstCompletion",
    streak_7: "streak7",
    streak_30: "streak30",
    streak_100: "streak100",
    perfect_day: "perfectDay",
    perfect_week: "perfectWeek",
    five_habits: "fiveHabits",
    early_bird: "earlyBird",
    night_owl: "nightOwl",
    comeback: "comeback",
    goal_achieved: "goalAchieved",
  };
  return map[code] || code;
};

// Get week days starting from Monday
function getWeekDays() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("habits");
  const { profile, signOut, isAuthenticated, updateProfile, uploadAvatar } = useAuth();
  const { habits } = useHabitStore();
  const { createHabit, deleteHabit, completeHabit, getTodayCompletions, getCompletionsForDateRange, getAchievements } = useDatabase();
  const { isSyncing } = useCloudSync();
  const { saveSetting } = useSettingsSync();

  const [newHabitName, setNewHabitName] = useState("");
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [weekCompletions, setWeekCompletions] = useState<Map<string, Set<number>>>(new Map());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Settings state
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

  const [localOpenAIKey, setLocalOpenAIKey] = useState("");
  const [localElevenLabsKey, setLocalElevenLabsKey] = useState("");
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  const selectedVoice = ELEVENLABS_VOICES.find((v) => v.id === ttsVoiceId) || ELEVENLABS_VOICES[0];
  const currentLang = supportedLanguages.find((l) => l.code === i18n.language) || supportedLanguages[0];

  const envOpenAIKey = import.meta.env.VITE_OPENAI_API_KEY || null;
  const envElevenLabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY || null;
  const isOpenAIFromEnv = !openaiApiKey && !!envOpenAIKey;
  const isElevenLabsFromEnv = !elevenLabsApiKey && !!envElevenLabsKey;
  // ElevenLabs is available via Edge Functions (default mode + authenticated) or direct API key
  const usingEdgeFunctions = apiMode === 'default' && isAuthenticated;
  const isElevenLabsConfigured = usingEdgeFunctions || !!getElevenLabsApiKey();

  const weekDays = useMemo(() => getWeekDays(), []);
  const todayKey = formatDateKey(new Date());

  useEffect(() => {
    setLocalOpenAIKey(openaiApiKey || "");
    setLocalElevenLabsKey(elevenLabsApiKey || "");
  }, [openaiApiKey, elevenLabsApiKey]);

  useEffect(() => {
    getTodayCompletions().then((c) => setCompletedIds(new Set(c.map((x) => x.habitId))));
  }, [getTodayCompletions, habits]);

  // Load week completions
  useEffect(() => {
    if (weekDays.length > 0) {
      const startDate = formatDateKey(weekDays[0]);
      const endDate = formatDateKey(weekDays[6]);
      getCompletionsForDateRange(startDate, endDate).then((completions) => {
        const map = new Map<string, Set<number>>();
        completions.forEach((c) => {
          if (!map.has(c.date)) map.set(c.date, new Set());
          map.get(c.date)!.add(c.habitId);
        });
        setWeekCompletions(map);
      });
    }
  }, [weekDays, getCompletionsForDateRange, habits, completedIds]);

  // Load achievements
  useEffect(() => {
    getAchievements().then(setAchievements);
  }, [getAchievements]);

  // Helper to check if achievement is unlocked
  const isUnlocked = (code: string) => achievements.some(a => a.code === code);

  const handleAddHabit = async () => {
    if (newHabitName.trim()) {
      await createHabit(newHabitName.trim());
      setNewHabitName("");
    }
  };

  const handleToggleHabit = async (habitId: number) => {
    if (!completedIds.has(habitId)) {
      await completeHabit(habitId);
      setCompletedIds((prev) => new Set([...prev, habitId]));
    }
  };

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

  const handleClose = () => getCurrentWindow().close();
  const handleMinimize = () => getCurrentWindow().minimize();
  const handleLogout = async () => await signOut();

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      await uploadAvatar(file);
    } catch (error) {
      console.error("Failed to upload avatar:", error);
    } finally {
      setIsUploadingAvatar(false);
      // Reset input so same file can be selected again
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  const completedCount = habits.filter((h) => completedIds.has(h.id)).length;
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0);

  const navItems: { id: Tab; label: string }[] = [
    { id: "habits", label: t("dashboard.tabs.habits") },
    { id: "stats", label: t("dashboard.tabs.stats") },
    { id: "social", label: t("dashboard.tabs.social") },
    { id: "settings", label: t("dashboard.tabs.settings") },
  ];

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-white overflow-hidden select-none">
      {/* Title bar */}
      <div className="h-9 flex-shrink-0 flex items-center justify-between px-3" data-tauri-drag-region>
        <span className="text-[11px] text-white/20 tracking-wide uppercase" data-tauri-drag-region>
          {t("app.name")}
        </span>
        <div className="flex items-center gap-0.5">
          {isSyncing && (
            <div className="w-6 h-6 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse" />
            </div>
          )}
          <button
            onClick={handleMinimize}
            className="w-6 h-6 flex items-center justify-center text-white/20 hover:text-white/50 transition-colors"
          >
            <svg width="8" height="1" fill="currentColor"><rect width="8" height="1" /></svg>
          </button>
          <button
            onClick={handleClose}
            className="w-6 h-6 flex items-center justify-center text-white/20 hover:text-white/50 transition-colors"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M1 1l6 6M7 1l-6 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-44 flex-shrink-0 flex flex-col border-r border-white/[0.04]">
          {/* Nav */}
          <nav className="flex-1 p-2 pt-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full text-left px-3 py-2 text-[13px] transition-colors ${
                  activeTab === item.id
                    ? "text-white/90"
                    : "text-white/30 hover:text-white/50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* User */}
          <div className="p-3 border-t border-white/[0.04]">
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="px-2 py-1">
                  <p className="text-[11px] text-white/40 truncate">
                    {profile?.display_name || profile?.username || "User"}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-2 py-1 text-[11px] text-white/20 hover:text-white/40 transition-colors"
                >
                  {t("dashboard.logout")}
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-white/20 px-2">{t("dashboard.offlineMode")}</p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Habits Tab */}
          {activeTab === "habits" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Week strip + Progress */}
              <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-white/[0.04]">
                <div className="flex items-end justify-between">
                  {/* Week calendar */}
                  <div className="flex gap-3">
                    {weekDays.map((day, i) => {
                      const dateKey = formatDateKey(day);
                      const isToday = dateKey === todayKey;
                      const dayCompletions = weekCompletions.get(dateKey) || new Set();
                      const completedRatio = habits.length > 0 ? dayCompletions.size / habits.length : 0;

                      return (
                        <div key={i} className="flex flex-col items-center gap-1.5">
                          <span className={`text-[10px] ${isToday ? "text-white/60" : "text-white/20"}`}>
                            {dayLabels[i]}
                          </span>
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono ${
                              isToday
                                ? "bg-white/10 text-white/80"
                                : "text-white/30"
                            }`}
                          >
                            {day.getDate()}
                          </div>
                          {/* Completion indicator */}
                          <div className="w-1.5 h-1.5 rounded-full" style={{
                            backgroundColor: completedRatio === 1
                              ? "rgba(255,255,255,0.6)"
                              : completedRatio > 0
                                ? "rgba(255,255,255,0.25)"
                                : "rgba(255,255,255,0.06)"
                          }} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Today's progress */}
                  <div className="text-right">
                    <div className="font-mono text-2xl text-white/90 tracking-tight">
                      {completedCount}<span className="text-white/20">/{habits.length}</span>
                    </div>
                    <p className="text-[11px] text-white/30 mt-0.5">{t("dashboard.completedToday")}</p>
                  </div>
                </div>
              </div>

              {/* Habits list */}
              <div className="flex-1 overflow-y-auto">
                {habits.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-6">
                    <p className="text-white/30 text-sm">{t("dashboard.noHabits")}</p>
                    <p className="text-white/15 text-xs mt-1">{t("dashboard.addFirstHabit")}</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-1">
                    {habits.map((habit) => {
                      const isCompleted = completedIds.has(habit.id);
                      return (
                        <div
                          key={habit.id}
                          onClick={() => handleToggleHabit(habit.id)}
                          className={`group flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors ${
                            isCompleted ? "bg-white/[0.02]" : "hover:bg-white/[0.02]"
                          }`}
                        >
                          {/* Checkbox */}
                          <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                            isCompleted
                              ? "bg-white/80 border-white/80"
                              : "border-white/15 group-hover:border-white/25"
                          }`}>
                            {isCompleted && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4l3 3 5-6" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>

                          {/* Color dot */}
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: habit.color || "#fff" }}
                          />

                          {/* Name */}
                          <span className={`flex-1 text-sm transition-colors ${
                            isCompleted ? "text-white/30" : "text-white/70"
                          }`}>
                            {habit.name}
                          </span>

                          {/* Streak */}
                          {habit.streak > 0 && (
                            <span className="text-[11px] font-mono text-white/20">
                              {habit.streak}d
                            </span>
                          )}

                          {/* Delete */}
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteHabit(habit.id); }}
                            className="w-6 h-6 flex items-center justify-center text-white/0 group-hover:text-white/20 hover:!text-white/40 transition-colors"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                              <path d="M2 2l8 8M10 2l-8 8" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add habit */}
              <div className="flex-shrink-0 p-4 border-t border-white/[0.04]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t("dashboard.newHabitPlaceholder")}
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddHabit()}
                    className="flex-1 px-3 py-2 bg-white/[0.03] rounded-lg text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:bg-white/[0.05] transition-colors"
                  />
                  <button
                    onClick={handleAddHabit}
                    disabled={!newHabitName.trim()}
                    className="px-4 py-2 bg-white/[0.06] rounded-lg text-sm text-white/60 hover:bg-white/[0.1] hover:text-white/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    {t("common.add")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === "stats" && (
            <div className="flex-1 overflow-y-auto p-6">
              {/* Overview */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 rounded-lg bg-white/[0.02]">
                  <p className="font-mono text-3xl text-white/80">{habits.length}</p>
                  <p className="text-[11px] text-white/30 mt-1">{t("dashboard.stats.totalHabits")}</p>
                </div>
                <div className="p-4 rounded-lg bg-white/[0.02]">
                  <p className="font-mono text-3xl text-white/80">
                    {habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0}
                    <span className="text-lg text-white/30">%</span>
                  </p>
                  <p className="text-[11px] text-white/30 mt-1">{t("widgets.stats.completionRate")}</p>
                </div>
                <div className="p-4 rounded-lg bg-white/[0.02]">
                  <p className="font-mono text-3xl text-white/80">{bestStreak}</p>
                  <p className="text-[11px] text-white/30 mt-1">{t("widgets.stats.bestStreak")}</p>
                </div>
              </div>

              {/* Per-habit stats */}
              {habits.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[11px] text-white/30 uppercase tracking-wide mb-3">
                    {t("dashboard.tabs.habits")}
                  </h3>
                  {habits.map((habit) => (
                    <div key={habit.id} className="flex items-center gap-3 py-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: habit.color || "#fff" }}
                      />
                      <span className="flex-1 text-sm text-white/60">{habit.name}</span>
                      <div className="w-24 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white/30 rounded-full transition-all"
                          style={{ width: `${Math.min((habit.streak / 30) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-white/30 w-8 text-right">
                        {habit.streak}d
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {habits.length === 0 && (
                <p className="text-center text-white/20 text-sm py-12">
                  {t("dashboard.stats.moreComingSoon")}
                </p>
              )}

              {/* Achievements */}
              <div className="mt-8 pt-6 border-t border-white/[0.04]">
                <h3 className="text-[11px] text-white/30 uppercase tracking-wide mb-4">
                  {t("achievements.title")}
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {ACHIEVEMENTS.map((def) => {
                    const unlocked = isUnlocked(def.code);
                    const achievement = achievements.find(a => a.code === def.code);
                    const i18nKey = codeToI18nKey(def.code);
                    return (
                      <div
                        key={def.code}
                        className={`p-3 rounded-lg text-center transition-all ${
                          unlocked
                            ? "bg-white/[0.06]"
                            : "bg-white/[0.02]"
                        }`}
                        title={unlocked && achievement?.unlockedAt
                          ? new Date(achievement.unlockedAt).toLocaleDateString()
                          : undefined
                        }
                      >
                        <div className={`text-2xl mb-2 ${unlocked ? "" : "grayscale opacity-30"}`}>
                          {def.icon}
                        </div>
                        <p className={`text-xs font-medium ${unlocked ? "text-white/80" : "text-white/25"}`}>
                          {t(`achievements.${i18nKey}.name`, def.name)}
                        </p>
                        <p className={`text-[10px] mt-0.5 line-clamp-2 ${unlocked ? "text-white/40" : "text-white/15"}`}>
                          {t(`achievements.${i18nKey}.description`, def.description)}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-white/20 text-center mt-4">
                  {achievements.length}/{ACHIEVEMENTS.length} {t("achievements.unlocked").toLowerCase()}
                </p>
              </div>
            </div>
          )}

          {/* Social Tab */}
          {activeTab === "social" && <SocialTab />}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-md space-y-6">
                {/* Profile Section */}
                {isAuthenticated && profile && (
                  <div className="space-y-4 pb-4 border-b border-white/[0.04]">
                    <h3 className="text-[11px] text-white/30 uppercase tracking-wide">
                      {t("settings.profile.title", "Perfil")}
                    </h3>

                    <div className="flex items-center gap-4">
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
                        className="relative w-14 h-14 rounded-full bg-white/[0.06] flex items-center justify-center overflow-hidden group hover:ring-2 hover:ring-white/20 transition-all disabled:opacity-50"
                        title="Upload avatar"
                      >
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white/40 text-lg font-medium">
                            {(profile.display_name || profile.username || "?")[0].toUpperCase()}
                          </span>
                        )}
                        {/* Upload overlay */}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {isUploadingAvatar ? (
                            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/80">
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
                              className="flex-1 px-2 py-1 bg-white/[0.05] rounded text-sm text-white/80 placeholder:text-white/30 focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={async () => {
                                if (editDisplayName.trim()) {
                                  setIsSavingProfile(true);
                                  try {
                                    await updateProfile({ display_name: editDisplayName.trim() });
                                  } catch (e) {
                                    console.error("Failed to update profile:", e);
                                  }
                                  setIsSavingProfile(false);
                                }
                                setIsEditingProfile(false);
                              }}
                              disabled={isSavingProfile}
                              className="px-2 py-1 rounded bg-white/10 text-white/70 text-xs hover:bg-white/15 transition-colors disabled:opacity-50"
                            >
                              {isSavingProfile ? "..." : t("common.save")}
                            </button>
                            <button
                              onClick={() => setIsEditingProfile(false)}
                              className="px-2 py-1 rounded text-white/40 text-xs hover:text-white/60 transition-colors"
                            >
                              {t("common.cancel")}
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-white/80">{profile.display_name || profile.username}</p>
                              <button
                                onClick={() => {
                                  setEditDisplayName(profile.display_name || "");
                                  setIsEditingProfile(true);
                                }}
                                className="p-1 rounded text-white/20 hover:text-white/50 transition-colors"
                                title={t("settings.profile.edit", "Editar")}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                            </div>
                            <p className="text-[11px] text-white/30">@{profile.username}</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Public Profile Toggle */}
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02]">
                      <div>
                        <p className="text-sm text-white/70">{t("settings.profile.publicProfile", "Perfil público")}</p>
                        <p className="text-[11px] text-white/30 mt-0.5">
                          {t("settings.profile.publicDescription", "Aparecer no ranking global")}
                        </p>
                      </div>
                      <Switch
                        checked={profile.is_public || false}
                        onCheckedChange={async (checked) => {
                          try {
                            await updateProfile({ is_public: checked });
                          } catch (e) {
                            console.error("Failed to update profile:", e);
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Language */}
                <div className="space-y-2">
                  <label className="text-[11px] text-white/30 uppercase tracking-wide">
                    {t("settings.language.label")}
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-white/[0.03] rounded-lg text-sm text-white/70 hover:bg-white/[0.05] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span>{currentLang.flag}</span>
                        <span>{currentLang.name}</span>
                      </div>
                      <svg className={`w-4 h-4 text-white/30 transition-transform ${showLanguageDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showLanguageDropdown && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 py-1 bg-[#141414] rounded-lg border border-white/[0.06] shadow-xl">
                        {supportedLanguages.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => handleLanguageChange(lang.code)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/[0.04] transition-colors ${
                              lang.code === i18n.language ? "text-white/80" : "text-white/50"
                            }`}
                          >
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* API Mode */}
                <div className="space-y-3 py-3 border-t border-b border-white/[0.04]">
                  <div>
                    <p className="text-sm text-white/70">{t("settings.apiMode.label", "API Mode")}</p>
                    <p className="text-[11px] text-white/30 mt-0.5">
                      {t("settings.apiMode.description", "Choose how to connect to AI services")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        setApiMode('default');
                        await saveSetting('apiMode', 'default');
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs transition-all ${
                        apiMode === 'default'
                          ? 'bg-white/10 text-white/80 ring-1 ring-white/20'
                          : 'bg-white/[0.03] text-white/40 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="font-medium">{t("settings.apiMode.default", "Default")}</div>
                      <div className="text-[10px] mt-0.5 opacity-60">
                        {t("settings.apiMode.defaultDesc", "Use our servers (requires login)")}
                      </div>
                    </button>
                    <button
                      onClick={async () => {
                        setApiMode('custom');
                        await saveSetting('apiMode', 'custom');
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs transition-all ${
                        apiMode === 'custom'
                          ? 'bg-white/10 text-white/80 ring-1 ring-white/20'
                          : 'bg-white/[0.03] text-white/40 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="font-medium">{t("settings.apiMode.custom", "Custom Keys")}</div>
                      <div className="text-[10px] mt-0.5 opacity-60">
                        {t("settings.apiMode.customDesc", "Use your own API keys")}
                      </div>
                    </button>
                  </div>
                  {apiMode === 'default' && !isAuthenticated && (
                    <p className="text-[11px] text-amber-400/70">
                      {t("settings.apiMode.loginRequired", "Login required for default mode")}
                    </p>
                  )}
                  {apiMode === 'default' && isAuthenticated && (
                    <p className="text-[11px] text-white/30">
                      {t("settings.apiMode.voiceNote", "Note: Voice input requires custom keys (OpenAI Realtime API)")}
                    </p>
                  )}
                </div>

                {/* TTS */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm text-white/70">{t("settings.tts.label")}</p>
                    <p className="text-[11px] text-white/30 mt-0.5">{t("settings.tts.description")}</p>
                  </div>
                  <Switch checked={ttsEnabled} onCheckedChange={(v) => handleToggle("ttsEnabled", v, setTtsEnabled)} />
                </div>

                {/* ElevenLabs toggle */}
                {ttsEnabled && (
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm text-white/70">{t("settings.elevenlabs.label")}</p>
                      <p className="text-[11px] text-white/30 mt-0.5">{t("settings.elevenlabs.description")}</p>
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
                    <div className="space-y-2">
                      <label className="text-[11px] text-white/30 uppercase tracking-wide">
                        {t("settings.voice.label")}
                      </label>
                      <div className="relative">
                        <button
                          onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                          className="w-full flex items-center justify-between px-3 py-2.5 bg-white/[0.03] rounded-lg text-sm text-white/70 hover:bg-white/[0.05] transition-colors"
                        >
                          <span>{selectedVoice.name}</span>
                          <svg className={`w-4 h-4 text-white/30 transition-transform ${showVoiceDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showVoiceDropdown && (
                          <div className="absolute z-50 top-full left-0 right-0 mt-1 py-1 bg-[#141414] rounded-lg border border-white/[0.06] shadow-xl max-h-48 overflow-y-auto">
                            {ELEVENLABS_VOICES.map((voice) => (
                              <button
                                key={voice.id}
                                onClick={() => handleVoiceChange(voice.id as VoiceId)}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-white/[0.04] transition-colors ${
                                  voice.id === ttsVoiceId ? "text-white/80" : "text-white/50"
                                }`}
                              >
                                {voice.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Volume */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] text-white/30 uppercase tracking-wide">
                          {t("settings.volume.label")}
                        </label>
                        <span className="font-mono text-[11px] text-white/40">{Math.round(ttsVolume * 100)}%</span>
                      </div>
                      <Slider value={ttsVolume} onChange={handleVolumeChange} min={0} max={1} step={0.05} />
                    </div>
                  </>
                )}

                {/* Advanced section - Only show in custom API mode */}
                {apiMode === 'custom' && (
                <div className="pt-4 border-t border-white/[0.04]">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-[11px] text-white/30 uppercase tracking-wide hover:text-white/50 transition-colors"
                  >
                    <svg className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t("settings.tabs.api")}
                  </button>

                  {showAdvanced && (
                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <label className="text-[11px] text-white/30">OpenAI</label>
                        <input
                          type="password"
                          placeholder={isOpenAIFromEnv ? t("settings.api.openai.envPlaceholder") : "sk-..."}
                          value={localOpenAIKey}
                          onChange={(e) => setLocalOpenAIKey(e.target.value)}
                          disabled={isOpenAIFromEnv}
                          className="w-full px-3 py-2 bg-white/[0.03] rounded-lg text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:bg-white/[0.05] disabled:opacity-50 transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] text-white/30">ElevenLabs</label>
                        <input
                          type="password"
                          placeholder={isElevenLabsFromEnv ? t("settings.api.elevenlabs.envPlaceholder") : "xi-..."}
                          value={localElevenLabsKey}
                          onChange={(e) => setLocalElevenLabsKey(e.target.value)}
                          disabled={isElevenLabsFromEnv}
                          className="w-full px-3 py-2 bg-white/[0.03] rounded-lg text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:bg-white/[0.05] disabled:opacity-50 transition-colors"
                        />
                      </div>
                      <button
                        onClick={handleSaveApiKeys}
                        className="w-full py-2 bg-white/[0.06] rounded-lg text-sm text-white/60 hover:bg-white/[0.1] hover:text-white/80 transition-all"
                      >
                        {t("settings.api.saveKeys")}
                      </button>
                    </div>
                  )}
                </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
