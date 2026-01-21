export interface AchievementDefinition {
  code: string;
  name: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    code: "first_habit",
    name: "Primeiro Passo",
    description: "Criou seu primeiro hábito",
    icon: "🌱",
  },
  {
    code: "first_completion",
    name: "Começou!",
    description: "Completou um hábito pela primeira vez",
    icon: "✨",
  },
  {
    code: "streak_7",
    name: "Uma Semana",
    description: "Manteve um streak de 7 dias",
    icon: "🔥",
  },
  {
    code: "streak_30",
    name: "Um Mês",
    description: "Manteve um streak de 30 dias",
    icon: "💪",
  },
  {
    code: "streak_100",
    name: "Centenário",
    description: "Manteve um streak de 100 dias",
    icon: "🏆",
  },
  {
    code: "perfect_day",
    name: "Dia Perfeito",
    description: "Completou todos os hábitos em um dia",
    icon: "⭐",
  },
  {
    code: "perfect_week",
    name: "Semana Perfeita",
    description: "Completou todos os hábitos por 7 dias seguidos",
    icon: "👑",
  },
  {
    code: "five_habits",
    name: "Colecionador",
    description: "Criou 5 hábitos diferentes",
    icon: "📚",
  },
  {
    code: "early_bird",
    name: "Madrugador",
    description: "Completou um hábito antes das 7h",
    icon: "🌅",
  },
  {
    code: "night_owl",
    name: "Coruja",
    description: "Completou um hábito depois das 22h",
    icon: "🦉",
  },
  {
    code: "comeback",
    name: "Volta por Cima",
    description: "Retomou um hábito após perder o streak",
    icon: "🔄",
  },
  {
    code: "goal_achieved",
    name: "Meta Batida",
    description: "Atingiu uma meta definida",
    icon: "🎯",
  },
];

export const ACHIEVEMENT_MAP = new Map(
  ACHIEVEMENTS.map((a) => [a.code, a])
);

export function getAchievementDefinition(code: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_MAP.get(code);
}

// Icon options for habit customization
export const HABIT_ICONS = [
  "⭐", "🔥", "💪", "🧘", "📚", "💧", "🏃", "🎯",
  "💤", "🥗", "🧠", "✍️", "🎵", "🌱", "💊", "🚶",
  "🏋️", "🚴", "🧹", "📝", "💻", "🎨", "🗣️", "🤝",
];

// Color options for habit customization
export const HABIT_COLORS = [
  "#8B5CF6", // purple (default)
  "#EC4899", // pink
  "#EF4444", // red
  "#F59E0B", // amber
  "#10B981", // emerald
  "#06B6D4", // cyan
  "#3B82F6", // blue
  "#6366F1", // indigo
];
