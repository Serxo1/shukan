import { useMemo, memo } from "react";
import { useTranslation } from "react-i18next";
import { ACHIEVEMENTS } from "@/lib/achievements";
import type { Habit, Achievement } from "@/types";

interface StatsTabProps {
  habits: Habit[];
  completedIds: Set<number>;
  achievements: Achievement[];
}

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

export const StatsTab = memo(function StatsTab({ habits, completedIds, achievements }: StatsTabProps) {
  const { t } = useTranslation();

  const completedCount = useMemo(
    () => habits.filter((h) => completedIds.has(h.id)).length,
    [habits, completedIds]
  );

  const bestStreak = useMemo(
    () => habits.reduce((max, h) => Math.max(max, h.streak), 0),
    [habits]
  );

  const isUnlocked = (code: string) => achievements.some(a => a.code === code);

  return (
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
  );
});
