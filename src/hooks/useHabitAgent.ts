import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useHabitStore } from "@/store/useHabitStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useWidgetStore } from "@/store/useWidgetStore";
import { useDatabase } from "@/hooks/useDatabase";
import { useSpeech } from "@/hooks/useSpeech";
import { ACHIEVEMENTS, HABIT_ICONS } from "@/lib/achievements";
import { callChatEdgeFunction } from "@/lib/edge-functions";
import type { Habit, TargetType } from "@/types";

interface ConversationMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface AgentResponse {
  success: boolean;
  message: string;
}

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "criar_habito",
      description: "Cria um novo hábito para o usuário acompanhar. Pode ter meta numérica.",
      parameters: {
        type: "object",
        properties: {
          nome: {
            type: "string",
            description: "Nome do hábito (ex: 'Meditar', 'Ler', 'Beber água')",
          },
          frequencia: {
            type: "string",
            enum: ["daily", "weekly"],
            description: "Frequência do hábito",
          },
          meta: {
            type: "number",
            description: "Meta numérica diária (ex: 8 para 8 copos de água, 20 para 20 minutos)",
          },
          unidade: {
            type: "string",
            description: "Unidade da meta (ex: 'copos', 'min', 'km', 'páginas')",
          },
        },
        required: ["nome"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "completar_habito",
      description: "Marca um hábito booleano como concluído hoje",
      parameters: {
        type: "object",
        properties: {
          nome: {
            type: "string",
            description: "Nome do hábito para marcar como concluído",
          },
        },
        required: ["nome"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "registrar_progresso",
      description: "Registra progresso parcial em um hábito quantitativo (ex: bebi 2 copos)",
      parameters: {
        type: "object",
        properties: {
          nome: {
            type: "string",
            description: "Nome do hábito",
          },
          valor: {
            type: "number",
            description: "Quantidade a adicionar ao progresso de hoje",
          },
        },
        required: ["nome", "valor"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "deletar_habito",
      description: "Remove permanentemente um hábito da lista",
      parameters: {
        type: "object",
        properties: {
          nome: {
            type: "string",
            description: "Nome do hábito para deletar",
          },
        },
        required: ["nome"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "listar_habitos",
      description: "Lista todos os hábitos do usuário com seus status",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "mostrar_estatisticas",
      description: "Mostra estatísticas detalhadas de um hábito específico",
      parameters: {
        type: "object",
        properties: {
          nome: {
            type: "string",
            description: "Nome do hábito para ver estatísticas",
          },
        },
        required: ["nome"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "mostrar_grafico",
      description: "Mostra gráfico visual do hábito: heatmap (calendário) ou barras (semana)",
      parameters: {
        type: "object",
        properties: {
          nome: {
            type: "string",
            description: "Nome do hábito para mostrar gráfico",
          },
          tipo: {
            type: "string",
            enum: ["heatmap", "barras"],
            description: "Tipo de gráfico: 'heatmap' para calendário estilo GitHub, 'barras' para gráfico da semana",
          },
        },
        required: ["nome"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "definir_meta",
      description: "Define uma meta de streak ou frequência (semanal/mensal) para um hábito",
      parameters: {
        type: "object",
        properties: {
          nome: {
            type: "string",
            description: "Nome do hábito para definir meta",
          },
          tipo: {
            type: "string",
            enum: ["streak", "weekly", "monthly"],
            description: "Tipo de meta: 'streak' para dias consecutivos, 'weekly' para vezes por semana, 'monthly' para vezes por mês",
          },
          valor: {
            type: "number",
            description: "Valor da meta (ex: 30 para streak de 30 dias, 5 para 5x por semana, 12 para 12x por mês)",
          },
        },
        required: ["nome", "tipo", "valor"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "verificar_conquistas",
      description: "Lista todas as conquistas (achievements) desbloqueadas pelo usuário",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "configurar_habito",
      description: "Altera a cor ou ícone de um hábito para personalização",
      parameters: {
        type: "object",
        properties: {
          nome: {
            type: "string",
            description: "Nome do hábito para configurar",
          },
          cor: {
            type: "string",
            description: "Nova cor (roxo, rosa, vermelho, amarelo, verde, ciano, azul, índigo)",
          },
          icone: {
            type: "string",
            description: "Novo ícone emoji (ex: 🔥, 💪, 🧘, 📚, 💧)",
          },
        },
        required: ["nome"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "celebrar",
      description: "Dispara animação de celebração para conquistas importantes",
      parameters: {
        type: "object",
        properties: {
          titulo: {
            type: "string",
            description: "Título da celebração",
          },
          mensagem: {
            type: "string",
            description: "Mensagem de celebração",
          },
          habito: {
            type: "string",
            description: "Nome do hábito sendo celebrado (opcional)",
          },
          streak: {
            type: "number",
            description: "Número de dias de streak (opcional)",
          },
        },
        required: ["titulo", "mensagem"],
      },
    },
  },
];

const CONVERSATION_TIMEOUT_MS = 60000; // 1 minute - reset conversation after inactivity

export function useHabitAgent() {
  const { t } = useTranslation();
  const { habits } = useHabitStore();
  const { getEffectiveApiKey, isUsingEdgeFunctions } = useSettingsStore();
  const { showWidget } = useWidgetStore();
  const {
    createHabit,
    completeHabit,
    deleteHabit,
    getTodayCompletions,
    logProgress,
    getHabitStats,
    getTodayProgress,
    getCompletionHistory,
    getWeeklyData,
    createGoal,
    unlockAchievement,
    getAchievements,
    isAchievementUnlocked,
    updateHabitCustomization,
    getAllHabitsCompletedToday,
    getConsecutivePerfectDays,
    getFrequencyProgress,
  } = useDatabase();
  const { speak } = useSpeech();

  // Conversation memory
  const conversationRef = useRef<ConversationMessage[]>([]);
  const lastInteractionRef = useRef<number>(0);

  const findHabitByName = useCallback(
    (name: string): Habit | undefined => {
      const searchName = name.toLowerCase();
      return habits.find(
        (h) =>
          h.name.toLowerCase().includes(searchName) ||
          searchName.includes(h.name.toLowerCase())
      );
    },
    [habits]
  );

  // Check and unlock achievements
  const checkAchievements = useCallback(
    async (context: {
      type: "habit_created" | "habit_completed" | "streak_milestone";
      habitId?: number;
      streak?: number;
    }) => {
      const unlockedAchievements: { code: string; name: string; icon: string }[] = [];

      // First habit created
      if (context.type === "habit_created" && habits.length === 0) {
        const unlocked = await isAchievementUnlocked("first_habit");
        if (!unlocked) {
          const achievement = ACHIEVEMENTS.find((a) => a.code === "first_habit");
          if (achievement) {
            await unlockAchievement(
              achievement.code,
              achievement.name,
              achievement.description,
              achievement.icon,
              context.habitId
            );
            unlockedAchievements.push({
              code: achievement.code,
              name: achievement.name,
              icon: achievement.icon,
            });
          }
        }
      }

      // First completion
      if (context.type === "habit_completed") {
        const unlocked = await isAchievementUnlocked("first_completion");
        if (!unlocked) {
          const achievement = ACHIEVEMENTS.find((a) => a.code === "first_completion");
          if (achievement) {
            await unlockAchievement(
              achievement.code,
              achievement.name,
              achievement.description,
              achievement.icon,
              context.habitId
            );
            unlockedAchievements.push({
              code: achievement.code,
              name: achievement.name,
              icon: achievement.icon,
            });
          }
        }

        // Check streak achievements
        if (context.streak) {
          const streakAchievements = [
            { streak: 7, code: "streak_7" },
            { streak: 30, code: "streak_30" },
            { streak: 100, code: "streak_100" },
          ];

          for (const sa of streakAchievements) {
            if (context.streak >= sa.streak) {
              const unlocked = await isAchievementUnlocked(sa.code);
              if (!unlocked) {
                const achievement = ACHIEVEMENTS.find((a) => a.code === sa.code);
                if (achievement) {
                  await unlockAchievement(
                    achievement.code,
                    achievement.name,
                    achievement.description,
                    achievement.icon,
                    context.habitId
                  );
                  unlockedAchievements.push({
                    code: achievement.code,
                    name: achievement.name,
                    icon: achievement.icon,
                  });
                }
              }
            }
          }
        }

        // Check perfect day
        const allCompleted = await getAllHabitsCompletedToday();
        if (allCompleted) {
          const unlocked = await isAchievementUnlocked("perfect_day");
          if (!unlocked) {
            const achievement = ACHIEVEMENTS.find((a) => a.code === "perfect_day");
            if (achievement) {
              await unlockAchievement(
                achievement.code,
                achievement.name,
                achievement.description,
                achievement.icon
              );
              unlockedAchievements.push({
                code: achievement.code,
                name: achievement.name,
                icon: achievement.icon,
              });
            }
          }

          // Check perfect week
          const perfectDays = await getConsecutivePerfectDays();
          if (perfectDays >= 7) {
            const unlockedWeek = await isAchievementUnlocked("perfect_week");
            if (!unlockedWeek) {
              const achievement = ACHIEVEMENTS.find((a) => a.code === "perfect_week");
              if (achievement) {
                await unlockAchievement(
                  achievement.code,
                  achievement.name,
                  achievement.description,
                  achievement.icon
                );
                unlockedAchievements.push({
                  code: achievement.code,
                  name: achievement.name,
                  icon: achievement.icon,
                });
              }
            }
          }
        }
      }

      // Five habits achievement
      if (context.type === "habit_created" && habits.length === 4) {
        const unlocked = await isAchievementUnlocked("five_habits");
        if (!unlocked) {
          const achievement = ACHIEVEMENTS.find((a) => a.code === "five_habits");
          if (achievement) {
            await unlockAchievement(
              achievement.code,
              achievement.name,
              achievement.description,
              achievement.icon
            );
            unlockedAchievements.push({
              code: achievement.code,
              name: achievement.name,
              icon: achievement.icon,
            });
          }
        }
      }

      // Show achievement widget for first unlocked
      if (unlockedAchievements.length > 0) {
        const first = unlockedAchievements[0];
        const achievementDef = ACHIEVEMENTS.find((a) => a.code === first.code);
        if (achievementDef) {
          setTimeout(() => {
            showWidget({
              type: "achievement",
              achievement: {
                id: 0,
                code: achievementDef.code,
                name: achievementDef.name,
                description: achievementDef.description,
                icon: achievementDef.icon,
                unlockedAt: new Date().toISOString(),
              },
            });
          }, 2500);
        }
      }

      return unlockedAchievements;
    },
    [habits, isAchievementUnlocked, unlockAchievement, getAllHabitsCompletedToday, getConsecutivePerfectDays, showWidget]
  );

  const executeToolCall = useCallback(
    async (toolCall: ToolCall): Promise<string> => {
      const { name, arguments: argsStr } = toolCall.function;
      const args = JSON.parse(argsStr);

      console.log("[Agent] Executing tool:", name, args);

      switch (name) {
        case "criar_habito": {
          const habitName = args.nome;
          const frequency = args.frequencia || "daily";
          const meta = args.meta;
          const unidade = args.unidade;

          // Check if habit already exists
          const existing = findHabitByName(habitName);
          if (existing) {
            return JSON.stringify({
              success: false,
              message: `Hábito "${existing.name}" já existe`,
            });
          }

          // Determine target type based on whether meta is provided
          const options = meta
            ? {
                targetType: "quantity" as TargetType,
                targetValue: meta,
                targetUnit: unidade,
              }
            : undefined;

          const habit = await createHabit(habitName, frequency, options);
          if (habit) {
            // Check for achievements
            await checkAchievements({ type: "habit_created", habitId: habit.id });

            const metaText = meta ? ` com meta de ${meta} ${unidade || ""}` : "";
            return JSON.stringify({
              success: true,
              message: `Hábito "${habitName}" criado${metaText}`,
              habit: { id: habit.id, name: habit.name, targetType: habit.targetType, targetValue: habit.targetValue, targetUnit: habit.targetUnit },
            });
          }
          return JSON.stringify({
            success: false,
            message: "Falha ao criar hábito",
          });
        }

        case "completar_habito": {
          const habit = findHabitByName(args.nome);
          if (!habit) {
            return JSON.stringify({
              success: false,
              message: `Hábito "${args.nome}" não encontrado`,
              available_habits: habits.map((h) => h.name),
            });
          }

          const completions = await getTodayCompletions();
          const alreadyCompleted = completions.some((c) => c.habitId === habit.id);

          if (alreadyCompleted) {
            return JSON.stringify({
              success: true,
              message: `Hábito "${habit.name}" já foi completado hoje`,
              already_completed: true,
            });
          }

          const result = await completeHabit(habit.id);
          if (result.success) {
            const newStreak = result.streak;
            const isMilestone = newStreak === 7 || newStreak === 30 || newStreak === 100;

            // Show celebration - bigger for milestones
            if (isMilestone) {
              showWidget({
                type: "celebration",
                title: newStreak === 100 ? "Lendário!" : newStreak === 30 ? "Um mês!" : "Uma semana!",
                message: `${newStreak} dias consecutivos de ${habit.name}!`,
                habitName: habit.name,
                streakCount: newStreak,
              });
            } else {
              // Regular completion celebration
              showWidget({
                type: "celebration",
                title: "Feito!",
                message: `${habit.name} completado!`,
                habitName: habit.name,
                streakCount: newStreak,
              });
            }

            // Check for achievements
            await checkAchievements({
              type: "habit_completed",
              habitId: habit.id,
              streak: newStreak,
            });

            return JSON.stringify({
              success: true,
              message: `Hábito "${habit.name}" completado! Streak: ${newStreak} dias`,
              streak: newStreak,
              is_milestone: isMilestone,
            });
          }
          return JSON.stringify({
            success: false,
            message: "Falha ao completar hábito",
          });
        }

        case "registrar_progresso": {
          const habit = findHabitByName(args.nome);
          if (!habit) {
            return JSON.stringify({
              success: false,
              message: `Hábito "${args.nome}" não encontrado`,
              available_habits: habits.map((h) => h.name),
            });
          }

          const valor = args.valor;
          const result = await logProgress(habit.id, valor);

          // If completed, show celebration; otherwise show progress
          if (result.isComplete) {
            const newStreak = result.streak;
            const isMilestone = newStreak === 7 || newStreak === 30 || newStreak === 100;

            if (isMilestone) {
              showWidget({
                type: "celebration",
                title: newStreak === 100 ? "Lendário!" : newStreak === 30 ? "Um mês!" : "Uma semana!",
                message: `${newStreak} dias consecutivos de ${habit.name}!`,
                habitName: habit.name,
                streakCount: newStreak,
              });
            } else {
              // Regular goal completion celebration
              showWidget({
                type: "celebration",
                title: "Meta atingida!",
                message: `${result.current}/${result.target} ${habit.targetUnit || ""} de ${habit.name}!`,
                habitName: habit.name,
                streakCount: newStreak,
              });
            }

            // Check for achievements
            await checkAchievements({
              type: "habit_completed",
              habitId: habit.id,
              streak: newStreak,
            });
          } else {
            // Show progress widget when not complete yet
            showWidget({
              type: "progress",
              habitName: habit.name,
              habitIcon: habit.icon,
              habitColor: habit.color,
              current: result.current,
              target: result.target,
              unit: habit.targetUnit,
              isComplete: result.isComplete,
            });
          }

          return JSON.stringify({
            success: true,
            message: result.isComplete
              ? `Meta atingida! ${result.current}/${result.target} ${habit.targetUnit || ""}`
              : `Progresso: ${result.current}/${result.target} ${habit.targetUnit || ""}`,
            current: result.current,
            target: result.target,
            is_complete: result.isComplete,
            streak: result.streak,
          });
        }

        case "deletar_habito": {
          const habit = findHabitByName(args.nome);
          if (!habit) {
            return JSON.stringify({
              success: false,
              message: `Hábito "${args.nome}" não encontrado`,
              available_habits: habits.map((h) => h.name),
            });
          }

          const success = await deleteHabit(habit.id);
          if (success) {
            return JSON.stringify({
              success: true,
              message: `Hábito "${habit.name}" removido`,
            });
          }
          return JSON.stringify({
            success: false,
            message: "Falha ao deletar hábito",
          });
        }

        case "listar_habitos": {
          const completions = await getTodayCompletions();
          const completedIds = new Set(completions.map((c) => c.habitId));

          const habitsList = await Promise.all(
            habits.map(async (h) => {
              if (h.targetType === "quantity") {
                const progress = await getTodayProgress(h.id);
                return {
                  nome: h.name,
                  streak: h.streak,
                  completado_hoje: progress.isComplete,
                  progresso: `${progress.current}/${progress.target} ${h.targetUnit || ""}`,
                };
              }
              return {
                nome: h.name,
                streak: h.streak,
                completado_hoje: completedIds.has(h.id),
              };
            })
          );

          return JSON.stringify({
            success: true,
            total: habits.length,
            completados_hoje: habitsList.filter((h) => h.completado_hoje).length,
            habitos: habitsList,
          });
        }

        case "mostrar_estatisticas": {
          const habit = findHabitByName(args.nome);
          if (!habit) {
            return JSON.stringify({
              success: false,
              message: `Hábito "${args.nome}" não encontrado`,
              available_habits: habits.map((h) => h.name),
            });
          }

          const stats = await getHabitStats(habit.id);
          const daysTracking = Math.ceil(
            (Date.now() - new Date(habit.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          );
          const completionRate = daysTracking > 0 ? (stats.total / daysTracking) * 100 : 0;

          // Show stats widget
          showWidget({
            type: "stats",
            habitName: habit.name,
            currentStreak: habit.streak,
            bestStreak: habit.bestStreak,
            totalCompletions: stats.total,
            completionRate: Math.min(completionRate, 100),
          });

          return JSON.stringify({
            success: true,
            message: `Estatísticas de ${habit.name}`,
            stats: {
              streak_atual: habit.streak,
              melhor_streak: habit.bestStreak,
              total_completions: stats.total,
              esta_semana: stats.thisWeek,
              este_mes: stats.thisMonth,
              taxa_conclusao: `${Math.round(completionRate)}%`,
            },
          });
        }

        case "mostrar_grafico": {
          const habit = findHabitByName(args.nome);
          if (!habit) {
            return JSON.stringify({
              success: false,
              message: `Hábito "${args.nome}" não encontrado`,
              available_habits: habits.map((h) => h.name),
            });
          }

          const tipo = args.tipo || "heatmap";

          if (tipo === "barras") {
            const weeklyData = await getWeeklyData(habit.id);
            showWidget({
              type: "barchart",
              habitName: habit.name,
              data: weeklyData,
              period: "week",
            });

            return JSON.stringify({
              success: true,
              message: `Gráfico de barras de ${habit.name}`,
              tipo: "barras",
            });
          } else {
            const historyData = await getCompletionHistory(habit.id, 90);
            showWidget({
              type: "heatmap",
              habitName: habit.name,
              data: historyData,
            });

            return JSON.stringify({
              success: true,
              message: `Calendário de ${habit.name}`,
              tipo: "heatmap",
            });
          }
        }

        case "definir_meta": {
          const habit = findHabitByName(args.nome);
          if (!habit) {
            return JSON.stringify({
              success: false,
              message: `Hábito "${args.nome}" não encontrado`,
              available_habits: habits.map((h) => h.name),
            });
          }

          const tipo = args.tipo as "streak" | "weekly" | "monthly";
          const valor = args.valor;

          const goal = await createGoal(habit.id, tipo, valor);
          if (goal) {
            let metaText: string;
            if (tipo === "streak") {
              metaText = `streak de ${valor} dias`;
            } else if (tipo === "weekly") {
              metaText = `${valor}x por semana`;
            } else {
              metaText = `${valor}x por mês`;
            }

            // Show FrequencyWidget for weekly/monthly goals
            if (tipo === "weekly" || tipo === "monthly") {
              const period = tipo === "weekly" ? "week" : "month";
              const progress = await getFrequencyProgress(habit.id, period);

              showWidget({
                type: "frequency",
                habitName: habit.name,
                habitIcon: habit.icon,
                habitColor: habit.color,
                current: progress.current,
                target: valor,
                period: period,
                daysRemaining: progress.daysRemaining,
                isComplete: progress.current >= valor,
              });
            }

            return JSON.stringify({
              success: true,
              message: `Meta definida: ${metaText} em ${habit.name}!`,
              goal: { id: goal.id, type: tipo, target: valor },
            });
          }

          return JSON.stringify({
            success: false,
            message: "Falha ao criar meta",
          });
        }

        case "verificar_conquistas": {
          const achievements = await getAchievements();

          if (achievements.length === 0) {
            return JSON.stringify({
              success: true,
              message: "Você ainda não desbloqueou conquistas. Continue completando hábitos!",
              total: 0,
              conquistas: [],
            });
          }

          const conquistasList = achievements.map((a) => ({
            nome: a.name,
            descricao: a.description,
            icone: a.icon,
            data: a.unlockedAt,
          }));

          return JSON.stringify({
            success: true,
            message: `Você tem ${achievements.length} conquista(s)!`,
            total: achievements.length,
            conquistas: conquistasList,
          });
        }

        case "configurar_habito": {
          const habit = findHabitByName(args.nome);
          if (!habit) {
            return JSON.stringify({
              success: false,
              message: `Hábito "${args.nome}" não encontrado`,
              available_habits: habits.map((h) => h.name),
            });
          }

          const updates: { icon?: string; color?: string } = {};

          // Handle color
          if (args.cor) {
            const colorMap: Record<string, string> = {
              roxo: "#8B5CF6",
              purple: "#8B5CF6",
              rosa: "#EC4899",
              pink: "#EC4899",
              vermelho: "#EF4444",
              red: "#EF4444",
              amarelo: "#F59E0B",
              yellow: "#F59E0B",
              verde: "#10B981",
              green: "#10B981",
              ciano: "#06B6D4",
              cyan: "#06B6D4",
              azul: "#3B82F6",
              blue: "#3B82F6",
              indigo: "#6366F1",
              índigo: "#6366F1",
            };
            const normalizedColor = args.cor.toLowerCase();
            updates.color = colorMap[normalizedColor] || args.cor;
          }

          // Handle icon
          if (args.icone) {
            updates.icon = args.icone;
          }

          if (Object.keys(updates).length === 0) {
            return JSON.stringify({
              success: false,
              message: "Especifique cor ou ícone para alterar",
              cores_disponiveis: ["roxo", "rosa", "vermelho", "amarelo", "verde", "ciano", "azul", "índigo"],
              icones_exemplo: HABIT_ICONS.slice(0, 8),
            });
          }

          const success = await updateHabitCustomization(habit.id, updates);
          if (success) {
            const changes = [];
            if (updates.color) changes.push(`cor para ${args.cor}`);
            if (updates.icon) changes.push(`ícone para ${updates.icon}`);

            return JSON.stringify({
              success: true,
              message: `${habit.name} atualizado: ${changes.join(" e ")}!`,
            });
          }

          return JSON.stringify({
            success: false,
            message: "Falha ao atualizar hábito",
          });
        }

        case "celebrar": {
          showWidget({
            type: "celebration",
            title: args.titulo,
            message: args.mensagem,
            habitName: args.habito,
            streakCount: args.streak,
          });

          return JSON.stringify({
            success: true,
            message: "Celebração disparada!",
          });
        }

        default:
          return JSON.stringify({
            success: false,
            message: `Ferramenta desconhecida: ${name}`,
          });
      }
    },
    [habits, findHabitByName, createHabit, completeHabit, deleteHabit, getTodayCompletions, logProgress, getHabitStats, getTodayProgress, getCompletionHistory, getWeeklyData, createGoal, getAchievements, updateHabitCustomization, checkAchievements, showWidget, getFrequencyProgress]
  );

  const clearConversation = useCallback(() => {
    conversationRef.current = [];
    console.log("[Agent] Conversation cleared");
  }, []);

  const processUserInput = useCallback(
    async (userInput: string): Promise<AgentResponse> => {
      const useEdgeFunctions = isUsingEdgeFunctions();
      const apiKey = getEffectiveApiKey();

      // Need either Edge Functions (authenticated) or direct API key
      if (!useEdgeFunctions && !apiKey) {
        return {
          success: false,
          message: "Faça login para usar o assistente ou configure sua própria API key",
        };
      }

      console.log("[Agent] Processing input:", userInput, "| Using Edge Functions:", useEdgeFunctions);

      // Check if conversation timed out
      const now = Date.now();
      if (now - lastInteractionRef.current > CONVERSATION_TIMEOUT_MS) {
        conversationRef.current = [];
        console.log("[Agent] Conversation reset due to timeout");
      }
      lastInteractionRef.current = now;

      try {
        // Build context about current habits
        const completions = await getTodayCompletions();
        const completedIds = new Set(completions.map((c) => c.habitId));

        const habitsContext = habits.length > 0
          ? `Hábitos atuais do usuário:\n${habits
              .map((h) => `- ${h.name} (streak: ${h.streak} dias, ${completedIds.has(h.id) ? "completado hoje" : "pendente"})`)
              .join("\n")}`
          : "O usuário ainda não tem hábitos cadastrados.";

        // Add user message to conversation history
        conversationRef.current.push({ role: "user", content: userInput });

        // Build messages with conversation history
        const messages: ConversationMessage[] = [
          { role: "system", content: t("agent.systemPrompt") },
          { role: "system", content: habitsContext },
          ...conversationRef.current,
        ];

        console.log("[Agent] Conversation history:", conversationRef.current.length, "messages");

        // First API call - use Edge Function or direct API
        let result;
        if (useEdgeFunctions) {
          result = await callChatEdgeFunction({
            messages: messages as Parameters<typeof callChatEdgeFunction>[0]['messages'],
            tools: TOOLS,
            tool_choice: "auto",
            temperature: 0.7,
            max_tokens: 500,
          });
        } else {
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages,
              tools: TOOLS,
              tool_choice: "auto",
              temperature: 0.7,
              max_tokens: 500,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error("[Agent] API error:", error);
            return {
              success: false,
              message: "Erro ao processar com IA",
            };
          }

          result = await response.json();
        }

        let assistantMessage = result.choices[0].message;

        console.log("[Agent] Initial response:", assistantMessage);

        // Track messages for this turn (for tool calls)
        const turnMessages = [...messages];

        // Process tool calls if any
        while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
          // Add assistant message with tool calls to turn
          turnMessages.push(assistantMessage);

          const toolResults: ConversationMessage[] = [];

          for (const toolCall of assistantMessage.tool_calls) {
            const toolResult = await executeToolCall(toolCall);
            toolResults.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: toolResult,
            });
          }

          // Add tool results to turn
          turnMessages.push(...toolResults);

          // Continue conversation with tool results
          let continuedResult;
          if (useEdgeFunctions) {
            try {
              continuedResult = await callChatEdgeFunction({
                messages: turnMessages as Parameters<typeof callChatEdgeFunction>[0]['messages'],
                tools: TOOLS,
                tool_choice: "auto",
                temperature: 0.7,
                max_tokens: 500,
              });
            } catch (err) {
              console.error("[Agent] Continued Edge Function error:", err);
              break;
            }
          } else {
            const continuedResponse = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: turnMessages,
                tools: TOOLS,
                tool_choice: "auto",
                temperature: 0.7,
                max_tokens: 500,
              }),
            });

            if (!continuedResponse.ok) {
              console.error("[Agent] Continued API error");
              break;
            }

            continuedResult = await continuedResponse.json();
          }

          result = continuedResult;
          assistantMessage = result.choices[0].message;

          console.log("[Agent] Continued response:", assistantMessage);
        }

        const finalMessage = assistantMessage.content || "Tarefa concluída!";

        // Save assistant's final response to conversation history
        conversationRef.current.push({ role: "assistant", content: finalMessage });

        // Keep conversation history reasonable (last 10 exchanges)
        if (conversationRef.current.length > 20) {
          conversationRef.current = conversationRef.current.slice(-20);
        }

        console.log("[Agent] Conversation now has", conversationRef.current.length, "messages");

        // Speak the response
        speak(finalMessage);

        return {
          success: true,
          message: finalMessage,
        };
      } catch (error) {
        console.error("[Agent] Error:", error);
        // Remove the failed user message from history
        conversationRef.current.pop();
        return {
          success: false,
          message: "Erro ao processar sua solicitação",
        };
      }
    },
    [habits, getEffectiveApiKey, isUsingEdgeFunctions, getTodayCompletions, executeToolCall, speak]
  );

  return {
    processUserInput,
    clearConversation,
  };
}
