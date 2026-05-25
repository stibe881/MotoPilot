import { useEffect } from "react";
import { getMyProfile } from "@/lib/profile";
import { useProfileStore } from "@/store/useProfileStore";

/** Loads the signed-in user's profile into the store once. */
export function useLoadProfile() {
  const setProfile = useProfileStore((s) => s.setProfile);
  useEffect(() => {
    getMyProfile()
      .then((p) => setProfile(p))
      .catch(() => undefined);
  }, [setProfile]);
}
