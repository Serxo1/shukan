import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Habit } from "@/types";

interface HabitsTabProps {
  habits: Habit[];
  completedIds: Set<number>;
  weekCompletions: Map<string, Set<number>>;
  weekDays: Date[];
  todayKey: string;
  newHabitName: string;
  onNewHabitNameChange: (name: string) => void;
  onAddHabit: () => void;
  onToggleHabit: (habitId: number) => void;
  onDeleteHabit: (habitId: number) => void;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function formatDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

export function HabitsTab({
  habits,
  completedIds,
  weekCompletions,
  weekDays,
  todayKey,
  newHabitName,
  onNewHabitNameChange,
  onAddHabit,
  onToggleHabit,
  onDeleteHabit,
}: HabitsTabProps) {
  const { t } = useTranslation();

  const completedCount = useMemo(
    () => habits.filter((h) => completedIds.has(h.id)).length,
    [habits, completedIds]
  );

  return (
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
                    {DAY_LABELS[i]}
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
                  onClick={() => onToggleHabit(habit.id)}
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
                    onClick={(e) => { e.stopPropagation(); onDeleteHabit(habit.id); }}
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
            onChange={(e) => onNewHabitNameChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAddHabit()}
            className="flex-1 px-4 py-2.5 bg-transparent border border-[rgba(168,162,158,0.1)] rounded-sm text-sm text-[#fafaf9]/80 placeholder:text-[#78716c]/40 focus:outline-none focus:border-[rgba(168,162,158,0.3)] transition-all duration-500 tracking-wide"
          />
          <button
            onClick={onAddHabit}
            disabled={!newHabitName.trim()}
            className="px-6 py-2.5 border border-[rgba(168,162,158,0.2)] rounded-sm text-sm text-[#a8a29e] hover:bg-[rgba(168,162,158,0.1)] hover:border-[rgba(168,162,158,0.4)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-500 tracking-wide"
          >
            {t("common.add")}
          </button>
        </div>
      </div>
    </div>
  );
}
