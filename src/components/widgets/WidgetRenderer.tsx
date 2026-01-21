import { AnimatePresence } from "framer-motion";
import type { WidgetPayload } from "@/types";
import { ProgressWidget } from "./ProgressWidget";
import { CelebrationWidget } from "./CelebrationWidget";
import { StatsWidget } from "./StatsWidget";
import { AchievementWidget } from "./AchievementWidget";
import { HeatmapWidget } from "./HeatmapWidget";
import { BarChartWidget } from "./BarChartWidget";
import { FrequencyWidget } from "./FrequencyWidget";

interface WidgetRendererProps {
  widget: WidgetPayload | null;
  onDismiss: () => void;
}

export function WidgetRenderer({ widget, onDismiss }: WidgetRendererProps) {
  const renderWidget = () => {
    if (!widget) return null;

    switch (widget.type) {
      case "progress":
        return <ProgressWidget data={widget} onDismiss={onDismiss} />;
      case "celebration":
        return <CelebrationWidget data={widget} onDismiss={onDismiss} />;
      case "stats":
        return <StatsWidget data={widget} onDismiss={onDismiss} />;
      case "achievement":
        return <AchievementWidget data={widget} onDismiss={onDismiss} />;
      case "heatmap":
        return <HeatmapWidget data={widget} onDismiss={onDismiss} />;
      case "barchart":
        return <BarChartWidget data={widget} onDismiss={onDismiss} />;
      case "frequency":
        return <FrequencyWidget data={widget} onDismiss={onDismiss} />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence mode="wait">
      {widget && (
        <div className="mt-4 w-full" key={widget.type}>
          {renderWidget()}
        </div>
      )}
    </AnimatePresence>
  );
}
