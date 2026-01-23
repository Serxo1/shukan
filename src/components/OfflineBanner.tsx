import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface OfflineBannerProps {
  onDismiss: () => void;
}

export function OfflineBanner({ onDismiss }: OfflineBannerProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5 }}
      className="mx-3 mb-2 px-4 py-3 rounded-sm bg-[#0a0a0a] border border-[rgba(181,162,125,0.2)]"
    >
      <div className="flex items-start gap-3">
        <svg
          className="w-4 h-4 text-[#b5a27d]/80 mt-0.5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-[#b5a27d] text-xs tracking-wide">
            {t("connectivity.offline", "You're offline")}
          </p>
          <p className="text-[#b5a27d]/50 text-[10px] mt-1 tracking-wide">
            {t("connectivity.limitedFeatures", "Voice control and sync unavailable")}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-[#b5a27d]/40 hover:text-[#b5a27d] transition-all duration-500"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}
