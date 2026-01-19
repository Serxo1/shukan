import { useCallback, useRef } from "react";
import { useHabitStore } from "@/store/useHabitStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useDatabase } from "@/hooks/useDatabase";
import { useSpeech } from "@/hooks/useSpeech";
import type { Habit } from "@/types";

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

const SYSTEM_PROMPT = `Você é um assistente de hábitos. Ajude o usuário a gerenciar hábitos diários.

Ferramentas disponíveis:
- criar_habito: Cria novo hábito
- completar_habito: Marca como feito hoje
- deletar_habito: Remove hábito
- listar_habitos: Lista hábitos

REGRAS IMPORTANTES:
1. Respostas CURTAS (máximo 1-2 frases)
2. Seja direto e objetivo
3. Se o usuário fez algo (ex: "li"), complete o hábito relacionado
4. Se quer fazer algo novo regularmente, crie o hábito
5. Use português brasileiro casual

Exemplos de resposta IDEAL:
- "Pronto! Hábito Ler criado."
- "Meditação completada! Streak de 5 dias."
- "Você tem 3 hábitos: Ler, Meditar e Exercício. Falta completar Exercício hoje."
- "Hábito removido!"

NÃO faça respostas longas. Seja breve.`;

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "criar_habito",
      description: "Cria um novo hábito para o usuário acompanhar diariamente",
      parameters: {
        type: "object",
        properties: {
          nome: {
            type: "string",
            description: "Nome do hábito (ex: 'Meditar', 'Ler', 'Exercitar')",
          },
          frequencia: {
            type: "string",
            enum: ["daily", "weekly"],
            description: "Frequência do hábito",
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
      description: "Marca um hábito existente como concluído hoje",
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
];

const CONVERSATION_TIMEOUT_MS = 60000; // 1 minute - reset conversation after inactivity

export function useHabitAgent() {
  const { habits } = useHabitStore();
  const { getEffectiveApiKey } = useSettingsStore();
  const { createHabit, completeHabit, deleteHabit, getTodayCompletions } = useDatabase();
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

  const executeToolCall = useCallback(
    async (toolCall: ToolCall): Promise<string> => {
      const { name, arguments: argsStr } = toolCall.function;
      const args = JSON.parse(argsStr);

      console.log("[Agent] Executing tool:", name, args);

      switch (name) {
        case "criar_habito": {
          const habitName = args.nome;
          const frequency = args.frequencia || "daily";

          // Check if habit already exists
          const existing = findHabitByName(habitName);
          if (existing) {
            return JSON.stringify({
              success: false,
              message: `Hábito "${existing.name}" já existe`,
            });
          }

          const habit = await createHabit(habitName, frequency);
          if (habit) {
            return JSON.stringify({
              success: true,
              message: `Hábito "${habitName}" criado com sucesso`,
              habit: { id: habit.id, name: habit.name },
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

          const success = await completeHabit(habit.id);
          if (success) {
            return JSON.stringify({
              success: true,
              message: `Hábito "${habit.name}" completado! Streak: ${habit.streak + 1} dias`,
              streak: habit.streak + 1,
            });
          }
          return JSON.stringify({
            success: false,
            message: "Falha ao completar hábito",
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

          const habitsList = habits.map((h) => ({
            nome: h.name,
            streak: h.streak,
            completado_hoje: completedIds.has(h.id),
          }));

          return JSON.stringify({
            success: true,
            total: habits.length,
            completados_hoje: completedIds.size,
            habitos: habitsList,
          });
        }

        default:
          return JSON.stringify({
            success: false,
            message: `Ferramenta desconhecida: ${name}`,
          });
      }
    },
    [habits, findHabitByName, createHabit, completeHabit, deleteHabit, getTodayCompletions]
  );

  const clearConversation = useCallback(() => {
    conversationRef.current = [];
    console.log("[Agent] Conversation cleared");
  }, []);

  const processUserInput = useCallback(
    async (userInput: string): Promise<AgentResponse> => {
      const apiKey = getEffectiveApiKey();
      if (!apiKey) {
        return {
          success: false,
          message: "API key da OpenAI não configurada",
        };
      }

      console.log("[Agent] Processing input:", userInput);

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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: habitsContext },
          ...conversationRef.current,
        ];

        console.log("[Agent] Conversation history:", conversationRef.current.length, "messages");

        // First API call
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

        let result = await response.json();
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

          result = await continuedResponse.json();
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
    [habits, getEffectiveApiKey, getTodayCompletions, executeToolCall, speak]
  );

  return {
    processUserInput,
    clearConversation,
  };
}
