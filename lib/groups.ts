import { supabase } from "@/lib/supabase";
import type { MemberRole, Profile, RiderGroup } from "@/types/models";

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Not signed in");
  return id;
}

export async function listMyGroups(): Promise<RiderGroup[]> {
  const { data, error } = await supabase
    .from("rider_groups")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RiderGroup[];
}

export async function createGroup(name: string): Promise<RiderGroup> {
  const owner_id = await requireUserId();
  const { data, error } = await supabase
    .from("rider_groups")
    .insert({ name, owner_id })
    .select()
    .single();
  if (error) throw error;
  return data as RiderGroup;
}

export async function joinGroupByCode(code: string): Promise<RiderGroup> {
  const { data, error } = await supabase.rpc("join_group_by_code", {
    p_code: code.trim(),
  });
  if (error) throw error;
  return data as RiderGroup;
}

export async function leaveGroup(groupId: string): Promise<void> {
  const user_id = await requireUserId();
  const { error } = await supabase
    .from("rider_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user_id);
  if (error) throw error;
}

export interface GroupMember {
  user_id: string;
  role: MemberRole;
  profile: Profile | null;
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data: members, error } = await supabase
    .from("rider_group_members")
    .select("user_id, role")
    .eq("group_id", groupId);
  if (error) throw error;

  const ids = (members ?? []).map((m) => m.user_id as string);
  let profiles: Profile[] = [];
  if (ids.length) {
    const { data: profs, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .in("id", ids);
    if (pErr) throw pErr;
    profiles = (profs ?? []) as Profile[];
  }
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return (members ?? []).map((m) => ({
    user_id: m.user_id as string,
    role: m.role as MemberRole,
    profile: byId.get(m.user_id as string) ?? null,
  }));
}
