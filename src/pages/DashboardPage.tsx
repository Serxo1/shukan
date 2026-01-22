import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useDatabase } from "@/hooks/useDatabase";
import { useHabitStore } from "@/store/useHabitStore";
import { useCloudSync } from "@/hooks/useCloudSync";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { HabitsTab } from "@/components/dashboard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TabLoadingFallback } from "@/components/LoadingFallback";
import type { Achievement } from "@/types";
import "@/index.css";

// Lazy load less frequently used tabs
const StatsTab = lazy(() => import("@/components/dashboard/StatsTab").then(m => ({ default: m.StatsTab })));
const SettingsTab = lazy(() => import("@/components/dashboard/SettingsTab").then(m => ({ default: m.SettingsTab })));
const SocialTab = lazy(() => import("@/components/social").then(m => ({ default: m.SocialTab })));

type Tab = "habits" | "stats" | "social" | "settings";

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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("habits");
  const { profile, signOut, isAuthenticated, updateProfile, uploadAvatar } = useAuth();
  const { habits } = useHabitStore();
  const { createHabit, deleteHabit, completeHabit, getTodayCompletions, getCompletionsForDateRange, getAchievements } = useDatabase();
  const { isSyncing } = useCloudSync();

  const [newHabitName, setNewHabitName] = useState("");
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [weekCompletions, setWeekCompletions] = useState<Map<string, Set<number>>>(new Map());
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const weekDays = useMemo(() => getWeekDays(), []);
  const todayKey = formatDateKey(new Date());

  // Load today's completions
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

  const handleClose = () => getCurrentWindow().close();
  const handleMinimize = () => getCurrentWindow().minimize();

  const handleLogout = async () => {
    try {
      await signOut();
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  const navItems: { id: Tab; label: string }[] = [
    { id: "habits", label: t("dashboard.tabs.habits") },
    { id: "stats", label: t("dashboard.tabs.stats") },
    { id: "social", label: t("dashboard.tabs.social") },
    { id: "settings", label: t("dashboard.tabs.settings") },
  ];

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
        {/* Sidebar */}
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
          <ErrorBoundary>
            {activeTab === "habits" && (
              <HabitsTab
                habits={habits}
                completedIds={completedIds}
                weekCompletions={weekCompletions}
                weekDays={weekDays}
                todayKey={todayKey}
                newHabitName={newHabitName}
                onNewHabitNameChange={setNewHabitName}
                onAddHabit={handleAddHabit}
                onToggleHabit={handleToggleHabit}
                onDeleteHabit={deleteHabit}
              />
            )}

            {activeTab === "stats" && (
              <Suspense fallback={<TabLoadingFallback />}>
                <StatsTab
                  habits={habits}
                  completedIds={completedIds}
                  achievements={achievements}
                />
              </Suspense>
            )}

            {activeTab === "social" && (
              <Suspense fallback={<TabLoadingFallback />}>
                <SocialTab />
              </Suspense>
            )}

            {activeTab === "settings" && (
              <Suspense fallback={<TabLoadingFallback />}>
                <SettingsTab
                  isAuthenticated={isAuthenticated}
                  profile={profile}
                  onUpdateProfile={updateProfile}
                  onUploadAvatar={uploadAvatar}
                />
              </Suspense>
            )}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
