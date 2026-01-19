import { cn } from "@/lib/utils";
import { Mic, MicOff } from "lucide-react";

interface VoiceButtonProps {
  isListening: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  transcript?: string;
  onClick: () => void;
}

export function VoiceButton({
  isListening,
  isProcessing,
  isSupported,
  transcript,
  onClick,
}: VoiceButtonProps) {
  if (!isSupported) {
    return null;
  }

  return (
    <div className="fixed bottom-8 right-8 z-50">
      {/* Transcript bubble */}
      {(isListening || isProcessing) && transcript && (
        <div className="absolute bottom-full right-0 mb-4 w-64 max-w-[calc(100vw-4rem)]">
          <div className="glass rounded-2xl p-4 shadow-xl">
            <p className="text-sm text-muted-foreground mb-1">Ouvindo...</p>
            <p className="text-foreground font-medium">{transcript}</p>
          </div>
          {/* Arrow */}
          <div className="absolute -bottom-2 right-8 w-4 h-4 rotate-45 glass" />
        </div>
      )}

      {/* Button container with pulse rings */}
      <div className="relative">
        {/* Pulse rings when listening */}
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full bg-primary/40 animate-pulse-ring" />
            <span
              className="absolute inset-0 rounded-full bg-primary/30 animate-pulse-ring"
              style={{ animationDelay: "0.5s" }}
            />
          </>
        )}

        {/* Main button */}
        <button
          onClick={onClick}
          disabled={isProcessing}
          className={cn(
            "relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300",
            "focus:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background",
            isListening
              ? "bg-primary text-primary-foreground shadow-[0_0_40px_-5px_var(--color-glow)] scale-110"
              : "bg-card text-foreground shadow-xl hover:shadow-2xl hover:scale-105",
            isProcessing && "opacity-70 cursor-wait"
          )}
        >
          {isListening ? (
            <Mic className={cn("w-7 h-7", isListening && "animate-pulse-dot")} />
          ) : (
            <MicOff className="w-6 h-6 text-muted-foreground" />
          )}

          {/* Inner glow when listening */}
          {isListening && (
            <span className="absolute inset-2 rounded-full bg-white/20 blur-sm" />
          )}
        </button>
      </div>

      {/* Helper text */}
      <p
        className={cn(
          "absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground transition-opacity",
          isListening ? "opacity-0" : "opacity-100"
        )}
      >
        Clique para falar
      </p>
    </div>
  );
}
