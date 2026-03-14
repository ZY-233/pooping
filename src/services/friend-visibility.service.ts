import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type FriendShareSettingsRow =
  Database["public"]["Tables"]["friend_share_settings"]["Row"];
type FriendShareSettingsUpdate =
  Database["public"]["Tables"]["friend_share_settings"]["Update"];
type FriendRelationRow = Database["public"]["Tables"]["friend_relations"]["Row"];
type PoopRecordRow = Database["public"]["Tables"]["poop_records"]["Row"];

export type FriendVisibleSummary = {
  hasRecord: boolean;
  recordTime: string | null;
  shapeType: PoopRecordRow["shape_type"] | null;
  note: string | null;
};

const defaultVisibility = {
  share_has_record: true,
  share_record_time: false,
  share_shape: false,
  share_note: false,
};

export async function getOrCreateVisibilitySettings(
  supabase: SupabaseClient<Database>,
  params: {
    relationId: string;
    ownerUserId: string;
  },
): Promise<{ data: FriendShareSettingsRow | null; error: PostgrestError | null }> {
  const existing = await supabase
    .from("friend_share_settings")
    .select("*")
    .eq("relation_id", params.relationId)
    .eq("owner_user_id", params.ownerUserId)
    .maybeSingle();

  if (existing.error) {
    return { data: null, error: existing.error };
  }

  if (existing.data) {
    return { data: existing.data as FriendShareSettingsRow, error: null };
  }

  const inserted = await supabase
    .from("friend_share_settings")
    .insert({
      relation_id: params.relationId,
      owner_user_id: params.ownerUserId,
      ...defaultVisibility,
    })
    .select("*")
    .single();

  return {
    data: (inserted.data as FriendShareSettingsRow | null) ?? null,
    error: inserted.error,
  };
}

export async function updateVisibilitySettings(
  supabase: SupabaseClient<Database>,
  params: {
    relationId: string;
    ownerUserId: string;
    patch: FriendShareSettingsUpdate;
  },
): Promise<{ data: FriendShareSettingsRow | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("friend_share_settings")
    .update(params.patch)
    .eq("relation_id", params.relationId)
    .eq("owner_user_id", params.ownerUserId)
    .select("*")
    .single();

  return { data: data as FriendShareSettingsRow | null, error };
}

export async function getFriendVisibleSummary(
  supabase: SupabaseClient<Database>,
  params: {
    relation: FriendRelationRow;
    ownerUserId: string;
    date: string;
  },
): Promise<{ data: FriendVisibleSummary | null; errorMessage: string | null }> {
  // keep API compatibility: ownerUserId is not needed by RPC and is ignored.
  void params.ownerUserId;

  const { data, error } = await supabase.rpc("get_friend_visible_summary", {
    p_relation_id: params.relation.id,
    p_date: params.date,
  });

  if (error) {
    return { data: null, errorMessage: error.message };
  }

  const row = (data?.[0] as
    | {
        has_record: boolean;
        record_time: string | null;
        shape_type: PoopRecordRow["shape_type"] | null;
        note: string | null;
      }
    | undefined) ?? {
    has_record: false,
    record_time: null,
    shape_type: null,
    note: null,
  };

  return {
    data: {
      hasRecord: row.has_record,
      recordTime: row.record_time,
      shapeType: row.shape_type,
      note: row.note,
    },
    errorMessage: null,
  };
}

export async function getFriendVisibleTodaySummary(
  supabase: SupabaseClient<Database>,
  params: {
    relation: FriendRelationRow;
    viewerUserId: string;
    date: string;
  },
): Promise<{ data: FriendVisibleSummary | null; errorMessage: string | null }> {
  // keep API compatibility: viewerUserId is not needed by RPC and is ignored.
  void params.viewerUserId;

  return getFriendVisibleSummary(supabase, {
    relation: params.relation,
    ownerUserId: "",
    date: params.date,
  });
}
