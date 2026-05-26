import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SettingsState {
  // Speeding tolerance over the posted limit, in km/h (internal unit).
  speedToleranceKmh: number;
  setSpeedToleranceKmh: (v: number) => void;
}

// Persisted device-local settings (survive restarts via AsyncStorage).
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      speedToleranceKmh: 5,
      setSpeedToleranceKmh: (speedToleranceKmh) => set({ speedToleranceKmh }),
    }),
    {
      name: "motopilot-settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
