import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { DailyStatusType, Database } from "@/types/database";

type DailyStatusRow = Database["public"]["Tables"]["daily_statuses"]["Row"];

export async function upsertDailyStatus(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    date: string;
    status: DailyStatusType;
  },
): Promise<{ data: DailyStatusRow | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("daily_statuses")
    .upsert(
      {
        user_id: params.userId,
        status_date: params.date,
        status: params.status,
      },
      { onConflict: "user_id,status_date" },
    )
    .select("*")
    .single();

  return { data: data as DailyStatusRow | null, error };
}

export async function getDailyStatusByDate(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    date: string;
  },
): Promise<{ data: DailyStatusRow | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("daily_statuses")
    .select("*")
    .eq("user_id", params.userId)
    .eq("status_date", params.date)
    .maybeSingle();

  return { data: data as DailyStatusRow | null, error };
}

export async function listDailyStatusesByMonth(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    fromDate: string;
    toDate: string;
  },
): Promise<{ data: DailyStatusRow[]; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("daily_statuses")
    .select("*")
    .eq("user_id", params.userId)
    .gte("status_date", params.fromDate)
    .lte("status_date", params.toDate)
    .order("status_date", { ascending: true });

  return { data: (data ?? []) as DailyStatusRow[], error };
}

export async function clearDailyStatusByDate(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    date: string;
  },
): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase
    .from("daily_statuses")
    .delete()
    .eq("user_id", params.userId)
    .eq("status_date", params.date);

  return { error };
}
