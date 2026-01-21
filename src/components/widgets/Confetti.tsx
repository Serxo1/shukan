import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  rotation: number;
  scale: number;
  delay: number;
}

const COLORS = [
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#F59E0B", // amber
  "#10B981", // emerald
  "#3B82F6", // blue
  "#EF4444", // red
];

interface ConfettiProps {
  active: boolean;
  duration?: number;
}

export function Confetti({ active, duration = 3000 }: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (active) {
      const newPieces: ConfettiPiece[] = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        delay: Math.random() * 0.5,
      }));
      setPieces(newPieces);

      const timeout = setTimeout(() => {
        setPieces([]);
      }, duration);

      return () => clearTimeout(timeout);
    } else {
      setPieces([]);
    }
  }, [active, duration]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      <AnimatePresence>
        {pieces.map((piece) => (
          <motion.div
            key={piece.id}
            initial={{
              opacity: 1,
              x: `${piece.x}vw`,
              y: -20,
              rotate: 0,
              scale: piece.scale,
            }}
            animate={{
              opacity: [1, 1, 0],
              y: "110vh",
              rotate: piece.rotation + 720,
              x: `${piece.x + (Math.random() - 0.5) * 20}vw`,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2.5 + Math.random(),
              delay: piece.delay,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="absolute w-3 h-3"
            style={{ backgroundColor: piece.color }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
