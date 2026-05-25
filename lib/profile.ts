import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/models";

export async function getMyProfile(): Promise<Profile | null> {
  const { data: userData } = await supabase.auth.getUser();
  const id = userData.user?.id;
  if (!id) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

export type ProfileUpdate = Partial<
  Pick<Profile, "display_name" | "username" | "bike_make" | "bike_model" | "bike_year" | "units">
>;

export async function updateMyProfile(patch: ProfileUpdate): Promise<Profile> {
  const { data: userData } = await supabase.auth.getUser();
  const id = userData.user?.id;
  if (!id) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}
