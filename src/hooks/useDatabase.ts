import { useCallback, useEffect, useRef } from "react";
import Database from "@tauri-apps/plugin-sql";
import type { Habit, Completion } from "@/types";
import { useHabitStore } from "@/store/useHabitStore";

interface DbHabit {
  id: number;
  name: string;
  frequency: string;
  streak: number;
  created_at: string;
}

interface DbCompletion {
  id: number;
  habit_id: number;
  date: string;
  notes: string | null;
}

const mapDbHabit = (row: DbHabit): Habit => ({
  id: row.id,
  name: row.name,
  frequency: row.frequency as Habit["frequency"],
  streak: row.streak,
  createdAt: row.created_at,
});

const mapDbCompletion = (row: DbCompletion): Completion => ({
  id: row.id,
  habitId: row.habit_id,
  date: row.date,
  notes: row.notes ?? undefined,
});

export function useDatabase() {
  const dbRef = useRef<Database | null>(null);
  const { setHabits, setCompletions, setLoading, setError, addHabit, updateHabit, addCompletion } =
    useHabitStore();

  const getDb = useCallback(async (): Promise<Database> => {
    if (!dbRef.current) {
      console.log("[Database] Loading database...");
      try {
        dbRef.current = await Database.load("sqlite:habits.db");
        console.log("[Database] Database loaded successfully");
      } catch (err) {
        console.error("[Database] Failed to load database:", err);
        throw err;
      }
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
    async (name: string, frequency: Habit["frequency"] = "daily"): Promise<Habit | null> => {
      try {
        console.log("[Database] Creating habit:", name, frequency);
        const db = await getDb();
        console.log("[Database] Got db connection");

        const result = await db.execute(
          "INSERT INTO habits (name, frequency) VALUES (?, ?)",
          [name, frequency]
        );
        console.log("[Database] Insert result:", result);

        const newHabit: Habit = {
          id: result.lastInsertId ?? 0,
          name,
          frequency,
          streak: 0,
          createdAt: new Date().toISOString(),
        };

        addHabit(newHabit);
        console.log("[Database] Habit created successfully:", newHabit);
        return newHabit;
      } catch (err) {
        console.error("[Database] Failed to create habit:", err);
        setError(err instanceof Error ? err.message : "Failed to create habit");
        return null;
      }
    },
    [getDb, addHabit, setError]
  );

  const completeHabit = useCallback(
    async (habitId: number, date?: string, notes?: string): Promise<boolean> => {
      try {
        const db = await getDb();
        const completionDate = date ?? new Date().toISOString().split("T")[0];

        const existing = await db.select<DbCompletion[]>(
          "SELECT id FROM completions WHERE habit_id = ? AND date = ?",
          [habitId, completionDate]
        );

        if (existing.length > 0) {
          return false;
        }

        const result = await db.execute(
          "INSERT INTO completions (habit_id, date, notes) VALUES (?, ?, ?)",
          [habitId, completionDate, notes ?? null]
        );

        const newCompletion: Completion = {
          id: result.lastInsertId ?? 0,
          habitId,
          date: completionDate,
          notes,
        };

        addCompletion(newCompletion);

        await db.execute(
          "UPDATE habits SET streak = streak + 1 WHERE id = ?",
          [habitId]
        );

        const updated = await db.select<{ streak: number }[]>(
          "SELECT streak FROM habits WHERE id = ?",
          [habitId]
        );

        if (updated.length > 0) {
          updateHabit(habitId, { streak: updated[0].streak });
        }

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to complete habit");
        return false;
      }
    },
    [getDb, addCompletion, updateHabit, setError]
  );

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
    getHabitStats,
    getTodayCompletions,
  };
}
