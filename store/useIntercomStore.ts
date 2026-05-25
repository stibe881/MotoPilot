import { create } from "zustand";

interface IntercomState {
  connectedDeviceId: string | null;
  deviceName: string | null;
  batteryPct: number | null;
  setConnected: (id: string | null, name: string | null) => void;
  setBattery: (pct: number | null) => void;
  reset: () => void;
}

// Headset state lives in its own store so the group-ride publisher can read the
// current battery level without coupling to the intercom screen lifecycle.
export const useIntercomStore = create<IntercomState>((set) => ({
  connectedDeviceId: null,
  deviceName: null,
  batteryPct: null,
  setConnected: (connectedDeviceId, deviceName) => set({ connectedDeviceId, deviceName }),
  setBattery: (batteryPct) => set({ batteryPct }),
  reset: () => set({ connectedDeviceId: null, deviceName: null, batteryPct: null }),
}));
