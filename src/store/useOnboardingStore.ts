import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      currentStep: 0,
      setCurrentStep: (step) => set({ currentStep: step }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true, currentStep: 0 }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false, currentStep: 0 }),
    }),
    {
      name: "onboarding-storage",
    }
  )
);

// Detect OS
export const getOS = (): "windows" | "macos" | "linux" => {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes("mac")) return "macos";
  if (platform.includes("win")) return "windows";
  return "linux";
};

// Get hotkey string based on OS
export const getHotkeyString = (): string => {
  const os = getOS();
  if (os === "macos") return "⌘ + Shift + H";
  return "Win + Shift + H";
};

// Get modifier key name based on OS
export const getModifierKey = (): string => {
  const os = getOS();
  if (os === "macos") return "⌘";
  return "Win";
};
