import { useState, useEffect } from "react";

export function useConnectivity() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Placeholder for future use
  const dismissOfflineWarning = () => {};

  return {
    isOnline,
    dismissOfflineWarning,
  };
}

// Features that require internet
export const ONLINE_FEATURES = [
  { key: "voice", name: "Voice control (STT)", nameKey: "connectivity.features.voice" },
  { key: "tts", name: "Text-to-speech", nameKey: "connectivity.features.tts" },
  { key: "sync", name: "Cloud sync", nameKey: "connectivity.features.sync" },
] as const;
