import { create } from "zustand";
import type { Habit, Completion, VoiceState } from "@/types";

interface HabitStore {
  habits: Habit[];
  completions: Completion[];
  isLoading: boolean;
  error: string | null;

  setHabits: (habits: Habit[]) => void;
  addHabit: (habit: Habit) => void;
  updateHabit: (id: number, updates: Partial<Habit>) => void;
  deleteHabit: (id: number) => void;

  setCompletions: (completions: Completion[]) => void;
  addCompletion: (completion: Completion) => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

interface VoiceStore {
  voice: VoiceState;
  setListening: (isListening: boolean) => void;
  setProcessing: (isProcessing: boolean) => void;
  setTranscript: (transcript: string) => void;
  setVoiceError: (error: string | null) => void;
  resetVoice: () => void;
}

const initialVoiceState: VoiceState = {
  isListening: false,
  isProcessing: false,
  transcript: "",
  error: null,
};

export const useHabitStore = create<HabitStore>((set) => ({
  habits: [],
  completions: [],
  isLoading: false,
  error: null,

  setHabits: (habits) => set({ habits }),
  addHabit: (habit) => set((state) => ({ habits: [...state.habits, habit] })),
  updateHabit: (id, updates) =>
    set((state) => ({
      habits: state.habits.map((h) => (h.id === id ? { ...h, ...updates } : h)),
    })),
  deleteHabit: (id) =>
    set((state) => ({ habits: state.habits.filter((h) => h.id !== id) })),

  setCompletions: (completions) => set({ completions }),
  addCompletion: (completion) =>
    set((state) => ({ completions: [...state.completions, completion] })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

export const useVoiceStore = create<VoiceStore>((set) => ({
  voice: initialVoiceState,

  setListening: (isListening) =>
    set((state) => ({ voice: { ...state.voice, isListening } })),
  setProcessing: (isProcessing) =>
    set((state) => ({ voice: { ...state.voice, isProcessing } })),
  setTranscript: (transcript) =>
    set((state) => ({ voice: { ...state.voice, transcript } })),
  setVoiceError: (error) =>
    set((state) => ({ voice: { ...state.voice, error } })),
  resetVoice: () => set({ voice: initialVoiceState }),
}));
