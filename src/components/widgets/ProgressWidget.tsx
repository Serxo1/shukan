import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { ProgressWidgetPayload } from "@/types";

interface ProgressWidgetProps {
  data: ProgressWidgetPayload;
  onDismiss?: () => void;
}

export function ProgressWidget({ data, onDismiss }: ProgressWidgetProps) {
  const { t } = useTranslation();
  const percentage = Math.min((data.current / data.target) * 100, 100);
  const isComplete = data.current >= data.target;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="w-full p-4 rounded-xl glass"
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
            {data.current} / {data.target} {data.unit || ""}
          </p>
        </div>
        <div className="text-right">
          <span
            className="text-xl font-bold"
            style={{ color: isComplete ? "var(--color-success)" : data.habitColor }}
          >
            {Math.round(percentage)}%
          </span>
        </div>
      </div>

      <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{
            background: isComplete
              ? "linear-gradient(90deg, var(--color-success), oklch(70% 0.2 150))"
              : `linear-gradient(90deg, ${data.habitColor}, ${data.habitColor}dd)`,
            boxShadow: `0 0 12px -2px ${isComplete ? "var(--color-success)" : data.habitColor}`,
          }}
        />
      </div>

      {isComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-2 text-center"
        >
          <span className="text-xs font-medium text-success">
            {t("widgets.frequency.goalReached")}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
