import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type UserSettingsRow = Database["public"]["Tables"]["user_settings"]["Row"];
type UserSettingsInsert = Database["public"]["Tables"]["user_settings"]["Insert"];
type UserSettingsUpdate = Database["public"]["Tables"]["user_settings"]["Update"];

export async function getUserSettings(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ data: UserSettingsRow | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return { data: data as UserSettingsRow | null, error };
}

export async function upsertUserSettings(
  supabase: SupabaseClient<Database>,
  payload: UserSettingsInsert,
): Promise<{ data: UserSettingsRow | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("user_settings")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  return { data: data as UserSettingsRow | null, error };
}

export async function updateUserSettings(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    patch: UserSettingsUpdate;
  },
): Promise<{ data: UserSettingsRow | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("user_settings")
    .update(params.patch)
    .eq("user_id", params.userId)
    .select("*")
    .single();

  return { data: data as UserSettingsRow | null, error };
}
