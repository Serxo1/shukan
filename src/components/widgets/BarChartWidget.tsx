import { useMemo } from "react";
import { motion } from "framer-motion";
import type { BarChartWidgetPayload } from "@/types";

interface BarChartWidgetProps {
  data: BarChartWidgetPayload;
  onDismiss?: () => void;
}

export function BarChartWidget({ data, onDismiss }: BarChartWidgetProps) {
  const { bars, maxValue, total } = useMemo(() => {
    const max = Math.max(...data.data.map((d) => d.value), 1);
    const sum = data.data.reduce((acc, d) => acc + d.value, 0);
    return { bars: data.data, maxValue: max, total: sum };
  }, [data.data]);

  const periodLabel = data.period === "week" ? "esta semana" : "este mês";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="w-full p-4 rounded-xl glass cursor-pointer"
      onClick={onDismiss}
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-sm text-foreground">
          {data.habitName}
        </h4>
        <span className="text-xs text-muted-foreground">
          {total}x {periodLabel}
        </span>
      </div>

      {/* Bar chart */}
      <div className="flex items-end justify-between gap-2 h-24">
        {bars.map((bar, index) => {
          const height = maxValue > 0 ? (bar.value / maxValue) * 100 : 0;
          const isToday = index === bars.length - 1 && data.period === "week";

          return (
            <div
              key={bar.label}
              className="flex-1 flex flex-col items-center gap-1"
            >
              {/* Value label */}
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 + 0.2 }}
                className="text-[10px] text-muted-foreground"
              >
                {bar.value > 0 ? bar.value : ""}
              </motion.span>

              {/* Bar */}
              <div className="w-full h-16 flex items-end justify-center">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(height, 4)}%` }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.05,
                    ease: "easeOut",
                  }}
                  className="w-full max-w-6 rounded-t-md"
                  style={{
                    backgroundColor: isToday
                      ? "var(--color-primary)"
                      : bar.value > 0
                      ? "rgba(139, 92, 246, 0.6)"
                      : "rgba(255,255,255,0.1)",
                    boxShadow:
                      bar.value > 0
                        ? "0 0 8px -2px rgba(139, 92, 246, 0.5)"
                        : "none",
                  }}
                />
              </div>

              {/* Day label */}
              <span
                className={`text-[10px] ${
                  isToday ? "text-primary font-medium" : "text-muted-foreground"
                }`}
              >
                {bar.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-white/[0.06]">
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">{total}</div>
          <div className="text-[10px] text-muted-foreground">completions</div>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {bars.filter((b) => b.value > 0).length}/{bars.length}
          </div>
          <div className="text-[10px] text-muted-foreground">dias ativos</div>
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-3 text-xs text-muted-foreground/60 text-center"
      >
        Clique para fechar
      </motion.p>
    </motion.div>
  );
}
