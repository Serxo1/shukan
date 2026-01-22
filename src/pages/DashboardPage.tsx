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
  const handleLogout = async () => {
    try {
      await signOut();
      // Force clear all storage to ensure logout
      localStorage.clear();
      sessionStorage.clear();
      // Reload the page to show login screen
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if signOut fails, clear storage and reload
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  // Debug info - right-click to access DevTools (Inspect Element)
  useEffect(() => {
    console.log("[Dashboard] Loaded. Right-click and select 'Inspect Element' to open DevTools.");
    console.log("[Dashboard] Auth state:", { isAuthenticated, profile: profile?.username });
  }, [isAuthenticated, profile]);

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
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-[#fafaf9] overflow-hidden select-none">
      {/* Noise texture overlay */}
      <div className="noise" />

      {/* Title bar - Japanese minimalist */}
      <div className="h-10 flex-shrink-0 flex items-center justify-between px-4 border-b border-[rgba(168,162,158,0.06)]" data-tauri-drag-region>
        <span className="font-display text-sm italic text-[#78716c] tracking-wide" data-tauri-drag-region>
          習慣
        </span>
        <div className="flex items-center gap-1">
          {isSyncing && (
            <div className="w-6 h-6 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#a8a29e]/30 animate-pulse-soft" />
            </div>
          )}
          <button
            onClick={handleMinimize}
            className="w-7 h-7 flex items-center justify-center text-[#78716c]/40 hover:text-[#a8a29e] transition-all duration-500"
          >
            <svg width="10" height="1" fill="currentColor"><rect width="10" height="1" /></svg>
          </button>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center text-[#78716c]/40 hover:text-[#a8a29e] transition-all duration-500"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M1 1l8 8M9 1l-8 8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Refined */}
        <div className="w-48 flex-shrink-0 flex flex-col border-r border-[rgba(168,162,158,0.06)]">
          {/* Nav */}
          <nav className="flex-1 p-3 pt-6">
            {navItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full text-left px-4 py-2.5 text-sm tracking-wide transition-all duration-500 rounded-sm ${
                  activeTab === item.id
                    ? "text-[#fafaf9] bg-[rgba(168,162,158,0.08)]"
                    : "text-[#78716c] hover:text-[#a8a29e] hover:bg-[rgba(168,162,158,0.04)]"
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-[rgba(168,162,158,0.06)]">
            {isAuthenticated ? (
              <div className="space-y-3">
                <div className="px-2">
                  <p className="text-xs text-[#a8a29e] truncate tracking-wide">
                    {profile?.display_name || profile?.username || "User"}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-2 py-1.5 text-xs text-[#78716c]/50 hover:text-[#a8a29e] transition-all duration-500 tracking-wide"
                >
                  {t("dashboard.logout")}
                </button>
              </div>
            ) : (
              <p className="text-xs text-[#78716c]/40 px-2 tracking-wide">{t("dashboard.offlineMode")}</p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Habits Tab */}
          {activeTab === "habits" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Week strip + Progress */}
              <div className="flex-shrink-0 px-8 pt-8 pb-6 border-b border-[rgba(168,162,158,0.06)]">
                <div className="flex items-end justify-between">
                  {/* Week calendar */}
                  <div className="flex gap-4">
                    {weekDays.map((day, i) => {
                      const dateKey = formatDateKey(day);
                      const isToday = dateKey === todayKey;
                      const dayCompletions = weekCompletions.get(dateKey) || new Set();
                      const completedRatio = habits.length > 0 ? dayCompletions.size / habits.length : 0;

                      return (
                        <div key={i} className="flex flex-col items-center gap-2">
                          <span className={`text-[10px] tracking-[0.2em] uppercase ${isToday ? "text-[#a8a29e]" : "text-[#78716c]/40"}`}>
                            {dayLabels[i]}
                          </span>
                          <div
                            className={`w-8 h-8 rounded-sm flex items-center justify-center text-xs font-mono transition-all duration-500 ${
                              isToday
                                ? "bg-[rgba(168,162,158,0.1)] text-[#fafaf9] border border-[rgba(168,162,158,0.2)]"
                                : "text-[#78716c]/60"
                            }`}
                          >
                            {day.getDate()}
                          </div>
                          {/* Completion indicator */}
                          <div className="w-1.5 h-1.5 rounded-full transition-all duration-500" style={{
                            backgroundColor: completedRatio === 1
                              ? "rgba(168, 162, 158, 0.8)"
                              : completedRatio > 0
                                ? "rgba(168, 162, 158, 0.3)"
                                : "rgba(168, 162, 158, 0.08)"
                          }} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Today's progress */}
                  <div className="text-right">
                    <div className="font-display text-4xl text-[#fafaf9] tracking-tight italic">
                      {completedCount}<span className="text-[#78716c]/30">/{habits.length}</span>
                    </div>
                    <p className="text-[10px] text-[#78716c] mt-1 tracking-[0.2em] uppercase">{t("dashboard.completedToday")}</p>
                  </div>
                </div>
              </div>

              {/* Habits list */}
              <div className="flex-1 overflow-y-auto">
                {habits.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-8">
                    <span className="text-6xl text-[#78716c]/20 font-display italic mb-4">空</span>
                    <p className="text-[#78716c] text-sm tracking-wide">{t("dashboard.noHabits")}</p>
                    <p className="text-[#78716c]/40 text-xs mt-2 tracking-wide">{t("dashboard.addFirstHabit")}</p>
                  </div>
                ) : (
                  <div className="p-6 space-y-1">
                    {habits.map((habit) => {
                      const isCompleted = completedIds.has(habit.id);
                      return (
                        <div
                          key={habit.id}
                          onClick={() => handleToggleHabit(habit.id)}
                          className={`group flex items-center gap-4 px-4 py-3.5 rounded-sm cursor-pointer transition-all duration-500 ${
                            isCompleted ? "bg-[rgba(168,162,158,0.04)]" : "hover:bg-[rgba(168,162,158,0.04)]"
                          }`}
                        >
                          {/* Checkbox */}
                          <div className={`w-4 h-4 rounded-sm flex-shrink-0 flex items-center justify-center transition-all duration-500 border ${
                            isCompleted
                              ? "bg-[#a8a29e] border-[#a8a29e]"
                              : "border-[rgba(168,162,158,0.2)] group-hover:border-[rgba(168,162,158,0.4)]"
                          }`}>
                            {isCompleted && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4l3 3 5-6" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>

                          {/* Name */}
                          <span className={`flex-1 text-sm tracking-wide transition-all duration-500 ${
                            isCompleted ? "text-[#78716c]" : "text-[#fafaf9]/80"
                          }`}>
                            {habit.name}
                          </span>

                          {/* Streak */}
                          {habit.streak > 0 && (
                            <span className="text-xs font-mono text-[#78716c]/40 tracking-wide">
                              {habit.streak}d
                            </span>
                          )}

                          {/* Delete */}
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteHabit(habit.id); }}
                            className="w-6 h-6 flex items-center justify-center text-transparent group-hover:text-[#78716c]/30 hover:!text-[#9d6b6b] transition-all duration-500"
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
              <div className="flex-shrink-0 p-6 border-t border-[rgba(168,162,158,0.06)]">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder={t("dashboard.newHabitPlaceholder")}
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddHabit()}
                    className="flex-1 px-4 py-2.5 bg-transparent border border-[rgba(168,162,158,0.1)] rounded-sm text-sm text-[#fafaf9]/80 placeholder:text-[#78716c]/40 focus:outline-none focus:border-[rgba(168,162,158,0.3)] transition-all duration-500 tracking-wide"
                  />
                  <button
                    onClick={handleAddHabit}
                    disabled={!newHabitName.trim()}
                    className="px-6 py-2.5 border border-[rgba(168,162,158,0.2)] rounded-sm text-sm text-[#a8a29e] hover:bg-[rgba(168,162,158,0.1)] hover:border-[rgba(168,162,158,0.4)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-500 tracking-wide"
                  >
                    {t("common.add")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === "stats" && (
            <div className="flex-1 overflow-y-auto p-8">
              {/* Overview */}
              <div className="grid grid-cols-3 gap-6 mb-10">
                <div className="p-5 rounded-sm border border-[rgba(168,162,158,0.08)] bg-[rgba(168,162,158,0.02)]">
                  <p className="font-display text-4xl text-[#fafaf9] italic">{habits.length}</p>
                  <p className="text-[10px] text-[#78716c] mt-2 tracking-[0.2em] uppercase">{t("dashboard.stats.totalHabits")}</p>
                </div>
                <div className="p-5 rounded-sm border border-[rgba(168,162,158,0.08)] bg-[rgba(168,162,158,0.02)]">
                  <p className="font-display text-4xl text-[#fafaf9] italic">
                    {habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0}
                    <span className="text-xl text-[#78716c]/40">%</span>
                  </p>
                  <p className="text-[10px] text-[#78716c] mt-2 tracking-[0.2em] uppercase">{t("widgets.stats.completionRate")}</p>
                </div>
                <div className="p-5 rounded-sm border border-[rgba(168,162,158,0.08)] bg-[rgba(168,162,158,0.02)]">
                  <p className="font-display text-4xl text-[#fafaf9] italic">{bestStreak}</p>
                  <p className="text-[10px] text-[#78716c] mt-2 tracking-[0.2em] uppercase">{t("widgets.stats.bestStreak")}</p>
                </div>
              </div>

              {/* Per-habit stats */}
              {habits.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] text-[#78716c] uppercase tracking-[0.3em] mb-4">
                    {t("dashboard.tabs.habits")}
                  </h3>
                  {habits.map((habit) => (
                    <div key={habit.id} className="flex items-center gap-4 py-3">
                      <span className="flex-1 text-sm text-[#a8a29e] tracking-wide">{habit.name}</span>
                      <div className="w-28 h-0.5 bg-[rgba(168,162,158,0.1)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#a8a29e]/50 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((habit.streak / 30) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-[#78716c]/50 w-10 text-right tracking-wide">
                        {habit.streak}d
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {habits.length === 0 && (
                <p className="text-center text-[#78716c]/40 text-sm py-12 tracking-wide">
                  {t("dashboard.stats.moreComingSoon")}
                </p>
              )}

              {/* Achievements */}
              <div className="mt-10 pt-8 border-t border-[rgba(168,162,158,0.06)]">
                <h3 className="text-[10px] text-[#78716c] uppercase tracking-[0.3em] mb-6">
                  {t("achievements.title")}
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  {ACHIEVEMENTS.map((def) => {
                    const unlocked = isUnlocked(def.code);
                    const achievement = achievements.find(a => a.code === def.code);
                    const i18nKey = codeToI18nKey(def.code);
                    return (
                      <div
                        key={def.code}
                        className={`p-4 rounded-sm text-center transition-all duration-500 border ${
                          unlocked
                            ? "border-[rgba(168,162,158,0.15)] bg-[rgba(168,162,158,0.05)]"
                            : "border-[rgba(168,162,158,0.05)] bg-transparent"
                        }`}
                        title={unlocked && achievement?.unlockedAt
                          ? new Date(achievement.unlockedAt).toLocaleDateString()
                          : undefined
                        }
                      >
                        <div className={`text-2xl mb-3 ${unlocked ? "" : "grayscale opacity-20"}`}>
                          {def.icon}
                        </div>
                        <p className={`text-xs tracking-wide ${unlocked ? "text-[#fafaf9]/80" : "text-[#78716c]/30"}`}>
                          {t(`achievements.${i18nKey}.name`, def.name)}
                        </p>
                        <p className={`text-[10px] mt-1 line-clamp-2 ${unlocked ? "text-[#78716c]" : "text-[#78716c]/20"}`}>
                          {t(`achievements.${i18nKey}.description`, def.description)}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-[#78716c]/40 text-center mt-6 tracking-[0.2em]">
                  {achievements.length}/{ACHIEVEMENTS.length} {t("achievements.unlocked").toLowerCase()}
                </p>
              </div>
            </div>
          )}

          {/* Social Tab */}
          {activeTab === "social" && <SocialTab />}

          {/* Settings Tab */}
          {activeTab === "settings" && (
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
          )}
        </div>
      </div>
    </div>
  );
}
