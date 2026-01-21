import { useCallback, useRef, useState } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { callTTSEdgeFunction } from "@/lib/edge-functions";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";

// Backup voice if selected one fails
const BACKUP_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah

// Models: turbo is faster and cheaper, multilingual is higher quality
const TURBO_MODEL = "eleven_turbo_v2_5"; // Fast, cheap, good quality
const MULTILINGUAL_MODEL = "eleven_multilingual_v2"; // Best quality, slower

interface ElevenLabsConfig {
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  useTurbo?: boolean; // Use faster/cheaper model
}

export function useSpeech() {
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isSpeakingState, setIsSpeakingState] = useState(false);

  const { getElevenLabsApiKey, useElevenLabs, ttsEnabled, ttsVolume, ttsVoiceId, isUsingEdgeFunctions } = useSettingsStore();

  const getSynth = useCallback(() => {
    if (!synthRef.current && typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
    return synthRef.current;
  }, []);

  const speakWithBrowser = useCallback(
    (text: string, options?: { lang?: string; rate?: number; pitch?: number; volume?: number }) => {
      const synth = getSynth();
      if (!synth) return;

      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options?.lang ?? "pt-BR";
      utterance.rate = options?.rate ?? 1;
      utterance.pitch = options?.pitch ?? 1;
      utterance.volume = options?.volume ?? ttsVolume;

      const voices = synth.getVoices();
      const ptVoice = voices.find(
        (v) => v.lang.startsWith("pt") && v.name.toLowerCase().includes("brazil")
      );
      if (ptVoice) {
        utterance.voice = ptVoice;
      }

      utterance.onstart = () => setIsSpeakingState(true);
      utterance.onend = () => setIsSpeakingState(false);
      utterance.onerror = () => setIsSpeakingState(false);

      synth.speak(utterance);
    },
    [getSynth, ttsVolume]
  );

  const speakWithElevenLabs = useCallback(
    async (text: string, config?: ElevenLabsConfig) => {
      const useEdgeFunctions = isUsingEdgeFunctions();
      const apiKey = getElevenLabsApiKey();

      // Need either Edge Functions or direct API key
      if (!useEdgeFunctions && !apiKey) {
        console.warn("[Speech] No ElevenLabs API key and not using Edge Functions, falling back to browser");
        speakWithBrowser(text);
        return;
      }

      // Use voice from settings or config override
      const voiceId = config?.voiceId || ttsVoiceId;
      // Use turbo model by default (faster & cheaper)
      const modelId = config?.useTurbo === false ? MULTILINGUAL_MODEL : TURBO_MODEL;

      try {
        setIsSpeakingState(true);
        console.log("[Speech] Streaming audio with ElevenLabs (model:", modelId, ", edge:", useEdgeFunctions, ")...");

        let response: Response;

        if (useEdgeFunctions) {
          // Use Edge Function
          response = await callTTSEdgeFunction({
            text,
            voice_id: voiceId,
            model_id: modelId,
            voice_settings: {
              stability: config?.stability ?? 0.5,
              similarity_boost: config?.similarityBoost ?? 0.75,
            },
          });
        } else {
          // Direct API call
          const url = `${ELEVENLABS_API_URL}/${voiceId}/stream`;
          response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "xi-api-key": apiKey!,
            },
            body: JSON.stringify({
              text,
              model_id: modelId,
              voice_settings: {
                stability: config?.stability ?? 0.5,
                similarity_boost: config?.similarityBoost ?? 0.75,
              },
              optimize_streaming_latency: 3,
            }),
          });
        }

        if (!response.ok) {
          const error = await response.json().catch(() => ({ detail: "Unknown error" }));
          console.error("[Speech] ElevenLabs API error:", error);

          // Try backup voice if selected voice fails (and we haven't tried backup yet)
          if (voiceId !== BACKUP_VOICE_ID) {
            console.log("[Speech] Trying backup voice...");
            return speakWithElevenLabs(text, { ...config, voiceId: BACKUP_VOICE_ID });
          }

          // Fallback to browser
          setIsSpeakingState(false);
          speakWithBrowser(text);
          return;
        }

        // Use MediaSource for streaming playback
        if ('MediaSource' in window && MediaSource.isTypeSupported('audio/mpeg')) {
          await playWithMediaSource(response, text);
        } else {
          // Fallback: wait for full response
          const audioBlob = await response.blob();
          await playAudioBlob(audioBlob);
        }
      } catch (error) {
        console.error("[Speech] ElevenLabs error:", error);
        setIsSpeakingState(false);
        speakWithBrowser(text);
      }
    },
    [getElevenLabsApiKey, isUsingEdgeFunctions, speakWithBrowser, ttsVoiceId]
  );

  const playWithMediaSource = useCallback(
    async (response: Response, _text: string) => {
      const mediaSource = new MediaSource();
      const audioUrl = URL.createObjectURL(mediaSource);

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(audioUrl);
      audio.volume = ttsVolume; // Apply volume setting
      audioRef.current = audio;

      mediaSource.addEventListener("sourceopen", async () => {
        const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
        const reader = response.body?.getReader();

        if (!reader) {
          console.error("[Speech] No reader available");
          return;
        }

        // Start playing as soon as we have some data
        let started = false;

        const pump = async (): Promise<void> => {
          const { done, value } = await reader.read();

          if (done) {
            if (mediaSource.readyState === "open") {
              sourceBuffer.addEventListener("updateend", () => {
                if (mediaSource.readyState === "open") {
                  mediaSource.endOfStream();
                }
              }, { once: true });
            }
            return;
          }

          // Wait for previous append to complete
          if (sourceBuffer.updating) {
            await new Promise<void>((resolve) => {
              sourceBuffer.addEventListener("updateend", () => resolve(), { once: true });
            });
          }

          sourceBuffer.appendBuffer(value);

          // Start playing after first chunk
          if (!started && audio.paused) {
            started = true;
            console.log("[Speech] Starting playback (streaming)...");
            audio.play().catch(console.error);
          }

          await pump();
        };

        pump().catch(console.error);
      });

      audio.onended = () => {
        setIsSpeakingState(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      audio.onerror = () => {
        console.error("[Speech] Audio playback error");
        setIsSpeakingState(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };
    },
    [ttsVolume]
  );

  const playAudioBlob = useCallback(
    async (audioBlob: Blob) => {
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(audioUrl);
      audio.volume = ttsVolume; // Apply volume setting
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeakingState(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      audio.onerror = () => {
        console.error("[Speech] Audio playback error");
        setIsSpeakingState(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      console.log("[Speech] Playing audio...");
      await audio.play();
    },
    [ttsVolume]
  );

  const speak = useCallback(
    (text: string, options?: { lang?: string; rate?: number; pitch?: number }) => {
      // Check if TTS is enabled
      if (!ttsEnabled) {
        console.log("[Speech] TTS disabled, skipping:", text.substring(0, 50) + "...");
        return;
      }

      const useEdgeFunctions = isUsingEdgeFunctions();
      const apiKey = getElevenLabsApiKey();
      const shouldUseElevenLabs = useElevenLabs && (apiKey || useEdgeFunctions);

      if (shouldUseElevenLabs) {
        speakWithElevenLabs(text);
      } else {
        speakWithBrowser(text, options);
      }
    },
    [ttsEnabled, getElevenLabsApiKey, isUsingEdgeFunctions, useElevenLabs, speakWithElevenLabs, speakWithBrowser]
  );

  const stop = useCallback(() => {
    // Stop browser speech
    const synth = getSynth();
    if (synth) {
      synth.cancel();
    }

    // Stop ElevenLabs audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsSpeakingState(false);
  }, [getSynth]);

  const isSpeaking = useCallback(() => {
    return isSpeakingState;
  }, [isSpeakingState]);

  return {
    speak,
    stop,
    isSpeaking,
  };
}
