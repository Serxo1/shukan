import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SpotlightInterface } from "@/components/SpotlightInterface";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useDatabase } from "@/hooks/useDatabase";
import { useSettingsSync } from "@/hooks/useSettingsSync";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import "./index.css";

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();

  // Initialize database and settings sync
  useDatabase();
  useSettingsSync();

  // Handle keyboard shortcuts - using capture phase to ensure we catch ESC
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // ESC to hide window - use Rust command for reliability
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        try {
          await invoke("hide_orb");
        } catch (err) {
          console.error("[App] Failed to hide:", err);
        }
      }
      // Ctrl/Cmd + , to open settings
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }
    };

    // Use capture phase to ensure we get the event first
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  // Show and focus the window on mount (window starts hidden to prevent title flicker)
  useEffect(() => {
    const showAndFocusWindow = async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        await win.show();
        await win.setFocus();
      } catch (err) {
        // Ignore errors in non-Tauri environment
      }
    };
    showAndFocusWindow();
  }, []);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="w-full h-full bg-transparent flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  // Show compact login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="w-full h-full bg-[#0a0a0a]/95 backdrop-blur-xl rounded-2xl flex items-center justify-center p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/40">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/60 text-sm truncate">Faça login para continuar</p>
          </div>
          <button
            onClick={async () => {
              try {
                await invoke("open_dashboard");
              } catch (err) {
                console.error("Failed to open dashboard:", err);
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs hover:bg-white/15 transition-colors flex-shrink-0"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-transparent">
      {/* Main content - fills window exactly */}
      <div className="w-full h-full">
        <SpotlightInterface />
      </div>

      {/* Settings Dialog - rendered as overlay */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="relative"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <SettingsDialogContent onClose={() => setSettingsOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

// Inline settings dialog for the spotlight UI
function SettingsDialogContent({ onClose }: { onClose: () => void }) {
  const [localOpenAIKey, setLocalOpenAIKey] = useState("");
  const [localElevenLabsKey, setLocalElevenLabsKey] = useState("");
  const { saveSetting } = useSettingsSync();

  const {
    openaiApiKey,
    elevenLabsApiKey,
    getEffectiveApiKey,
    getElevenLabsApiKey,
    useOpenAIRealtime,
    useElevenLabs,
    ttsEnabled,
    setOpenAIApiKey,
    setElevenLabsApiKey,
    setUseOpenAIRealtime,
    setUseElevenLabs,
    setTtsEnabled,
  } = useSettingsStore();

  useEffect(() => {
    setLocalOpenAIKey(openaiApiKey || "");
    setLocalElevenLabsKey(elevenLabsApiKey || "");
  }, [openaiApiKey, elevenLabsApiKey]);

  const envOpenAIKey = import.meta.env.VITE_OPENAI_API_KEY || null;
  const envElevenLabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY || null;

  const isOpenAIFromEnv = !openaiApiKey && !!envOpenAIKey;
  const isElevenLabsFromEnv = !elevenLabsApiKey && !!envElevenLabsKey;
  const isOpenAIConfigured = !!getEffectiveApiKey();
  const isElevenLabsConfigured = !!getElevenLabsApiKey();

  const handleSave = async () => {
    const openaiKey = localOpenAIKey.trim() || null;
    const elevenLabsKey = localElevenLabsKey.trim() || null;

    setOpenAIApiKey(openaiKey);
    setElevenLabsApiKey(elevenLabsKey);

    // Save to SQLite and sync across windows
    await saveSetting("openaiApiKey", openaiKey);
    await saveSetting("elevenLabsApiKey", elevenLabsKey);

    onClose();
  };

  const handleToggle = async (key: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value);
    await saveSetting(key, value);
  };

  return (
    <div className="w-[400px] p-6 rounded-2xl bg-neutral-900/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-white/90">Configurações</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="space-y-5">
        {/* TTS Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
          <div>
            <p className="text-sm text-white/80">Leitura de Mensagens</p>
            <p className="text-xs text-white/40">
              {ttsEnabled ? "Ativado" : "Desativado"}
            </p>
          </div>
          <Switch
            checked={ttsEnabled}
            onCheckedChange={(checked) => handleToggle("ttsEnabled", checked, setTtsEnabled)}
          />
        </div>

        {/* OpenAI */}
        <div className="space-y-2">
          <label className="text-sm text-white/50">OpenAI API Key</label>
          <input
            type="password"
            placeholder={isOpenAIFromEnv ? "Usando .env" : "sk-..."}
            value={localOpenAIKey}
            onChange={(e) => setLocalOpenAIKey(e.target.value)}
            disabled={isOpenAIFromEnv}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.06] text-white/90 placeholder:text-white/20 focus:outline-none focus:border-white/20 disabled:opacity-50 transition-colors"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">
              {isOpenAIConfigured ? "✓ Configurada" : "Não configurada"}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">STT</span>
              <Switch
                checked={useOpenAIRealtime}
                onCheckedChange={(checked) => handleToggle("useOpenAIRealtime", checked, setUseOpenAIRealtime)}
                disabled={!isOpenAIConfigured}
              />
            </div>
          </div>
        </div>

        {/* ElevenLabs */}
        <div className="space-y-2">
          <label className="text-sm text-white/50">ElevenLabs API Key</label>
          <input
            type="password"
            placeholder={isElevenLabsFromEnv ? "Usando .env" : "xi-..."}
            value={localElevenLabsKey}
            onChange={(e) => setLocalElevenLabsKey(e.target.value)}
            disabled={isElevenLabsFromEnv}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.06] text-white/90 placeholder:text-white/20 focus:outline-none focus:border-white/20 disabled:opacity-50 transition-colors"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">
              {isElevenLabsConfigured ? "✓ Configurada" : "Não configurada"}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">TTS</span>
              <Switch
                checked={useElevenLabs}
                onCheckedChange={(checked) => handleToggle("useElevenLabs", checked, setUseElevenLabs)}
                disabled={!isElevenLabsConfigured}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/15 transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
