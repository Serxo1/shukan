export type TargetType = "boolean" | "quantity" | "duration";

export interface Habit {
  id: number;
  name: string;
  frequency: "daily" | "weekly" | "monthly";
  streak: number;
  createdAt: string;
  icon: string;
  color: string;
  targetType: TargetType;
  targetValue: number;
  targetUnit?: string;
  bestStreak: number;
  cloudId?: string;      // UUID from Supabase
  categoryId?: number;   // Category ID for rankings
}

export interface Completion {
  id: number;
  habitId: number;
  date: string;
  notes?: string;
  value: number;
}

export interface Goal {
  id: number;
  habitId: number;
  type: "streak" | "weekly" | "monthly";
  targetValue: number;
  achievedAt?: string;
  createdAt: string;
}

export interface Achievement {
  id: number;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  unlockedAt?: string;
  habitId?: number;
}

export type WidgetType =
  | "progress"
  | "celebration"
  | "heatmap"
  | "barchart"
  | "stats"
  | "achievement"
  | "frequency";

export interface ProgressWidgetPayload {
  type: "progress";
  habitName: string;
  habitIcon: string;
  habitColor: string;
  current: number;
  target: number;
  unit?: string;
  isComplete: boolean;
}

export interface CelebrationWidgetPayload {
  type: "celebration";
  title: string;
  message: string;
  habitName?: string;
  streakCount?: number;
}

export interface AchievementWidgetPayload {
  type: "achievement";
  achievement: Achievement;
}

export interface StatsWidgetPayload {
  type: "stats";
  habitName: string;
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
  completionRate: number;
}

export interface HeatmapWidgetPayload {
  type: "heatmap";
  habitName: string;
  data: { date: string; value: number }[];
}

export interface BarChartWidgetPayload {
  type: "barchart";
  habitName: string;
  data: { label: string; value: number }[];
  period: "week" | "month";
}

export interface FrequencyWidgetPayload {
  type: "frequency";
  habitName: string;
  habitIcon: string;
  habitColor: string;
  current: number;
  target: number;
  period: "week" | "month";
  daysRemaining: number;
  isComplete: boolean;
}

export type WidgetPayload =
  | ProgressWidgetPayload
  | CelebrationWidgetPayload
  | AchievementWidgetPayload
  | StatsWidgetPayload
  | HeatmapWidgetPayload
  | BarChartWidgetPayload
  | FrequencyWidgetPayload;

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
