import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type FriendAlias = Database["public"]["Tables"]["friend_aliases"]["Row"];

type FriendAliasInsert = Database["public"]["Tables"]["friend_aliases"]["Insert"];

export async function getFriendAlias(
  supabase: SupabaseClient<Database>,
  params: {
    relationId: string;
    ownerUserId: string;
    targetUserId: string;
  },
): Promise<{ data: FriendAlias | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("friend_aliases")
    .select("*")
    .eq("relation_id", params.relationId)
    .eq("owner_user_id", params.ownerUserId)
    .eq("target_user_id", params.targetUserId)
    .maybeSingle();

  return { data: data as FriendAlias | null, error };
}

export async function upsertFriendAlias(
  supabase: SupabaseClient<Database>,
  payload: FriendAliasInsert,
): Promise<{ data: FriendAlias | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("friend_aliases")
    .upsert(payload, { onConflict: "relation_id,owner_user_id,target_user_id" })
    .select("*")
    .single();

  return { data: data as FriendAlias | null, error };
}

export async function deleteFriendAlias(
  supabase: SupabaseClient<Database>,
  params: {
    relationId: string;
    ownerUserId: string;
    targetUserId: string;
  },
): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase
    .from("friend_aliases")
    .delete()
    .eq("relation_id", params.relationId)
    .eq("owner_user_id", params.ownerUserId)
    .eq("target_user_id", params.targetUserId);

  return { error };
}

export function resolveFriendDisplayName(params: {
  aliasName?: string | null;
  nickname?: string | null;
  fallback?: string;
}) {
  const alias = params.aliasName?.trim();
  if (alias) {
    return alias;
  }

  const nickname = params.nickname?.trim();
  if (nickname) {
    return nickname;
  }

  return params.fallback ?? "噗友";
}
