import { useMemo } from "react";
import { motion } from "framer-motion";
import type { HeatmapWidgetPayload } from "@/types";

interface HeatmapWidgetProps {
  data: HeatmapWidgetPayload;
  onDismiss?: () => void;
}

const DAYS_OF_WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function getIntensityColor(value: number, maxValue: number): string {
  if (value === 0) return "rgba(255,255,255,0.05)";
  const intensity = Math.min(value / Math.max(maxValue, 1), 1);
  if (intensity <= 0.25) return "rgba(139, 92, 246, 0.3)";
  if (intensity <= 0.5) return "rgba(139, 92, 246, 0.5)";
  if (intensity <= 0.75) return "rgba(139, 92, 246, 0.7)";
  return "rgba(139, 92, 246, 1)";
}

export function HeatmapWidget({ data, onDismiss }: HeatmapWidgetProps) {
  const { grid, maxValue, monthLabels } = useMemo(() => {
    const today = new Date();
    const dataMap = new Map(data.data.map((d) => [d.date, d.value]));

    // Generate last 12 weeks (84 days)
    const numWeeks = 12;
    const totalDays = numWeeks * 7;
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - totalDays + 1);

    // Adjust to start on Sunday
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const weeks: { date: Date; value: number }[][] = [];
    let currentWeek: { date: Date; value: number }[] = [];
    let maxVal = 1;

    const currentDate = new Date(startDate);
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const value = dataMap.get(dateStr) || 0;
      maxVal = Math.max(maxVal, value);

      currentWeek.push({ date: new Date(currentDate), value });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    // Generate month labels
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0]?.date;
      if (firstDayOfWeek) {
        const month = firstDayOfWeek.getMonth();
        if (month !== lastMonth) {
          labels.push({ month: MONTHS[month], weekIndex });
          lastMonth = month;
        }
      }
    });

    return { grid: weeks, maxValue: maxVal, monthLabels: labels };
  }, [data.data]);

  const totalCompletions = data.data.reduce((sum, d) => sum + d.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="w-full p-4 rounded-xl glass cursor-pointer"
      onClick={onDismiss}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-sm text-foreground">
          {data.habitName}
        </h4>
        <span className="text-xs text-muted-foreground">
          {totalCompletions} nos últimos 3 meses
        </span>
      </div>

      {/* Month labels */}
      <div className="flex mb-1 ml-8">
        {monthLabels.map((label, i) => (
          <div
            key={i}
            className="text-[10px] text-muted-foreground"
            style={{
              position: "relative",
              left: `${label.weekIndex * 14}px`,
              marginRight: i < monthLabels.length - 1 ? "0" : "auto",
            }}
          >
            {label.month}
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 mr-1">
          {DAYS_OF_WEEK.map((day, i) => (
            <div
              key={day}
              className="h-3 text-[9px] text-muted-foreground flex items-center"
              style={{ visibility: i % 2 === 1 ? "visible" : "hidden" }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="flex gap-0.5 overflow-x-auto">
          {grid.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-0.5">
              {week.map((day, dayIndex) => (
                <motion.div
                  key={`${weekIndex}-${dayIndex}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: (weekIndex * 7 + dayIndex) * 0.002 }}
                  className="w-3 h-3 rounded-sm"
                  style={{
                    backgroundColor: getIntensityColor(day.value, maxValue),
                  }}
                  title={`${day.date.toLocaleDateString("pt-BR")}: ${day.value}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-3">
        <span className="text-[10px] text-muted-foreground mr-1">Menos</span>
        {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-sm"
            style={{
              backgroundColor: getIntensityColor(intensity * maxValue, maxValue),
            }}
          />
        ))}
        <span className="text-[10px] text-muted-foreground ml-1">Mais</span>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-3 text-xs text-muted-foreground/60 text-center"
      >
        Clique para fechar
      </motion.p>
    </motion.div>
  );
}
