import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Orb } from "@/components/ui/orb";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { WidgetRenderer } from "@/components/widgets";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useVoiceStore, useHabitStore } from "@/store/useHabitStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useWidgetStore } from "@/store/useWidgetStore";
import { useOpenAIRealtime } from "@/hooks/useOpenAIRealtime";
import { useHabitAgent } from "@/hooks/useHabitAgent";
import { useDatabase } from "@/hooks/useDatabase";
import { useConnectivity } from "@/hooks/useConnectivity";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";

const hideWindow = async () => {
  try {
    await getCurrentWindow().hide();
  } catch (e) {
    console.error("[SpotlightInterface] Failed to hide window:", e);
  }
};

export function SpotlightInterface() {
  const { t } = useTranslation();
  const { voice } = useVoiceStore();
  const { habits } = useHabitStore();
  const { getEffectiveApiKey, useOpenAIRealtime: useOpenAI, language } = useSettingsStore();
  const { activeWidget, dismissWidget } = useWidgetStore();
  const { connect: connectOpenAI, disconnect: disconnectOpenAI, isConnected } = useOpenAIRealtime();
  const { processUserInput } = useHabitAgent();
  const { getTodayCompletions } = useDatabase();
  const { isOnline, dismissOfflineWarning } = useConnectivity();
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);

  const [response, setResponse] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [isProcessingAgent, setIsProcessingAgent] = useState(false);
  const [isTextMode, setIsTextMode] = useState(false);
  const [textInput, setTextInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const apiKey = getEffectiveApiKey();
  const isActive = voice.isListening || isConnected;
  const isProcessing = isProcessingAgent;

  // Load completions
  useEffect(() => {
    getTodayCompletions().then((c) => setCompletedIds(new Set(c.map((x) => x.habitId))));
  }, [getTodayCompletions, habits]);

  // Clear session when window is shown (focus event)
  useEffect(() => {
    const clearSession = () => {
      setResponse(null);
      setLastTranscript(null);
      setIsTextMode(false);
      setTextInput("");
      dismissWidget();
      // Reload completions
      getTodayCompletions().then((c) => setCompletedIds(new Set(c.map((x) => x.habitId))));
    };

    const setupListener = async () => {
      const window = getCurrentWindow();
      const unlisten = await window.onFocusChanged(({ payload: focused }) => {
        if (focused) {
          clearSession();
        }
      });
      return unlisten;
    };

    const unlistenPromise = setupListener();
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [dismissWidget, getTodayCompletions]);

  // Show offline banner when going offline
  useEffect(() => {
    if (!isOnline) {
      setShowOfflineBanner(true);
    }
  }, [isOnline]);

  const handleDismissOffline = () => {
    setShowOfflineBanner(false);
    dismissOfflineWarning();
  };

  const handleTranscription = useCallback(
    async (result: { text: string; isFinal: boolean }) => {
      console.log("[SpotlightInterface] handleTranscription:", result);
      if (result.isFinal && result.text) {
        console.log("[SpotlightInterface] Final transcript, starting processing...");
        setLastTranscript(result.text);
        disconnectOpenAI();
        setIsProcessingAgent(true);

        try {
          const res = await processUserInput(result.text);
          console.log("[SpotlightInterface] Agent response:", res.message);
          setResponse(res.message);
          const c = await getTodayCompletions();
          setCompletedIds(new Set(c.map((x) => x.habitId)));
        } finally {
          console.log("[SpotlightInterface] Processing complete, setting isProcessingAgent to false");
          setIsProcessingAgent(false);
        }
      }
    },
    [processUserInput, getTodayCompletions, disconnectOpenAI]
  );

  const handleOrbClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTextMode) {
      setIsTextMode(false);
      setTextInput("");
    }
    if (isConnected) {
      disconnectOpenAI();
    } else if (apiKey && useOpenAI) {
      setResponse(null);
      setLastTranscript(null);
      connectOpenAI({ apiKey, language }, handleTranscription);
    }
  }, [isConnected, apiKey, useOpenAI, language, connectOpenAI, disconnectOpenAI, handleTranscription, isTextMode]);

  const handleTextAreaClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isActive && !isProcessing) {
      setIsTextMode(true);
      setResponse(null);
      setLastTranscript(null);
      // Focus input on next tick
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isActive, isProcessing]);

  const handleTextSubmit = useCallback(async () => {
    const text = textInput.trim();
    if (!text) return;

    setLastTranscript(text);
    setIsTextMode(false);
    setTextInput("");
    setIsProcessingAgent(true);

    try {
      const res = await processUserInput(text);
      setResponse(res.message);
      const c = await getTodayCompletions();
      setCompletedIds(new Set(c.map((x) => x.habitId)));
    } finally {
      setIsProcessingAgent(false);
    }
  }, [textInput, processUserInput, getTodayCompletions]);

  const handleTextKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setIsTextMode(false);
      setTextInput("");
    }
  }, [handleTextSubmit]);

  const showResponse = response && !isActive && !isProcessing;
  const completedCount = habits.filter((h) => completedIds.has(h.id)).length;

  // Debug logging
  useEffect(() => {
    console.log("[SpotlightInterface] State:", {
      response: response ? response.substring(0, 50) + "..." : null,
      isActive,
      isProcessing,
      showResponse,
      lastTranscript,
    });
  }, [response, isActive, isProcessing, showResponse, lastTranscript]);

  // Resize window based on content
  useEffect(() => {
    const resizeWindow = async () => {
      console.log("[SpotlightInterface] Resize check - showResponse:", showResponse, "widget:", !!activeWidget);
      try {
        const window = getCurrentWindow();
        const baseHeight = 64;

        if ((showResponse || activeWidget) && containerRef.current) {
          // Wait for the animation to complete and measure
          await new Promise(resolve => setTimeout(resolve, 250));
          const contentHeight = containerRef.current.scrollHeight;
          const newHeight = Math.min(contentHeight + 32, 600);
          console.log("[SpotlightInterface] Resizing to:", newHeight, "content:", contentHeight);
          await window.setSize(new LogicalSize(500, newHeight));
        } else {
          await window.setSize(new LogicalSize(500, baseHeight));
        }
      } catch (e) {
        console.error("[SpotlightInterface] Resize error:", e);
      }
    };

    resizeWindow();
  }, [showResponse, activeWidget]);

  // Determine Orb agent state
  const getAgentState = () => {
    if (isActive) return "listening";
    if (isProcessing) return "thinking";
    if (response) return "talking";
    return null;
  };

  return (
    <div ref={containerRef} className="w-full flex flex-col overflow-hidden">
      {/* Main bar */}
      <div
        className="group flex items-center gap-3 px-3 py-2 mx-2 rounded-xl bg-neutral-900 border border-white/[0.08] relative"
      >
        {/* Close button - appears on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            hideWindow();
          }}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-neutral-700"
          title="ESC"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/50">
            <path d="M1 1l6 6M7 1l-6 6" />
          </svg>
        </button>

        {/* Orb - click for voice */}
        <div
          className="w-10 h-10 flex-shrink-0 cursor-pointer"
          onClick={handleOrbClick}
          title={t("spotlight.clickToSpeak")}
        >
          <Orb
            agentState={getAgentState()}
            colors={["#ffffff", "#a0a0a0"]}
            className="w-full h-full"
          />
        </div>

        {/* Content area - click for text input */}
        <div
          className="flex-1 min-w-0 h-8 flex items-center cursor-text"
          onClick={handleTextAreaClick}
        >
          <AnimatePresence mode="wait">
            {isTextMode ? (
              /* Text input mode */
              <motion.div
                key="textinput"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={handleTextKeyDown}
                  placeholder={t("spotlight.typeMessage", "Digite sua mensagem...")}
                  className="w-full bg-transparent text-white/90 text-[14px] placeholder:text-white/30 outline-none"
                  autoFocus
                />
              </motion.div>
            ) : isActive ? (
              /* Waveform while listening */
              <motion.div
                key="waveform"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full"
              >
                <LiveWaveform
                  active={isActive}
                  mode="static"
                  barColor="rgba(255,255,255,0.6)"
                  barWidth={2}
                  barGap={2}
                  barRadius={1}
                  height={32}
                  fadeEdges={true}
                  fadeWidth={16}
                />
              </motion.div>
            ) : isProcessing && lastTranscript ? (
              /* Show transcript with processing indicator */
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 w-full"
              >
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-white/50 text-[14px]"
                >
                  •
                </motion.span>
                <span className="text-white/70 text-[14px] truncate">
                  {lastTranscript}
                </span>
              </motion.div>
            ) : lastTranscript ? (
              /* Show transcription text */
              <motion.p
                key="transcript"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-white/90 text-[14px] truncate"
              >
                {lastTranscript}
              </motion.p>
            ) : (
              /* Idle state */
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between w-full"
              >
                <span className="text-white/30 text-[14px]">
                  {t("spotlight.typeOrSpeak")}
                </span>
                {habits.length > 0 && (
                  <span className="text-white/20 text-xs">
                    {completedCount}/{habits.length}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Offline banner */}
      <AnimatePresence>
        {showOfflineBanner && !isOnline && (
          <OfflineBanner onDismiss={handleDismissOffline} />
        )}
      </AnimatePresence>

      {/* Response area - expands below */}
      <AnimatePresence>
        {showResponse && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden mx-2 mt-2"
          >
            <div className="px-4 py-3 rounded-xl bg-neutral-900 border border-white/[0.08]">
              <p className="text-white/80 text-[13px] leading-relaxed">
                {response}
              </p>

              {/* Habit pills */}
              {habits.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/[0.06]">
                  {habits.map((h) => (
                    <span
                      key={h.id}
                      className={`px-2 py-0.5 rounded-md text-xs ${
                        completedIds.has(h.id)
                          ? "bg-white/10 text-white/60"
                          : "bg-white/[0.04] text-white/30"
                      }`}
                    >
                      {completedIds.has(h.id) && "✓ "}
                      {h.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widget area */}
      <div className="mx-2">
        <WidgetRenderer widget={activeWidget} onDismiss={dismissWidget} />
      </div>

      {/* Error */}
      <AnimatePresence>
        {voice.error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-2 mt-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20"
          >
            <p className="text-red-400/80 text-xs">{voice.error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
