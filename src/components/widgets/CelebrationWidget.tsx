import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { CelebrationWidgetPayload } from "@/types";
import { Confetti } from "./Confetti";

interface CelebrationWidgetProps {
  data: CelebrationWidgetPayload;
  onDismiss?: () => void;
}

export function CelebrationWidget({ data, onDismiss }: CelebrationWidgetProps) {
  const { t } = useTranslation();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowConfetti(false);
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <>
      <Confetti active={showConfetti} />
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -20 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
        className="w-full p-6 rounded-xl glass text-center cursor-pointer"
        onClick={onDismiss}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          className="text-5xl mb-3"
        >
          {data.streakCount && data.streakCount >= 7 ? "🎉" : "✨"}
        </motion.div>

        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-lg font-bold text-foreground mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {data.title}
        </motion.h3>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-sm text-muted-foreground"
        >
          {data.message}
        </motion.p>

        {data.streakCount && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10"
          >
            <span className="text-xl animate-flicker">🔥</span>
            <span className="font-bold text-primary">
              {data.streakCount} {t("habits.days")}
            </span>
          </motion.div>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-3 text-xs text-muted-foreground/60"
        >
          {t("widgets.clickToClose")}
        </motion.p>
      </motion.div>
    </>
  );
}
