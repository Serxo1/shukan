import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { StatsWidgetPayload } from "@/types";

interface StatsWidgetProps {
  data: StatsWidgetPayload;
  onDismiss?: () => void;
}

export function StatsWidget({ data, onDismiss }: StatsWidgetProps) {
  const { t } = useTranslation();

  const stats = [
    {
      label: t("widgets.stats.currentStreak"),
      value: data.currentStreak,
      suffix: t("habits.days"),
      icon: "🔥",
    },
    {
      label: t("widgets.stats.bestStreak"),
      value: data.bestStreak,
      suffix: t("habits.days"),
      icon: "⭐",
    },
    {
      label: t("widgets.stats.totalCompletions"),
      value: data.totalCompletions,
      suffix: "",
      icon: "✓",
    },
    {
      label: t("widgets.stats.completionRate"),
      value: Math.round(data.completionRate),
      suffix: "%",
      icon: "📊",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="w-full p-4 rounded-xl glass cursor-pointer"
      onClick={onDismiss}
    >
      <h4 className="font-semibold text-sm text-foreground mb-3 text-center">
        {data.habitName}
      </h4>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-3 rounded-lg bg-secondary/50 text-center"
          >
            <span className="text-lg mb-1 block">{stat.icon}</span>
            <div className="font-bold text-lg text-foreground">
              {stat.value}
              {stat.suffix && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  {stat.suffix}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-3 text-xs text-muted-foreground/60 text-center"
      >
        {t("widgets.clickToClose")}
      </motion.p>
    </motion.div>
  );
}
