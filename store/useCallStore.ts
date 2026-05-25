import { create } from "zustand";

export type CallState = "incoming" | "outgoing" | "active";

export interface ActiveCall {
  uuid: string;
  handle: string; // phone number / VoIP handle
  callerName: string;
  state: CallState;
}

interface CallStore {
  call: ActiveCall | null;
  setCall: (call: ActiveCall | null) => void;
  setState: (state: CallState) => void;
}

export const useCallStore = create<CallStore>((set) => ({
  call: null,
  setCall: (call) => set({ call }),
  setState: (state) => set((s) => (s.call ? { call: { ...s.call, state } } : s)),
}));
