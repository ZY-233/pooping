import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { Database, InteractionType } from "@/types/database";

type FriendInteractionRow = Database["public"]["Tables"]["friend_interactions"]["Row"];
type FriendRelationRow = Database["public"]["Tables"]["friend_relations"]["Row"];

export type InteractionFeedItem = FriendInteractionRow;

export async function sendFriendInteraction(
  supabase: SupabaseClient<Database>,
  params: {
    relation: FriendRelationRow;
    senderUserId: string;
    interactionType: InteractionType;
    targetRecordId?: string | null;
  },
): Promise<{ data: InteractionFeedItem | null; error: PostgrestError | null }> {
  const receiverUserId =
    params.relation.user_id === params.senderUserId
      ? params.relation.friend_user_id
      : params.relation.user_id;

  const { data, error } = await supabase
    .from("friend_interactions")
    .insert({
      relation_id: params.relation.id,
      sender_user_id: params.senderUserId,
      receiver_user_id: receiverUserId,
      interaction_type: params.interactionType,
      status: "sent",
      target_record_id: params.targetRecordId ?? null,
    })
    .select("*")
    .single();

  return { data: data as InteractionFeedItem | null, error };
}

export async function listRelationInteractions(
  supabase: SupabaseClient<Database>,
  params: {
    relationId: string;
    limit?: number;
  },
): Promise<{ data: InteractionFeedItem[]; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("friend_interactions")
    .select("*")
    .eq("relation_id", params.relationId)
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 20);

  return { data: (data ?? []) as InteractionFeedItem[], error };
}

export async function countUnreadInteractions(
  supabase: SupabaseClient<Database>,
  params: {
    relationId: string;
    receiverUserId: string;
  },
): Promise<{ count: number; error: PostgrestError | null }> {
  const { count, error } = await supabase
    .from("friend_interactions")
    .select("id", { count: "exact", head: true })
    .eq("relation_id", params.relationId)
    .eq("receiver_user_id", params.receiverUserId)
    .eq("status", "sent");

  return { count: count ?? 0, error };
}

export async function markInteractionsAsRead(
  supabase: SupabaseClient<Database>,
  params: {
    relationId: string;
    receiverUserId: string;
  },
): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase
    .from("friend_interactions")
    .update({
      status: "read",
      read_at: new Date().toISOString(),
    })
    .eq("relation_id", params.relationId)
    .eq("receiver_user_id", params.receiverUserId)
    .eq("status", "sent");

  return { error };
}
