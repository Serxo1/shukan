import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Habit } from "@/types";
import { Check, Trash2, Flame } from "lucide-react";

interface HabitCardProps {
  habit: Habit;
  isCompletedToday: boolean;
  onComplete: (habitId: number) => void;
  onDelete: (habitId: number) => void;
}

export function HabitCard({
  habit,
  isCompletedToday,
  onComplete,
  onDelete,
}: HabitCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const frequencyLabel = {
    daily: "Diário",
    weekly: "Semanal",
    monthly: "Mensal",
  }[habit.frequency];

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300",
        isCompletedToday && "ring-2 ring-success/50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Completion indicator glow */}
      {isCompletedToday && (
        <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-transparent pointer-events-none" />
      )}

      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left side - habit info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className={cn(
                  "font-semibold text-lg truncate transition-colors",
                  isCompletedToday && "text-success"
                )}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {habit.name}
              </h3>
              {isCompletedToday && (
                <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-success text-success-foreground">
                  <Check className="w-3 h-3" />
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs font-medium px-2 py-1 rounded-md bg-secondary text-secondary-foreground">
                {frequencyLabel}
              </span>

              {/* Streak display */}
              {habit.streak > 0 && (
                <div className="flex items-center gap-1">
                  <span className="animate-flicker text-base">
                    <Flame className="w-4 h-4 text-orange-500" />
                  </span>
                  <span className="text-sm font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                    {habit.streak}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right side - actions */}
          <div className="flex items-center gap-2">
            {!isCompletedToday && (
              <Button
                size="icon-sm"
                variant="glow"
                onClick={() => onComplete(habit.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Check className="w-4 h-4" />
              </Button>
            )}

            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => onDelete(habit.id)}
              className={cn(
                "text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all",
                isHovered ? "opacity-100" : "opacity-0"
              )}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
