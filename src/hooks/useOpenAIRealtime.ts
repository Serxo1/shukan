import { useCallback, useRef, useState } from "react";
import { useVoiceStore } from "@/store/useHabitStore";

interface OpenAIRealtimeConfig {
  apiKey: string;
  language?: string;
}

interface TranscriptionResult {
  text: string;
  isFinal: boolean;
}

export function useOpenAIRealtime() {
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const { setListening, setProcessing, setTranscript, setVoiceError, resetVoice } = useVoiceStore();

  const floatTo16BitPCM = (float32Array: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  };

  const base64EncodeAudio = (arrayBuffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const connect = useCallback(
    async (
      config: OpenAIRealtimeConfig,
      onTranscription: (result: TranscriptionResult) => void
    ) => {
      try {
        resetVoice();
        setProcessing(true);

        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        mediaStreamRef.current = stream;

        // Connect to OpenAI Realtime API (standard endpoint with gpt-4o-realtime model)
        const ws = new WebSocket(
          "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
          ["realtime", `openai-insecure-api-key.${config.apiKey}`, "openai-beta.realtime-v1"]
        );

        ws.onopen = () => {
          console.log("Connected to OpenAI Realtime API");
          setIsConnected(true);
          setProcessing(false);
          setListening(true);

          // Configure session for transcription-only (no audio response)
          ws.send(
            JSON.stringify({
              type: "session.update",
              session: {
                modalities: ["text"],
                input_audio_format: "pcm16",
                input_audio_transcription: {
                  model: "whisper-1",
                },
                turn_detection: {
                  type: "server_vad",
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 500,
                },
              },
            })
          );

          // Setup audio processing
          setupAudioProcessing(ws, stream);
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log("[OpenAI Realtime] Event:", data.type, data);

          switch (data.type) {
            // Transcription delta events
            case "conversation.item.input_audio_transcription.delta":
              if (data.delta) {
                const currentTranscript = useVoiceStore.getState().voice.transcript;
                setTranscript(currentTranscript + data.delta);
              }
              break;

            // Transcription completed
            case "conversation.item.input_audio_transcription.completed":
              if (data.transcript) {
                console.log("[OpenAI Realtime] Final transcription:", data.transcript);
                setTranscript(data.transcript);
                onTranscription({ text: data.transcript, isFinal: true });
                setProcessing(false);
              }
              break;

            case "input_audio_buffer.speech_started":
              console.log("[OpenAI Realtime] Speech started");
              setTranscript("");
              break;

            case "input_audio_buffer.speech_stopped":
              console.log("[OpenAI Realtime] Speech stopped");
              setProcessing(true);
              break;

            case "input_audio_buffer.committed":
              console.log("[OpenAI Realtime] Audio committed");
              break;

            case "error":
              console.error("[OpenAI Realtime] Error:", JSON.stringify(data.error, null, 2));
              setVoiceError(data.error?.message || "Erro na transcrição");
              break;

            case "session.created":
            case "session.updated":
              console.log("[OpenAI Realtime] Session:", data.type, data.session);
              break;

            case "conversation.item.input_audio_transcription.failed":
              console.error("[OpenAI Realtime] Transcription FAILED:", JSON.stringify(data.error, null, 2));
              setVoiceError(data.error?.message || "Transcrição falhou");
              setProcessing(false);
              break;

            case "conversation.item.created":
              console.log("[OpenAI Realtime] Item created:", data.item);
              break;

            case "response.created":
            case "response.done":
              // Ignore response events since we're only doing transcription
              break;
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          setVoiceError("Erro de conexão com OpenAI");
          setIsConnected(false);
        };

        ws.onclose = () => {
          console.log("Disconnected from OpenAI Realtime API");
          setIsConnected(false);
          setListening(false);
          setProcessing(false);
        };

        wsRef.current = ws;
      } catch (error) {
        console.error("Failed to connect:", error);
        setVoiceError(
          error instanceof Error ? error.message : "Falha ao conectar"
        );
        setProcessing(false);
      }
    },
    [resetVoice, setListening, setProcessing, setTranscript, setVoiceError]
  );

  const resampleTo24kHz = (inputData: Float32Array, inputSampleRate: number): Float32Array => {
    if (inputSampleRate === 24000) {
      return inputData;
    }

    const ratio = inputSampleRate / 24000;
    const outputLength = Math.floor(inputData.length / ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1);
      const t = srcIndex - srcIndexFloor;
      output[i] = inputData[srcIndexFloor] * (1 - t) + inputData[srcIndexCeil] * t;
    }

    return output;
  };

  const setupAudioProcessing = (ws: WebSocket, stream: MediaStream) => {
    // Don't specify sample rate - let browser use native rate, we'll resample
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    const actualSampleRate = audioContext.sampleRate;
    console.log("[Audio] Context sample rate:", actualSampleRate, "(will resample to 24000)");

    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    let audioSent = false;
    processor.onaudioprocess = (e) => {
      if (ws.readyState === WebSocket.OPEN) {
        const inputData = e.inputBuffer.getChannelData(0);
        const resampledData = resampleTo24kHz(inputData, actualSampleRate);
        const pcmData = floatTo16BitPCM(resampledData);
        const base64Audio = base64EncodeAudio(pcmData);

        if (!audioSent) {
          console.log("[Audio] First chunk - input size:", inputData.length, "resampled:", resampledData.length, "PCM:", pcmData.byteLength);
          audioSent = true;
        }

        ws.send(
          JSON.stringify({
            type: "input_audio_buffer.append",
            audio: base64Audio,
          })
        );
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  };

  const disconnect = useCallback(() => {
    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setListening(false);
  }, [setListening]);

  return {
    connect,
    disconnect,
    isConnected,
  };
}
