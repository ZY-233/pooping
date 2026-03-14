import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type FriendRelation = Database["public"]["Tables"]["friend_relations"]["Row"];
export type FriendInvite = Database["public"]["Tables"]["friend_invites"]["Row"];
export type FriendBindingState = "unbound" | "inviting" | "active";

export type FriendBindingSnapshot = {
  state: FriendBindingState;
  activeRelation: FriendRelation | null;
  pendingInvite: (FriendInvite & { inviteLink: string }) | null;
};

function buildInviteLink(baseUrl: string, inviteCode: string) {
  return `${baseUrl.replace(/\/$/, "")}/friends?invite=${inviteCode}`;
}

function generateInviteCode(length = 8) {
  const source = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";

  for (let i = 0; i < length; i += 1) {
    result += source[Math.floor(Math.random() * source.length)];
  }

  return result;
}

function isInviteExpired(invite: FriendInvite) {
  if (!invite.expires_at) {
    return false;
  }

  return new Date(invite.expires_at).getTime() <= Date.now();
}

async function expireInviteIfNeeded(
  supabase: SupabaseClient<Database>,
  invite: FriendInvite,
) {
  if (!isInviteExpired(invite)) {
    return invite;
  }

  await supabase
    .from("friend_invites")
    .update({ status: "expired" })
    .eq("id", invite.id)
    .eq("status", "pending");

  return null;
}

export async function getActiveFriendRelation(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ data: FriendRelation | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("friend_relations")
    .select("*")
    .eq("status", "active")
    .is("removed_at", null)
    .or(`user_id.eq.${userId},friend_user_id.eq.${userId}`)
    .maybeSingle();

  return { data: data as FriendRelation | null, error };
}

export async function getPendingOutgoingInvite(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ data: FriendInvite | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("friend_invites")
    .select("*")
    .eq("inviter_user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    return { data: null, error };
  }

  const list = (data ?? []) as FriendInvite[];
  for (const invite of list) {
    const valid = await expireInviteIfNeeded(supabase, invite);
    if (valid) {
      return { data: valid, error: null };
    }
  }

  return { data: null, error: null };
}

export async function getFriendBindingSnapshot(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    baseUrl: string;
  },
): Promise<{ data: FriendBindingSnapshot | null; error: PostgrestError | null }> {
  const [activeResult, inviteResult] = await Promise.all([
    getActiveFriendRelation(supabase, params.userId),
    getPendingOutgoingInvite(supabase, params.userId),
  ]);

  const error = activeResult.error ?? inviteResult.error;
  if (error) {
    return { data: null, error };
  }

  if (activeResult.data) {
    return {
      data: {
        state: "active",
        activeRelation: activeResult.data,
        pendingInvite: null,
      },
      error: null,
    };
  }

  if (inviteResult.data) {
    return {
      data: {
        state: "inviting",
        activeRelation: null,
        pendingInvite: {
          ...inviteResult.data,
          inviteLink: buildInviteLink(params.baseUrl, inviteResult.data.invite_code),
        },
      },
      error: null,
    };
  }

  return {
    data: {
      state: "unbound",
      activeRelation: null,
      pendingInvite: null,
    },
    error: null,
  };
}

async function createInviteWithRetry(
  supabase: SupabaseClient<Database>,
  userId: string,
  maxAttempts = 5,
) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const inviteCode = generateInviteCode();
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("friend_invites")
      .insert({
        inviter_user_id: userId,
        invite_code: inviteCode,
        status: "pending",
        expires_at: expiresAt,
      })
      .select("*")
      .single();

    if (!error && data) {
      return { data: data as FriendInvite, errorMessage: null };
    }

    if (error && error.code !== "23505") {
      return { data: null, errorMessage: error.message };
    }
  }

  return { data: null, errorMessage: "邀请码生成失败，请稍后重试。" };
}

export async function createFriendInvite(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    baseUrl: string;
  },
): Promise<{ data: (FriendInvite & { inviteLink: string }) | null; errorMessage: string | null }> {
  const active = await getActiveFriendRelation(supabase, params.userId);
  if (active.error) {
    return { data: null, errorMessage: active.error.message };
  }

  if (active.data) {
    return { data: null, errorMessage: "当前版本一次只能绑定一个噗友。" };
  }

  const existing = await getPendingOutgoingInvite(supabase, params.userId);
  if (existing.error) {
    return { data: null, errorMessage: existing.error.message };
  }

  if (existing.data) {
    return {
      data: {
        ...existing.data,
        inviteLink: buildInviteLink(params.baseUrl, existing.data.invite_code),
      },
      errorMessage: null,
    };
  }

  const created = await createInviteWithRetry(supabase, params.userId);
  if (created.errorMessage || !created.data) {
    return { data: null, errorMessage: created.errorMessage ?? "邀请创建失败" };
  }

  return {
    data: {
      ...created.data,
      inviteLink: buildInviteLink(params.baseUrl, created.data.invite_code),
    },
    errorMessage: null,
  };
}

export async function acceptFriendInvite(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    inviteCode: string;
  },
): Promise<{ relation: FriendRelation | null; errorMessage: string | null }> {
  const code = params.inviteCode.trim().toUpperCase();
  if (!code) {
    return { relation: null, errorMessage: "请输入邀请码" };
  }

  const { data: invite, error: inviteError } = await supabase
    .from("friend_invites")
    .select("*")
    .eq("invite_code", code)
    .eq("status", "pending")
    .maybeSingle();

  if (inviteError) {
    return { relation: null, errorMessage: inviteError.message };
  }

  const typedInvite = (invite as FriendInvite | null) ?? null;
  if (!typedInvite) {
    return { relation: null, errorMessage: "这个邀请码已失效或不存在。" };
  }

  const validInvite = await expireInviteIfNeeded(supabase, typedInvite);
  if (!validInvite) {
    return { relation: null, errorMessage: "这个邀请码已过期，请对方重新发起邀请。" };
  }

  if (validInvite.inviter_user_id === params.userId) {
    return { relation: null, errorMessage: "不允许自己绑定自己。" };
  }

  const myActive = await getActiveFriendRelation(supabase, params.userId);
  if (myActive.error) {
    return { relation: null, errorMessage: myActive.error.message };
  }

  if (myActive.data) {
    return { relation: null, errorMessage: "当前版本一次只能绑定一个噗友。" };
  }

  const inviterActive = await getActiveFriendRelation(supabase, validInvite.inviter_user_id);
  if (inviterActive.error) {
    return { relation: null, errorMessage: inviterActive.error.message };
  }

  if (inviterActive.data) {
    return { relation: null, errorMessage: "对方已绑定噗友，无法接受该邀请。" };
  }

  const { data: relation, error: relationError } = await supabase
    .from("friend_relations")
    .insert({
      user_id: validInvite.inviter_user_id,
      friend_user_id: params.userId,
      // Relation is created by the accepter at this step, so initiator must be current actor for RLS.
      initiator_user_id: params.userId,
      status: "active",
      invite_code: validInvite.invite_code,
      confirmed_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (relationError || !relation) {
    return {
      relation: null,
      errorMessage: relationError?.message ?? "绑定失败，请稍后重试。",
    };
  }

  const typedRelation = relation as FriendRelation;

  await supabase
    .from("friend_invites")
    .update({
      status: "accepted",
      accepted_by_user_id: params.userId,
    })
    .eq("id", validInvite.id)
    .eq("status", "pending");

  await supabase.from("friend_share_settings").insert([
    {
      relation_id: typedRelation.id,
      owner_user_id: typedRelation.user_id,
      share_has_record: true,
      share_record_time: false,
      share_shape: false,
      share_note: false,
    },
    {
      relation_id: typedRelation.id,
      owner_user_id: typedRelation.friend_user_id,
      share_has_record: true,
      share_record_time: false,
      share_shape: false,
      share_note: false,
    },
  ]);

  return { relation: typedRelation, errorMessage: null };
}

export async function removeFriendRelation(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    relationId: string;
  },
): Promise<{ errorMessage: string | null }> {
  const { error } = await supabase
    .from("friend_relations")
    .update({
      status: "removed",
      removed_at: new Date().toISOString(),
    })
    .eq("id", params.relationId)
    .or(`user_id.eq.${params.userId},friend_user_id.eq.${params.userId}`);

  if (error) {
    return { errorMessage: error.message };
  }

  return { errorMessage: null };
}
