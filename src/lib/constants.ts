// Window sizes
export const WINDOW_SIZES = {
  ORB: { width: 500, height: 64 },
  ORB_EXPANDED_MAX_HEIGHT: 600,
  SETTINGS: { width: 900, height: 640 },
  ONBOARDING: { width: 450, height: 520 },
} as const;

// Animation & timing
export const TIMING = {
  WINDOW_RESIZE_DELAY_MS: 250,
  CONVERSATION_TIMEOUT_MS: 60000,
  SYNC_DEBOUNCE_MS: 1000,
  TOAST_DURATION_MS: 3000,
} as const;

// Streak milestones for achievements
export const STREAK_MILESTONES = [7, 30, 100] as const;

// Perfect days milestones for achievements
export const PERFECT_DAY_MILESTONES = [1, 7, 30] as const;

// Default habit values
export const HABIT_DEFAULTS = {
  ICON: "star",
  COLOR: "#8B5CF6",
  TARGET_VALUE: 1,
  TARGET_TYPE: "boolean",
} as const;

// Database
export const DATABASE = {
  NAME: "sqlite:habits.db",
  MAX_DAYS_HISTORY: 365,
  WEEKLY_DATA_DAYS: 7,
} as const;

// API
export const API = {
  OPENAI_MODEL: "gpt-4o-mini",
  OPENAI_REALTIME_MODEL: "gpt-4o-realtime-preview-2024-10-01",
  TTS_DEFAULT_VOICE: "alloy",
  MAX_TOKENS: 1024,
} as const;

// UI
export const UI = {
  MAX_HABIT_NAME_LENGTH: 100,
  MAX_NOTES_LENGTH: 500,
  ITEMS_PER_PAGE: 20,
} as const;

// Week days labels (Portuguese)
export const WEEK_DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
export const WEEK_DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
