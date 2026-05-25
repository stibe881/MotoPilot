import { create } from "zustand";
import type { DistanceUnit, Profile } from "@/types/models";

interface ProfileStore {
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  units: () => DistanceUnit;
}

// Profile is cached here so formatting (distance units) and the group/profile
// screens can read it without re-fetching.
export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  units: () => get().profile?.units ?? "metric",
}));
