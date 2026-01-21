import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { FrequencyWidgetPayload } from "@/types";

interface FrequencyWidgetProps {
  data: FrequencyWidgetPayload;
  onDismiss?: () => void;
}

export function FrequencyWidget({ data, onDismiss }: FrequencyWidgetProps) {
  const { t } = useTranslation();
  const percentage = Math.min((data.current / data.target) * 100, 100);
  const periodLabel = data.period === "week" ? t("widgets.frequency.thisWeek") : t("widgets.frequency.thisMonth");
  const remainingLabel = data.daysRemaining === 1 ? t("widgets.frequency.dayRemaining") : t("widgets.frequency.daysRemaining");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="w-full p-4 rounded-xl glass cursor-pointer"
      onClick={onDismiss}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
          style={{ backgroundColor: `${data.habitColor}20`, color: data.habitColor }}
        >
          {data.habitIcon}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-foreground">
            {data.habitName}
          </h4>
          <p className="text-xs text-muted-foreground">
            {t("widgets.frequency.goal")}: {data.target}x {periodLabel}
          </p>
        </div>
      </div>

      {/* Progress circles */}
      <div className="flex items-center justify-center gap-2 my-4">
        {Array.from({ length: data.target }, (_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
            style={{
              backgroundColor: i < data.current
                ? data.habitColor
                : "rgba(255,255,255,0.1)",
              color: i < data.current ? "white" : "rgba(255,255,255,0.3)",
              boxShadow: i < data.current
                ? `0 0 12px -2px ${data.habitColor}`
                : "none",
            }}
          >
            {i < data.current ? "✓" : i + 1}
          </motion.div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-secondary rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{
            background: data.isComplete
              ? "linear-gradient(90deg, var(--color-success), oklch(70% 0.2 150))"
              : `linear-gradient(90deg, ${data.habitColor}, ${data.habitColor}dd)`,
            boxShadow: `0 0 8px -2px ${data.isComplete ? "var(--color-success)" : data.habitColor}`,
          }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {data.current}/{data.target} {t("widgets.frequency.completed")}
        </span>
        <span className="text-muted-foreground">
          {data.daysRemaining} {remainingLabel}
        </span>
      </div>

      {data.isComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-3 text-center"
        >
          <span className="text-xs font-medium text-success">
            {t("widgets.frequency.goalReached")} 🎉
          </span>
        </motion.div>
      )}

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-3 text-xs text-muted-foreground/60 text-center"
      >
        {t("widgets.clickToClose")}
      </motion.p>
    </motion.div>
  );
}
