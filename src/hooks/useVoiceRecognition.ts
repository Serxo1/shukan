import { useCallback, useEffect, useRef } from "react";
import { useVoiceStore } from "@/store/useHabitStore";
import type { VoiceCommand } from "@/types";

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export function parseVoiceCommand(transcript: string): VoiceCommand {
  const lower = transcript.toLowerCase().trim();

  const createPatterns = [
    /^(?:criar?|adicionar?|novo)\s+(?:h[aá]bito\s+)?(.+)/i,
    /^(?:quero\s+)?(?:registrar|criar)\s+(.+)/i,
  ];

  const completePatterns = [
    /^(?:completar?|marcar?|registrar?|fiz|feito)\s+(.+)/i,
    /^(.+?)\s+(?:feito|completo|marcado|pronto)/i,
  ];

  const deletePatterns = [
    /^(?:deletar?|remover?|excluir?)\s+(?:h[aá]bito\s+)?(.+)/i,
  ];

  const listPatterns = [
    /^(?:listar?|mostrar?|ver)\s+(?:meus\s+)?h[aá]bitos?/i,
    /^(?:quais\s+)?(?:s[aã]o\s+)?(?:meus\s+)?h[aá]bitos/i,
  ];

  for (const pattern of createPatterns) {
    const match = lower.match(pattern);
    if (match) {
      return { action: "create", habitName: match[1].trim() };
    }
  }

  for (const pattern of completePatterns) {
    const match = lower.match(pattern);
    if (match) {
      const habitName = match[1].trim();
      const durationMatch = habitName.match(/(\d+)\s*(?:min(?:utos?)?|h(?:oras?)?)/i);
      return {
        action: "complete",
        habitName: habitName.replace(/\s*\d+\s*(?:min(?:utos?)?|h(?:oras?)?)/i, "").trim(),
        duration: durationMatch ? durationMatch[0] : undefined,
      };
    }
  }

  for (const pattern of deletePatterns) {
    const match = lower.match(pattern);
    if (match) {
      return { action: "delete", habitName: match[1].trim() };
    }
  }

  for (const pattern of listPatterns) {
    if (pattern.test(lower)) {
      return { action: "list" };
    }
  }

  return { action: "unknown" };
}

export function useVoiceRecognition() {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { setListening, setProcessing, setTranscript, setVoiceError, resetVoice } = useVoiceStore();

  const isSupported = useCallback(() => {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  const getRecognition = useCallback(() => {
    if (!recognitionRef.current && isSupported()) {
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        recognitionRef.current = new SpeechRecognitionClass();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "pt-BR";
      }
    }
    return recognitionRef.current;
  }, [isSupported]);

  const startListening = useCallback(
    (onResult: (command: VoiceCommand, transcript: string) => void) => {
      const recognition = getRecognition();
      if (!recognition) {
        setVoiceError("Speech recognition not supported");
        return;
      }

      resetVoice();
      setListening(true);

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[event.resultIndex];
        const transcript = result[0].transcript;

        setTranscript(transcript);

        if (result.isFinal) {
          setProcessing(true);
          const command = parseVoiceCommand(transcript);
          onResult(command, transcript);
          setProcessing(false);
        }
      };

      recognition.onerror = (event: { error: string }) => {
        setVoiceError(`Voice error: ${event.error}`);
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognition.start();
    },
    [getRecognition, setListening, setProcessing, setTranscript, setVoiceError, resetVoice]
  );

  const stopListening = useCallback(() => {
    const recognition = getRecognition();
    if (recognition) {
      recognition.stop();
    }
    setListening(false);
  }, [getRecognition, setListening]);

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.abort();
      }
    };
  }, []);

  return {
    isSupported,
    startListening,
    stopListening,
  };
}
