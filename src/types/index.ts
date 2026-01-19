export interface Habit {
  id: number;
  name: string;
  frequency: "daily" | "weekly" | "monthly";
  streak: number;
  createdAt: string;
}

export interface Completion {
  id: number;
  habitId: number;
  date: string;
  notes?: string;
}

export interface VoiceCommand {
  action: "create" | "complete" | "delete" | "list" | "unknown";
  habitName?: string;
  duration?: string;
  date?: string;
}

export interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
}
