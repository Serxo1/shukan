import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useSettingsStore, ELEVENLABS_VOICES, type VoiceId } from "@/store/useSettingsStore";
import { Settings, Key, Check, FileCode, Volume2, VolumeX, Mic, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const envOpenAIKey = import.meta.env.VITE_OPENAI_API_KEY || null;
const envElevenLabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY || null;

export function SettingsDialog() {
  const {
    openaiApiKey,
    elevenLabsApiKey,
    getEffectiveApiKey,
    getElevenLabsApiKey,
    useOpenAIRealtime,
    useElevenLabs,
    ttsEnabled,
    ttsVolume,
    ttsVoiceId,
    setOpenAIApiKey,
    setElevenLabsApiKey,
    setUseOpenAIRealtime,
    setUseElevenLabs,
    setTtsEnabled,
    setTtsVolume,
    setTtsVoiceId,
  } = useSettingsStore();

  const [open, setOpen] = useState(false);
  const [localOpenAIKey, setLocalOpenAIKey] = useState(openaiApiKey || "");
  const [localElevenLabsKey, setLocalElevenLabsKey] = useState(elevenLabsApiKey || "");
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showElevenLabsKey, setShowElevenLabsKey] = useState(false);
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);

  const selectedVoice = ELEVENLABS_VOICES.find(v => v.id === ttsVoiceId) || ELEVENLABS_VOICES[0];

  const effectiveOpenAIKey = getEffectiveApiKey();
  const effectiveElevenLabsKey = getElevenLabsApiKey();
  const isOpenAIFromEnv = !openaiApiKey && !!envOpenAIKey;
  const isElevenLabsFromEnv = !elevenLabsApiKey && !!envElevenLabsKey;
  const isOpenAIConfigured = !!effectiveOpenAIKey;
  const isElevenLabsConfigured = !!effectiveElevenLabsKey;

  const handleSave = () => {
    setOpenAIApiKey(localOpenAIKey.trim() || null);
    setElevenLabsApiKey(localElevenLabsKey.trim() || null);
    setOpen(false);
  };

  const hasAnyConfig = isOpenAIConfigured || isElevenLabsConfigured;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative">
          <Settings className="w-4 h-4" />
          {hasAnyConfig && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-success" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Configurações
          </DialogTitle>
          <DialogDescription>
            Configure as APIs de voz para uma experiência melhor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Env status */}
          {(isOpenAIFromEnv || isElevenLabsFromEnv) && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
              <FileCode className="w-4 h-4 text-success" />
              <p className="text-sm text-success">
                API keys carregadas do <code className="font-mono">.env</code>
              </p>
            </div>
          )}

          {/* OpenAI Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                OpenAI API Key
              </label>
              {isOpenAIConfigured && (
                <span className="text-xs text-success flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {isOpenAIFromEnv ? ".env" : "Configurada"}
                </span>
              )}
            </div>

            <div className="relative">
              <Input
                type={showOpenAIKey ? "text" : "password"}
                placeholder={isOpenAIFromEnv ? "Usando chave do .env" : "sk-..."}
                value={localOpenAIKey}
                onChange={(e) => setLocalOpenAIKey(e.target.value)}
                disabled={isOpenAIFromEnv}
              />
              {!isOpenAIFromEnv && localOpenAIKey && (
                <button
                  type="button"
                  onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {showOpenAIKey ? "Ocultar" : "Mostrar"}
                </button>
              )}
            </div>
          </div>

          {/* OpenAI Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
            <div>
              <p className="text-sm font-medium">OpenAI Realtime (STT)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Transcrição de voz avançada
              </p>
            </div>
            <button
              onClick={() => setUseOpenAIRealtime(!useOpenAIRealtime)}
              disabled={!isOpenAIConfigured}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors",
                useOpenAIRealtime && isOpenAIConfigured ? "bg-primary" : "bg-muted",
                !isOpenAIConfigured && "opacity-50 cursor-not-allowed"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform",
                  useOpenAIRealtime && isOpenAIConfigured ? "translate-x-7" : "translate-x-1"
                )}
              />
            </button>
          </div>

          <div className="h-px bg-border" />

          {/* TTS Master Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border-2 border-primary/20">
            <div className="flex items-center gap-3">
              {ttsEnabled ? (
                <Volume2 className="w-5 h-5 text-primary" />
              ) : (
                <VolumeX className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">Leitura de Mensagens</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ttsEnabled ? "Ativado - consome créditos" : "Desativado - economia de créditos"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors",
                ttsEnabled ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform",
                  ttsEnabled ? "translate-x-7" : "translate-x-1"
                )}
              />
            </button>
          </div>

          {/* ElevenLabs Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                ElevenLabs API Key
              </label>
              {isElevenLabsConfigured && (
                <span className="text-xs text-success flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {isElevenLabsFromEnv ? ".env" : "Configurada"}
                </span>
              )}
            </div>

            <div className="relative">
              <Input
                type={showElevenLabsKey ? "text" : "password"}
                placeholder={isElevenLabsFromEnv ? "Usando chave do .env" : "xi-..."}
                value={localElevenLabsKey}
                onChange={(e) => setLocalElevenLabsKey(e.target.value)}
                disabled={isElevenLabsFromEnv}
              />
              {!isElevenLabsFromEnv && localElevenLabsKey && (
                <button
                  type="button"
                  onClick={() => setShowElevenLabsKey(!showElevenLabsKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {showElevenLabsKey ? "Ocultar" : "Mostrar"}
                </button>
              )}
            </div>
          </div>

          {/* ElevenLabs Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
            <div>
              <p className="text-sm font-medium">ElevenLabs (TTS)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Voz natural e expressiva
              </p>
            </div>
            <button
              onClick={() => setUseElevenLabs(!useElevenLabs)}
              disabled={!isElevenLabsConfigured}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors",
                useElevenLabs && isElevenLabsConfigured ? "bg-primary" : "bg-muted",
                !isElevenLabsConfigured && "opacity-50 cursor-not-allowed"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform",
                  useElevenLabs && isElevenLabsConfigured ? "translate-x-7" : "translate-x-1"
                )}
              />
            </button>
          </div>

          {/* Voice and Volume Settings - only show when ElevenLabs is enabled */}
          {isElevenLabsConfigured && useElevenLabs && ttsEnabled && (
            <>
              {/* Voice Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mic className="w-4 h-4 text-muted-foreground" />
                  Voz
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm">
                        {selectedVoice.gender === "Feminina" ? "👩" : "👨"}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">{selectedVoice.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedVoice.description}</p>
                      </div>
                    </div>
                    <ChevronDown className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      showVoiceDropdown && "rotate-180"
                    )} />
                  </button>

                  {showVoiceDropdown && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 p-1 rounded-lg bg-popover border border-border shadow-lg max-h-64 overflow-y-auto">
                      {ELEVENLABS_VOICES.map((voice) => (
                        <button
                          key={voice.id}
                          onClick={() => {
                            setTtsVoiceId(voice.id as VoiceId);
                            setShowVoiceDropdown(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 p-2 rounded-md hover:bg-secondary/50 transition-colors",
                            voice.id === ttsVoiceId && "bg-primary/10"
                          )}
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm">
                            {voice.gender === "Feminina" ? "👩" : "👨"}
                          </div>
                          <div className="text-left flex-1">
                            <p className="text-sm font-medium">{voice.name}</p>
                            <p className="text-xs text-muted-foreground">{voice.description}</p>
                          </div>
                          {voice.id === ttsVoiceId && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Volume Control */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                    Volume
                  </label>
                  <span className="text-sm text-muted-foreground font-mono">
                    {Math.round(ttsVolume * 100)}%
                  </span>
                </div>
                <Slider
                  value={ttsVolume}
                  onChange={setTtsVolume}
                  min={0}
                  max={1}
                  step={0.05}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>🔈 Baixo</span>
                  <span>Alto 🔊</span>
                </div>
              </div>
            </>
          )}

          {!hasAnyConfig && (
            <p className="text-xs text-muted-foreground text-center">
              Configure as API keys para usar transcrição e síntese de voz avançadas.
            </p>
          )}
        </div>

        <DialogFooter className="mt-8 flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} variant="glow">
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
