import { useCallback, useEffect, useMemo, useState } from "react";
import { useHabitStore, useVoiceStore } from "@/store/useHabitStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useDatabase } from "@/hooks/useDatabase";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { useOpenAIRealtime } from "@/hooks/useOpenAIRealtime";
import { useHabitAgent } from "@/hooks/useHabitAgent";
import { useSpeech } from "@/hooks/useSpeech";
import { HabitCard } from "@/components/HabitCard";
import { VoiceButton } from "@/components/VoiceButton";
import { AddHabitDialog } from "@/components/AddHabitDialog";
import { DailyProgress } from "@/components/DailyProgress";
import { SettingsDialog } from "@/components/SettingsDialog";
import type { VoiceCommand, Habit, Completion } from "@/types";
import { Sparkles } from "lucide-react";
import "./index.css";

function App() {
  const { habits, isLoading } = useHabitStore();
  const { voice } = useVoiceStore();
  const { getEffectiveApiKey, useOpenAIRealtime: useOpenAI, language } = useSettingsStore();
  const { createHabit, completeHabit, deleteHabit, getTodayCompletions } = useDatabase();
  const { isSupported: isWebSpeechSupported, startListening, stopListening } = useVoiceRecognition();
  const { connect: connectOpenAI, disconnect: disconnectOpenAI, isConnected: isOpenAIConnected } = useOpenAIRealtime();
  const { processUserInput } = useHabitAgent();
  const { speak } = useSpeech();

  const [todayCompletions, setTodayCompletions] = useState<Completion[]>([]);

  const apiKey = getEffectiveApiKey();
  const shouldUseOpenAI = apiKey && useOpenAI;

  const todayCompletedIds = useMemo(
    () => new Set(todayCompletions.map((c) => c.habitId)),
    [todayCompletions]
  );

  const completedCount = useMemo(
    () => habits.filter((h) => todayCompletedIds.has(h.id)).length,
    [habits, todayCompletedIds]
  );

  const loadTodayCompletions = useCallback(async () => {
    const completions = await getTodayCompletions();
    setTodayCompletions(completions);
  }, [getTodayCompletions]);

  useEffect(() => {
    loadTodayCompletions();
  }, [loadTodayCompletions]);

  const handleAddHabit = useCallback(
    async (name: string, frequency: Habit["frequency"]) => {
      const habit = await createHabit(name, frequency);
      if (habit) {
        speak(`Hábito ${name} criado com sucesso!`);
      }
    },
    [createHabit, speak]
  );

  const handleCompleteHabit = useCallback(
    async (habitId: number) => {
      const success = await completeHabit(habitId);
      if (success) {
        const habit = habits.find((h) => h.id === habitId);
        if (habit) {
          const newStreak = habit.streak + 1;
          speak(
            `${habit.name} completado! ${newStreak > 1 ? `Streak de ${newStreak} dias!` : "Primeiro dia!"}`
          );
        }
        await loadTodayCompletions();
      }
    },
    [completeHabit, habits, speak, loadTodayCompletions]
  );

  const handleDeleteHabit = useCallback(
    async (habitId: number) => {
      const habit = habits.find((h) => h.id === habitId);
      const success = await deleteHabit(habitId);
      if (success && habit) {
        speak(`Hábito ${habit.name} removido.`);
      }
    },
    [deleteHabit, habits, speak]
  );

  const processCommand = useCallback(
    async (command: VoiceCommand) => {
      switch (command.action) {
        case "create":
          if (command.habitName) {
            await handleAddHabit(command.habitName, "daily");
          }
          break;

        case "complete":
          if (command.habitName) {
            const habitName = command.habitName.toLowerCase();
            const habit = habits.find(
              (h) =>
                h.name.toLowerCase().includes(habitName) ||
                habitName.includes(h.name.toLowerCase())
            );
            if (habit) {
              await handleCompleteHabit(habit.id);
            } else {
              speak(`Não encontrei o hábito ${command.habitName}`);
            }
          }
          break;

        case "delete":
          if (command.habitName) {
            const habitName = command.habitName.toLowerCase();
            const habit = habits.find(
              (h) =>
                h.name.toLowerCase().includes(habitName) ||
                habitName.includes(h.name.toLowerCase())
            );
            if (habit) {
              await handleDeleteHabit(habit.id);
            } else {
              speak(`Não encontrei o hábito ${command.habitName}`);
            }
          }
          break;

        case "list":
          if (habits.length === 0) {
            speak("Você ainda não tem hábitos cadastrados.");
          } else {
            const names = habits.map((h) => h.name).join(", ");
            speak(`Seus hábitos são: ${names}`);
          }
          break;

        default:
          speak("Desculpe, não entendi o comando. Tente novamente.");
      }
    },
    [habits, handleAddHabit, handleCompleteHabit, handleDeleteHabit, speak]
  );

  const handleVoiceCommand = useCallback(
    async (command: VoiceCommand, _transcript: string) => {
      await processCommand(command);
    },
    [processCommand]
  );

  const handleOpenAITranscription = useCallback(
    async (result: { text: string; isFinal: boolean }) => {
      if (result.isFinal && result.text) {
        console.log("[App] Processing with agent:", result.text);
        // Use the LLM agent to process natural language
        await processUserInput(result.text);
        // Reload completions after agent processes
        await loadTodayCompletions();
        disconnectOpenAI();
      }
    },
    [processUserInput, loadTodayCompletions, disconnectOpenAI]
  );

  const handleVoiceClick = useCallback(() => {
    if (voice.isListening || isOpenAIConnected) {
      if (shouldUseOpenAI) {
        disconnectOpenAI();
      } else {
        stopListening();
      }
    } else {
      if (shouldUseOpenAI && apiKey) {
        connectOpenAI(
          { apiKey, language },
          handleOpenAITranscription
        );
      } else {
        startListening(handleVoiceCommand);
      }
    }
  }, [
    voice.isListening,
    isOpenAIConnected,
    shouldUseOpenAI,
    apiKey,
    language,
    connectOpenAI,
    disconnectOpenAI,
    startListening,
    stopListening,
    handleVoiceCommand,
    handleOpenAITranscription,
  ]);

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const voiceSupported = shouldUseOpenAI || isWebSpeechSupported();

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[oklch(60%_0.25_300)] text-primary-foreground shadow-lg shadow-primary/25">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1
                  className="text-xl font-bold tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Habit Tracker
                </h1>
                <p className="text-xs text-muted-foreground capitalize">{today}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <SettingsDialog />
              <AddHabitDialog onAdd={handleAddHabit} />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr,320px]">
          {/* Habits list */}
          <section>
            <h2
              className="text-lg font-semibold mb-4 text-muted-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Seus Hábitos
            </h2>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : habits.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3
                  className="text-xl font-semibold mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Nenhum hábito ainda
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Comece sua jornada criando seu primeiro hábito. Use o botão acima ou diga{" "}
                  <span className="text-primary font-medium">"Criar hábito ler"</span>
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {habits.map((habit) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    isCompletedToday={todayCompletedIds.has(habit.id)}
                    onComplete={handleCompleteHabit}
                    onDelete={handleDeleteHabit}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Sidebar */}
          <aside className="space-y-6">
            <DailyProgress totalHabits={habits.length} completedHabits={completedCount} />

            {/* Voice assistant help */}
            {voiceSupported && (
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3
                    className="font-semibold text-sm"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Assistente de Voz
                  </h3>
                  {shouldUseOpenAI && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      AI Agent
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Fale naturalmente! O assistente entende contexto.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <span className="text-primary">"Acabei de meditar"</span>
                  </li>
                  <li>
                    <span className="text-primary">"Quero começar a ler todo dia"</span>
                  </li>
                  <li>
                    <span className="text-primary">"O que tenho pra fazer hoje?"</span>
                  </li>
                  <li>
                    <span className="text-primary">"Hoje fiz exercício e li um livro"</span>
                  </li>
                </ul>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Voice button */}
      <VoiceButton
        isListening={voice.isListening || isOpenAIConnected}
        isProcessing={voice.isProcessing}
        isSupported={voiceSupported}
        transcript={voice.transcript}
        onClick={handleVoiceClick}
      />
    </div>
  );
}

export default App;
