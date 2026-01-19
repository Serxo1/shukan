import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp } from "lucide-react";

interface DailyProgressProps {
  totalHabits: number;
  completedHabits: number;
}

export function DailyProgress({ totalHabits, completedHabits }: DailyProgressProps) {
  const percentage = totalHabits > 0 ? (completedHabits / totalHabits) * 100 : 0;
  const remaining = totalHabits - completedHabits;

  const getMessage = () => {
    if (totalHabits === 0) return "Adicione seu primeiro hábito!";
    if (percentage === 100) return "Parabéns! Todos os hábitos completos!";
    if (percentage >= 75) return "Quase lá! Continue assim!";
    if (percentage >= 50) return "Bom progresso! Mantenha o foco!";
    if (percentage > 0) return "Você começou bem! Continue!";
    return "Vamos começar o dia!";
  };

  return (
    <Card className="overflow-hidden">
      {/* Decorative gradient top */}
      <div className="h-1.5 bg-gradient-to-r from-primary via-[oklch(65%_0.25_300)] to-primary" />

      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
            <Target className="w-5 h-5" />
          </div>
          Progresso de Hoje
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              {completedHabits}
              <span className="text-xl text-muted-foreground font-normal">/{totalHabits}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">{getMessage()}</p>
          </div>

          {percentage === 100 && totalHabits > 0 && (
            <div className="flex items-center gap-1 text-success">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-semibold">100%</span>
            </div>
          )}
        </div>

        <Progress value={completedHabits} max={totalHabits} />

        {remaining > 0 && (
          <p className="text-xs text-muted-foreground">
            Faltam <span className="font-semibold text-foreground">{remaining}</span> hábito{remaining > 1 ? "s" : ""} para completar o dia
          </p>
        )}
      </CardContent>
    </Card>
  );
}
