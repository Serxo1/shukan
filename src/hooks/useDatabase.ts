import { useCallback, useEffect, useRef } from "react";
import Database from "@tauri-apps/plugin-sql";
import type { Habit, Completion, TargetType, Goal, Achievement } from "@/types";
import { useHabitStore } from "@/store/useHabitStore";
import { DATABASE, WEEK_DAYS_PT, HABIT_DEFAULTS } from "@/lib/constants";

interface DbHabit {
  id: number;
  name: string;
  frequency: string;
  streak: number;
  created_at: string;
  icon: string | null;
  color: string | null;
  target_type: string | null;
  target_value: number | null;
  target_unit: string | null;
  best_streak: number | null;
}

interface DbCompletion {
  id: number;
  habit_id: number;
  date: string;
  notes: string | null;
  value: number | null;
}

interface DbGoal {
  id: number;
  habit_id: number;
  type: string;
  target_value: number;
  achieved_at: string | null;
  created_at: string;
}

interface DbAchievement {
  id: number;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  unlocked_at: string | null;
  habit_id: number | null;
}

const mapDbGoal = (row: DbGoal): Goal => ({
  id: row.id,
  habitId: row.habit_id,
  type: row.type as Goal["type"],
  targetValue: row.target_value,
  achievedAt: row.achieved_at ?? undefined,
  createdAt: row.created_at,
});

const mapDbAchievement = (row: DbAchievement): Achievement => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description ?? undefined,
  icon: row.icon ?? undefined,
  unlockedAt: row.unlocked_at ?? undefined,
  habitId: row.habit_id ?? undefined,
});

const mapDbHabit = (row: DbHabit): Habit => ({
  id: row.id,
  name: row.name,
  frequency: row.frequency as Habit["frequency"],
  streak: row.streak,
  createdAt: row.created_at,
  icon: row.icon ?? HABIT_DEFAULTS.ICON,
  color: row.color ?? HABIT_DEFAULTS.COLOR,
  targetType: (row.target_type as TargetType) ?? HABIT_DEFAULTS.TARGET_TYPE,
  targetValue: row.target_value ?? HABIT_DEFAULTS.TARGET_VALUE,
  targetUnit: row.target_unit ?? undefined,
  bestStreak: row.best_streak ?? 0,
});

const mapDbCompletion = (row: DbCompletion): Completion => ({
  id: row.id,
  habitId: row.habit_id,
  date: row.date,
  notes: row.notes ?? undefined,
  value: row.value ?? 1,
});

export function useDatabase() {
  const dbRef = useRef<Database | null>(null);
  const { setHabits, setCompletions, setLoading, setError, addHabit, updateHabit, addCompletion } =
    useHabitStore();

  const getDb = useCallback(async (): Promise<Database> => {
    if (!dbRef.current) {
      dbRef.current = await Database.load(DATABASE.NAME);
    }
    return dbRef.current;
  }, []);

  const loadHabits = useCallback(async () => {
    try {
      setLoading(true);
      const db = await getDb();
      const rows = await db.select<DbHabit[]>("SELECT * FROM habits ORDER BY created_at DESC");
      setHabits(rows.map(mapDbHabit));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load habits");
    } finally {
      setLoading(false);
    }
  }, [getDb, setHabits, setLoading, setError]);

  const loadCompletions = useCallback(
    async (startDate?: string, endDate?: string) => {
      try {
        const db = await getDb();
        let query = "SELECT * FROM completions";
        const params: string[] = [];

        if (startDate && endDate) {
          query += " WHERE date BETWEEN ? AND ?";
          params.push(startDate, endDate);
        }

        query += " ORDER BY date DESC";

        const rows = await db.select<DbCompletion[]>(query, params);
        setCompletions(rows.map(mapDbCompletion));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load completions");
      }
    },
    [getDb, setCompletions, setError]
  );

  const createHabit = useCallback(
    async (
      name: string,
      frequency: Habit["frequency"] = "daily",
      options?: {
        targetType?: TargetType;
        targetValue?: number;
        targetUnit?: string;
        icon?: string;
        color?: string;
      }
    ): Promise<Habit | null> => {
      try {
        const db = await getDb();

        const targetType = options?.targetType ?? HABIT_DEFAULTS.TARGET_TYPE;
        const targetValue = options?.targetValue ?? HABIT_DEFAULTS.TARGET_VALUE;
        const targetUnit = options?.targetUnit ?? null;
        const icon = options?.icon ?? HABIT_DEFAULTS.ICON;
        const color = options?.color ?? HABIT_DEFAULTS.COLOR;

        const result = await db.execute(
          `INSERT INTO habits (name, frequency, target_type, target_value, target_unit, icon, color)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [name, frequency, targetType, targetValue, targetUnit, icon, color]
        );

        const newHabit: Habit = {
          id: result.lastInsertId ?? 0,
          name,
          frequency,
          streak: 0,
          createdAt: new Date().toISOString(),
          icon,
          color,
          targetType,
          targetValue,
          targetUnit: targetUnit ?? undefined,
          bestStreak: 0,
        };

        addHabit(newHabit);
        return newHabit;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create habit");
        return null;
      }
    },
    [getDb, addHabit, setError]
  );

  const completeHabit = useCallback(
    async (habitId: number, date?: string, notes?: string): Promise<{ success: boolean; streak: number; isNewStreak: boolean }> => {
      try {
        const db = await getDb();
        const completionDate = date ?? new Date().toISOString().split("T")[0];

        const existing = await db.select<DbCompletion[]>(
          "SELECT id FROM completions WHERE habit_id = ? AND date = ?",
          [habitId, completionDate]
        );

        if (existing.length > 0) {
          const habit = await db.select<{ streak: number }[]>(
            "SELECT streak FROM habits WHERE id = ?",
            [habitId]
          );
          return { success: false, streak: habit[0]?.streak ?? 0, isNewStreak: false };
        }

        const result = await db.execute(
          "INSERT INTO completions (habit_id, date, notes, value) VALUES (?, ?, ?, ?)",
          [habitId, completionDate, notes ?? null, 1]
        );

        const newCompletion: Completion = {
          id: result.lastInsertId ?? 0,
          habitId,
          date: completionDate,
          notes,
          value: 1,
        };

        addCompletion(newCompletion);

        await db.execute(
          "UPDATE habits SET streak = streak + 1 WHERE id = ?",
          [habitId]
        );

        const updated = await db.select<{ streak: number; best_streak: number }[]>(
          "SELECT streak, best_streak FROM habits WHERE id = ?",
          [habitId]
        );

        const newStreak = updated[0]?.streak ?? 0;
        const bestStreak = updated[0]?.best_streak ?? 0;
        const isNewStreak = newStreak > bestStreak;

        if (isNewStreak) {
          await db.execute(
            "UPDATE habits SET best_streak = ? WHERE id = ?",
            [newStreak, habitId]
          );
          updateHabit(habitId, { streak: newStreak, bestStreak: newStreak });
        } else {
          updateHabit(habitId, { streak: newStreak });
        }

        return { success: true, streak: newStreak, isNewStreak };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to complete habit");
        return { success: false, streak: 0, isNewStreak: false };
      }
    },
    [getDb, addCompletion, updateHabit, setError]
  );

  const logProgress = useCallback(
    async (
      habitId: number,
      value: number,
      date?: string
    ): Promise<{ current: number; target: number; isComplete: boolean; streak: number }> => {
      try {
        const db = await getDb();
        const progressDate = date ?? new Date().toISOString().split("T")[0];

        const habit = await db.select<DbHabit[]>(
          "SELECT * FROM habits WHERE id = ?",
          [habitId]
        );

        if (habit.length === 0) {
          throw new Error("Habit not found");
        }

        const targetValue = habit[0].target_value ?? 1;

        const existing = await db.select<{ id: number; value: number }[]>(
          "SELECT id, value FROM completions WHERE habit_id = ? AND date = ?",
          [habitId, progressDate]
        );

        let newValue: number;
        let completionId: number;

        if (existing.length > 0) {
          newValue = (existing[0].value ?? 0) + value;
          completionId = existing[0].id;
          await db.execute(
            "UPDATE completions SET value = ? WHERE id = ?",
            [newValue, completionId]
          );
        } else {
          newValue = value;
          const result = await db.execute(
            "INSERT INTO completions (habit_id, date, value) VALUES (?, ?, ?)",
            [habitId, progressDate, value]
          );
          completionId = result.lastInsertId ?? 0;

          const newCompletion: Completion = {
            id: completionId,
            habitId,
            date: progressDate,
            value: newValue,
          };
          addCompletion(newCompletion);
        }

        const wasComplete = existing.length > 0 && (existing[0].value ?? 0) >= targetValue;
        const isComplete = newValue >= targetValue;

        let streak = habit[0].streak;
        if (!wasComplete && isComplete) {
          await db.execute(
            "UPDATE habits SET streak = streak + 1 WHERE id = ?",
            [habitId]
          );
          const updated = await db.select<{ streak: number; best_streak: number }[]>(
            "SELECT streak, best_streak FROM habits WHERE id = ?",
            [habitId]
          );
          streak = updated[0]?.streak ?? 0;
          const bestStreak = updated[0]?.best_streak ?? 0;

          if (streak > bestStreak) {
            await db.execute(
              "UPDATE habits SET best_streak = ? WHERE id = ?",
              [streak, habitId]
            );
            updateHabit(habitId, { streak, bestStreak: streak });
          } else {
            updateHabit(habitId, { streak });
          }
        }

        return { current: newValue, target: targetValue, isComplete, streak };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to log progress");
        return { current: 0, target: 1, isComplete: false, streak: 0 };
      }
    },
    [getDb, addCompletion, updateHabit, setError]
  );

  const getTodayProgress = useCallback(
    async (habitId: number): Promise<{ current: number; target: number; isComplete: boolean }> => {
      try {
        const db = await getDb();
        const today = new Date().toISOString().split("T")[0];

        const habit = await db.select<{ target_value: number }[]>(
          "SELECT target_value FROM habits WHERE id = ?",
          [habitId]
        );

        const targetValue = habit[0]?.target_value ?? 1;

        const completion = await db.select<{ value: number }[]>(
          "SELECT value FROM completions WHERE habit_id = ? AND date = ?",
          [habitId, today]
        );

        const current = completion[0]?.value ?? 0;
        return {
          current,
          target: targetValue,
          isComplete: current >= targetValue,
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get progress");
        return { current: 0, target: 1, isComplete: false };
      }
    },
    [getDb, setError]
  );

  const getHabitById = useCallback(
    async (habitId: number): Promise<Habit | null> => {
      try {
        const db = await getDb();
        const rows = await db.select<DbHabit[]>(
          "SELECT * FROM habits WHERE id = ?",
          [habitId]
        );
        return rows.length > 0 ? mapDbHabit(rows[0]) : null;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get habit");
        return null;
      }
    },
    [getDb, setError]
  );

  const getHabitByName = useCallback(
    async (name: string): Promise<Habit | null> => {
      try {
        const db = await getDb();
        const rows = await db.select<DbHabit[]>(
          "SELECT * FROM habits WHERE LOWER(name) = LOWER(?)",
          [name]
        );
        return rows.length > 0 ? mapDbHabit(rows[0]) : null;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get habit");
        return null;
      }
    },
    [getDb, setError]
  );

  const getHabits = useCallback(async (): Promise<Habit[]> => {
    try {
      const db = await getDb();
      const rows = await db.select<DbHabit[]>("SELECT * FROM habits ORDER BY created_at DESC");
      return rows.map(mapDbHabit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get habits");
      return [];
    }
  }, [getDb, setError]);

  const deleteHabit = useCallback(
    async (habitId: number): Promise<boolean> => {
      try {
        const db = await getDb();
        await db.execute("DELETE FROM habits WHERE id = ?", [habitId]);
        useHabitStore.getState().deleteHabit(habitId);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete habit");
        return false;
      }
    },
    [getDb, setError]
  );

  const getHabitStats = useCallback(
    async (habitId: number) => {
      try {
        const db = await getDb();

        const totalCompletions = await db.select<{ count: number }[]>(
          "SELECT COUNT(*) as count FROM completions WHERE habit_id = ?",
          [habitId]
        );

        const thisWeek = await db.select<{ count: number }[]>(
          `SELECT COUNT(*) as count FROM completions
           WHERE habit_id = ? AND date >= date('now', '-7 days')`,
          [habitId]
        );

        const thisMonth = await db.select<{ count: number }[]>(
          `SELECT COUNT(*) as count FROM completions
           WHERE habit_id = ? AND date >= date('now', '-30 days')`,
          [habitId]
        );

        return {
          total: totalCompletions[0]?.count ?? 0,
          thisWeek: thisWeek[0]?.count ?? 0,
          thisMonth: thisMonth[0]?.count ?? 0,
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get stats");
        return { total: 0, thisWeek: 0, thisMonth: 0 };
      }
    },
    [getDb, setError]
  );

  const getTodayCompletions = useCallback(async () => {
    try {
      const db = await getDb();
      const today = new Date().toISOString().split("T")[0];
      const rows = await db.select<DbCompletion[]>(
        "SELECT * FROM completions WHERE date = ?",
        [today]
      );
      return rows.map(mapDbCompletion);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get today completions");
      return [];
    }
  }, [getDb, setError]);

  const getCompletionsForDateRange = useCallback(
    async (startDate: string, endDate: string): Promise<Completion[]> => {
      try {
        const db = await getDb();
        const rows = await db.select<DbCompletion[]>(
          "SELECT * FROM completions WHERE date BETWEEN ? AND ? ORDER BY date ASC",
          [startDate, endDate]
        );
        return rows.map(mapDbCompletion);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get completions for date range");
        return [];
      }
    },
    [getDb, setError]
  );

  const getCompletionHistory = useCallback(
    async (
      habitId: number,
      days: number = 90
    ): Promise<{ date: string; value: number }[]> => {
      try {
        const db = await getDb();
        const rows = await db.select<{ date: string; value: number }[]>(
          `SELECT date, COALESCE(value, 1) as value FROM completions
           WHERE habit_id = ? AND date >= date('now', '-' || ? || ' days')
           ORDER BY date ASC`,
          [habitId, days]
        );
        return rows;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get completion history");
        return [];
      }
    },
    [getDb, setError]
  );

  const getWeeklyData = useCallback(
    async (habitId: number): Promise<{ label: string; value: number }[]> => {
      try {
        const db = await getDb();

        // Calculate date range
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 6);
        const startDateStr = startDate.toISOString().split("T")[0];
        const endDateStr = today.toISOString().split("T")[0];

        // Single query for all 7 days
        const rows = await db.select<{ date: string; value: number }[]>(
          `SELECT date, COALESCE(SUM(value), 0) as value FROM completions
           WHERE habit_id = ? AND date BETWEEN ? AND ?
           GROUP BY date`,
          [habitId, startDateStr, endDateStr]
        );

        // Create a map for quick lookup
        const valuesByDate = new Map(rows.map(r => [r.date, r.value]));

        // Build result array for last 7 days
        const result: { label: string; value: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];
          const dayLabel = WEEK_DAYS_PT[date.getDay()];

          result.push({
            label: dayLabel,
            value: valuesByDate.get(dateStr) ?? 0,
          });
        }

        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get weekly data");
        return [];
      }
    },
    [getDb, setError]
  );

  // ============ GOALS ============

  const createGoal = useCallback(
    async (
      habitId: number,
      type: Goal["type"],
      targetValue: number
    ): Promise<Goal | null> => {
      try {
        const db = await getDb();
        const result = await db.execute(
          `INSERT INTO goals (habit_id, type, target_value) VALUES (?, ?, ?)`,
          [habitId, type, targetValue]
        );

        return {
          id: result.lastInsertId ?? 0,
          habitId,
          type,
          targetValue,
          createdAt: new Date().toISOString(),
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create goal");
        return null;
      }
    },
    [getDb, setError]
  );

  const getGoalsForHabit = useCallback(
    async (habitId: number): Promise<Goal[]> => {
      try {
        const db = await getDb();
        const rows = await db.select<DbGoal[]>(
          `SELECT * FROM goals WHERE habit_id = ? ORDER BY created_at DESC`,
          [habitId]
        );
        return rows.map(mapDbGoal);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get goals");
        return [];
      }
    },
    [getDb, setError]
  );

  const checkAndUpdateGoals = useCallback(
    async (habitId: number, currentStreak: number): Promise<Goal[]> => {
      try {
        const db = await getDb();

        // Find streak goals that are now achieved
        const achievedGoals = await db.select<DbGoal[]>(
          `SELECT * FROM goals
           WHERE habit_id = ? AND type = 'streak' AND achieved_at IS NULL AND target_value <= ?`,
          [habitId, currentStreak]
        );

        // Mark them as achieved
        for (const goal of achievedGoals) {
          await db.execute(
            `UPDATE goals SET achieved_at = datetime('now') WHERE id = ?`,
            [goal.id]
          );
        }

        return achievedGoals.map(mapDbGoal);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to check goals");
        return [];
      }
    },
    [getDb, setError]
  );

  const getFrequencyProgress = useCallback(
    async (
      habitId: number,
      period: "week" | "month"
    ): Promise<{ current: number; daysRemaining: number }> => {
      try {
        const db = await getDb();
        const now = new Date();

        let startDate: string;
        let daysRemaining: number;

        if (period === "week") {
          // Get start of current week (Sunday)
          const dayOfWeek = now.getDay();
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - dayOfWeek);
          startDate = startOfWeek.toISOString().split("T")[0];
          daysRemaining = 6 - dayOfWeek;
        } else {
          // Get start of current month
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          startDate = startOfMonth.toISOString().split("T")[0];
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          daysRemaining = endOfMonth.getDate() - now.getDate();
        }

        const rows = await db.select<{ count: number }[]>(
          `SELECT COUNT(DISTINCT date) as count FROM completions
           WHERE habit_id = ? AND date >= ?`,
          [habitId, startDate]
        );

        return {
          current: rows[0]?.count ?? 0,
          daysRemaining,
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get frequency progress");
        return { current: 0, daysRemaining: 0 };
      }
    },
    [getDb, setError]
  );

  const getActiveFrequencyGoals = useCallback(
    async (habitId: number): Promise<Goal[]> => {
      try {
        const db = await getDb();
        const rows = await db.select<DbGoal[]>(
          `SELECT * FROM goals
           WHERE habit_id = ? AND type IN ('weekly', 'monthly') AND achieved_at IS NULL
           ORDER BY created_at DESC`,
          [habitId]
        );
        return rows.map(mapDbGoal);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get frequency goals");
        return [];
      }
    },
    [getDb, setError]
  );

  const checkFrequencyGoals = useCallback(
    async (habitId: number): Promise<Goal[]> => {
      try {
        const db = await getDb();
        const achievedGoals: Goal[] = [];

        // Check weekly goals
        const weeklyGoals = await db.select<DbGoal[]>(
          `SELECT * FROM goals
           WHERE habit_id = ? AND type = 'weekly' AND achieved_at IS NULL`,
          [habitId]
        );

        const weekProgress = await getFrequencyProgress(habitId, "week");
        for (const goal of weeklyGoals) {
          if (weekProgress.current >= goal.target_value) {
            await db.execute(
              `UPDATE goals SET achieved_at = datetime('now') WHERE id = ?`,
              [goal.id]
            );
            achievedGoals.push(mapDbGoal({ ...goal, achieved_at: new Date().toISOString() }));
          }
        }

        // Check monthly goals
        const monthlyGoals = await db.select<DbGoal[]>(
          `SELECT * FROM goals
           WHERE habit_id = ? AND type = 'monthly' AND achieved_at IS NULL`,
          [habitId]
        );

        const monthProgress = await getFrequencyProgress(habitId, "month");
        for (const goal of monthlyGoals) {
          if (monthProgress.current >= goal.target_value) {
            await db.execute(
              `UPDATE goals SET achieved_at = datetime('now') WHERE id = ?`,
              [goal.id]
            );
            achievedGoals.push(mapDbGoal({ ...goal, achieved_at: new Date().toISOString() }));
          }
        }

        return achievedGoals;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to check frequency goals");
        return [];
      }
    },
    [getDb, setError, getFrequencyProgress]
  );

  // ============ ACHIEVEMENTS ============

  const unlockAchievement = useCallback(
    async (
      code: string,
      name: string,
      description: string,
      icon: string,
      habitId?: number
    ): Promise<Achievement | null> => {
      try {
        const db = await getDb();

        // Check if already unlocked
        const existing = await db.select<DbAchievement[]>(
          `SELECT * FROM achievements WHERE code = ?`,
          [code]
        );

        if (existing.length > 0) {
          return mapDbAchievement(existing[0]);
        }

        const result = await db.execute(
          `INSERT INTO achievements (code, name, description, icon, unlocked_at, habit_id)
           VALUES (?, ?, ?, ?, datetime('now'), ?)`,
          [code, name, description, icon, habitId ?? null]
        );

        return {
          id: result.lastInsertId ?? 0,
          code,
          name,
          description,
          icon,
          unlockedAt: new Date().toISOString(),
          habitId,
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to unlock achievement");
        return null;
      }
    },
    [getDb, setError]
  );

  const getAchievements = useCallback(async (): Promise<Achievement[]> => {
    try {
      const db = await getDb();
      const rows = await db.select<DbAchievement[]>(
        `SELECT * FROM achievements WHERE unlocked_at IS NOT NULL ORDER BY unlocked_at DESC`
      );
      return rows.map(mapDbAchievement);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get achievements");
      return [];
    }
  }, [getDb, setError]);

  const isAchievementUnlocked = useCallback(
    async (code: string): Promise<boolean> => {
      try {
        const db = await getDb();
        const rows = await db.select<{ count: number }[]>(
          `SELECT COUNT(*) as count FROM achievements WHERE code = ? AND unlocked_at IS NOT NULL`,
          [code]
        );
        return (rows[0]?.count ?? 0) > 0;
      } catch (err) {
        return false;
      }
    },
    [getDb]
  );

  // ============ CUSTOMIZATION ============

  const updateHabitCustomization = useCallback(
    async (
      habitId: number,
      updates: { icon?: string; color?: string }
    ): Promise<boolean> => {
      try {
        const db = await getDb();
        const setClauses: string[] = [];
        const params: (string | number)[] = [];

        if (updates.icon) {
          setClauses.push("icon = ?");
          params.push(updates.icon);
        }
        if (updates.color) {
          setClauses.push("color = ?");
          params.push(updates.color);
        }

        if (setClauses.length === 0) return false;

        params.push(habitId);
        await db.execute(
          `UPDATE habits SET ${setClauses.join(", ")} WHERE id = ?`,
          params
        );

        // Update store
        updateHabit(habitId, updates);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update habit");
        return false;
      }
    },
    [getDb, setError, updateHabit]
  );

  // ============ STATS HELPERS ============

  const getAllHabitsCompletedToday = useCallback(async (): Promise<boolean> => {
    try {
      const db = await getDb();
      const today = new Date().toISOString().split("T")[0];

      // Single query to check if all habits are completed today
      const result = await db.select<{ total_habits: number; completed_habits: number }[]>(
        `SELECT
          (SELECT COUNT(*) FROM habits) as total_habits,
          (SELECT COUNT(DISTINCT h.id) FROM habits h
           INNER JOIN completions c ON c.habit_id = h.id AND c.date = ?
           WHERE COALESCE(c.value, 1) >= COALESCE(h.target_value, 1)) as completed_habits`,
        [today]
      );

      const { total_habits, completed_habits } = result[0] ?? { total_habits: 0, completed_habits: 0 };
      return total_habits > 0 && completed_habits >= total_habits;
    } catch (err) {
      return false;
    }
  }, [getDb]);

  const getConsecutivePerfectDays = useCallback(async (): Promise<number> => {
    try {
      const db = await getDb();

      // Get all habits with their targets
      const allHabits = await db.select<{ id: number; target_value: number }[]>(
        `SELECT id, COALESCE(target_value, 1) as target_value FROM habits`
      );

      if (allHabits.length === 0) return 0;

      const habitCount = allHabits.length;
      const habitTargets = new Map(allHabits.map(h => [h.id, h.target_value]));

      // Fetch all completions for last N days in a single query
      const completions = await db.select<{ habit_id: number; date: string; total_value: number }[]>(
        `SELECT habit_id, date, COALESCE(SUM(value), 1) as total_value
         FROM completions
         WHERE date >= date('now', '-${DATABASE.MAX_DAYS_HISTORY} days')
         GROUP BY habit_id, date
         ORDER BY date DESC`
      );

      // Group completions by date
      const completionsByDate = new Map<string, Map<number, number>>();
      for (const c of completions) {
        if (!completionsByDate.has(c.date)) {
          completionsByDate.set(c.date, new Map());
        }
        completionsByDate.get(c.date)!.set(c.habit_id, c.total_value);
      }

      // Count consecutive perfect days
      let consecutiveDays = 0;
      const today = new Date();

      for (let i = 0; i < DATABASE.MAX_DAYS_HISTORY; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        const dayCompletions = completionsByDate.get(dateStr);

        // Check if all habits completed their target for this day
        let allCompleted = true;
        for (const [habitId, targetValue] of habitTargets) {
          const completedValue = dayCompletions?.get(habitId) ?? 0;
          if (completedValue < targetValue) {
            allCompleted = false;
            break;
          }
        }

        if (allCompleted) {
          consecutiveDays++;
        } else {
          break;
        }
      }

      return consecutiveDays;
    } catch (err) {
      return 0;
    }
  }, [getDb]);

  useEffect(() => {
    loadHabits();
    loadCompletions();
  }, [loadHabits, loadCompletions]);

  return {
    loadHabits,
    loadCompletions,
    createHabit,
    completeHabit,
    deleteHabit,
    getHabits,
    getHabitStats,
    getTodayCompletions,
    getCompletionsForDateRange,
    logProgress,
    getTodayProgress,
    getHabitById,
    getHabitByName,
    getCompletionHistory,
    getWeeklyData,
    // Goals
    createGoal,
    getGoalsForHabit,
    checkAndUpdateGoals,
    // Frequency goals
    getFrequencyProgress,
    getActiveFrequencyGoals,
    checkFrequencyGoals,
    // Achievements
    unlockAchievement,
    getAchievements,
    isAchievementUnlocked,
    // Customization
    updateHabitCustomization,
    // Stats helpers
    getAllHabitsCompletedToday,
    getConsecutivePerfectDays,
  };
}
