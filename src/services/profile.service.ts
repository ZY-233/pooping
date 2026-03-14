import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];
type UserProfileInsert = Database["public"]["Tables"]["user_profiles"]["Insert"];
type UserProfileUpdate = Database["public"]["Tables"]["user_profiles"]["Update"];
type PeerProfile = Database["public"]["Functions"]["get_relation_peer_profile"]["Returns"][number];

export async function upsertUserProfile(
  supabase: SupabaseClient<Database>,
  payload: UserProfileInsert,
): Promise<{ data: UserProfileRow | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  return { data: data as UserProfileRow | null, error };
}

export async function getUserProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ data: UserProfileRow | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return { data: data as UserProfileRow | null, error };
}

export async function getUserProfileByUserId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ data: UserProfileRow | null; error: PostgrestError | null }> {
  return getUserProfile(supabase, userId);
}

export async function getRelationPeerProfile(
  supabase: SupabaseClient<Database>,
  relationId: string,
): Promise<{ data: PeerProfile | null; error: PostgrestError | null }> {
  const { data, error } = await supabase.rpc("get_relation_peer_profile", {
    p_relation_id: relationId,
  });

  const row = (data?.[0] as PeerProfile | undefined) ?? null;
  return { data: row, error };
}

export async function updateUserProfile(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    patch: UserProfileUpdate;
  },
): Promise<{ data: UserProfileRow | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("user_profiles")
    .update(params.patch)
    .eq("user_id", params.userId)
    .select("*")
    .single();

  return { data: data as UserProfileRow | null, error };
}

export async function upsertNickname(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    nickname: string;
  },
): Promise<{ data: UserProfileRow | null; error: PostgrestError | null }> {
  return upsertUserProfile(supabase, {
    user_id: params.userId,
    nickname: params.nickname,
  });
}
