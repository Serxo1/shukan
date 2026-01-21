import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { AchievementWidgetPayload } from "@/types";
import { Confetti } from "./Confetti";

interface AchievementWidgetProps {
  data: AchievementWidgetPayload;
  onDismiss?: () => void;
}

export function AchievementWidget({ data, onDismiss }: AchievementWidgetProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowConfetti(false);
    }, 2000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <>
      <Confetti active={showConfetti} duration={2000} />
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.5, y: -30 }}
        transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
        className="w-full p-6 rounded-xl glass text-center cursor-pointer overflow-hidden relative"
        onClick={onDismiss}
      >
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 1, repeat: 2 }}
          style={{
            background: "radial-gradient(circle, var(--color-primary) 0%, transparent 70%)",
          }}
        />

        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-5xl mb-3 relative z-10"
        >
          {data.achievement.icon || "🏆"}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs font-medium text-primary uppercase tracking-wider mb-1"
        >
          Conquista Desbloqueada!
        </motion.p>

        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-lg font-bold text-foreground mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {data.achievement.name}
        </motion.h3>

        {data.achievement.description && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-muted-foreground"
          >
            {data.achievement.description}
          </motion.p>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-4 text-xs text-muted-foreground/60"
        >
          Clique para fechar
        </motion.p>
      </motion.div>
    </>
  );
}
