import { create } from "zustand";
import type { WidgetPayload } from "@/types";

interface WidgetStore {
  activeWidget: WidgetPayload | null;
  widgetQueue: WidgetPayload[];

  showWidget: (widget: WidgetPayload) => void;
  dismissWidget: () => void;
  queueWidget: (widget: WidgetPayload) => void;
  processQueue: () => void;
  clearAll: () => void;
}

export const useWidgetStore = create<WidgetStore>((set, get) => ({
  activeWidget: null,
  widgetQueue: [],

  showWidget: (widget) => {
    const { activeWidget } = get();
    if (activeWidget) {
      set((state) => ({ widgetQueue: [...state.widgetQueue, widget] }));
    } else {
      set({ activeWidget: widget });
    }
  },

  dismissWidget: () => {
    const { widgetQueue } = get();
    if (widgetQueue.length > 0) {
      const [next, ...rest] = widgetQueue;
      set({ activeWidget: next, widgetQueue: rest });
    } else {
      set({ activeWidget: null });
    }
  },

  queueWidget: (widget) =>
    set((state) => ({ widgetQueue: [...state.widgetQueue, widget] })),

  processQueue: () => {
    const { activeWidget, widgetQueue } = get();
    if (!activeWidget && widgetQueue.length > 0) {
      const [next, ...rest] = widgetQueue;
      set({ activeWidget: next, widgetQueue: rest });
    }
  },

  clearAll: () => set({ activeWidget: null, widgetQueue: [] }),
}));
