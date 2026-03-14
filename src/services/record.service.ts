import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type PoopRecordRow = Database["public"]["Tables"]["poop_records"]["Row"];
type PoopRecordInsert = Database["public"]["Tables"]["poop_records"]["Insert"];
type PoopRecordUpdate = Database["public"]["Tables"]["poop_records"]["Update"];
export type RecordItem = PoopRecordRow;
export type MonthCalendarDay = {
  date: string;
  count: number;
};
export type MonthCalendar = {
  monthCount: number;
  days: MonthCalendarDay[];
};

type HomeSummary = {
  hasRecordToday: boolean;
  monthCount: number;
  weekCount: number;
  latestRecord: PoopRecordRow | null;
  insightText: string;
};

function formatDateKeyLocal(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekStartDate(now: Date) {
  const current = new Date(now);
  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diff);
  current.setHours(0, 0, 0, 0);
  return current;
}

function getMonthStartDate(now: Date) {
  const current = new Date(now.getFullYear(), now.getMonth(), 1);
  current.setHours(0, 0, 0, 0);
  return current;
}

function getMonthRange(year: number, month: number) {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  return {
    fromDate: formatDateKeyLocal(first),
    toDate: formatDateKeyLocal(last),
  };
}

function getTimeSlotLabel(hour: number) {
  if (hour < 12) {
    return "早上";
  }
  if (hour < 18) {
    return "下午";
  }
  return "晚上";
}

function getRecentStreakDays(dateKeys: string[]) {
  if (dateKeys.length === 0) {
    return 0;
  }

  const sorted = [...new Set(dateKeys)].sort().reverse();
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (const key of sorted) {
    const keyDate = new Date(`${key}T00:00:00`);
    if (keyDate.getTime() === cursor.getTime()) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    if (streak === 0 && keyDate.getTime() === cursor.getTime() - 24 * 3600 * 1000) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 2);
      continue;
    }

    break;
  }

  return streak;
}

function buildInsightText(records: PoopRecordRow[], weekCount: number) {
  if (records.length === 0) {
    return "这周刚刚开始，继续记一下吧";
  }

  const recent7 = records.filter((record) => {
    const diff = Date.now() - new Date(record.record_time).getTime();
    return diff <= 7 * 24 * 3600 * 1000;
  });

  const slotCount = recent7.reduce<Record<string, number>>((acc, record) => {
    const hour = new Date(record.record_time).getHours();
    const slot = getTimeSlotLabel(hour);
    acc[slot] = (acc[slot] ?? 0) + 1;
    return acc;
  }, {});

  const sortedSlot = Object.entries(slotCount).sort((a, b) => b[1] - a[1]);
  const streakDays = getRecentStreakDays(recent7.map((r) => r.record_date));

  if (streakDays >= 2) {
    return `你已经连续 ${streakDays} 天有记录了`;
  }

  if (sortedSlot.length > 0 && sortedSlot[0][1] >= 2) {
    return `你最近常在${sortedSlot[0][0]}顺顺`;
  }

  if (weekCount > 0) {
    return `这周目前已经记录了 ${weekCount} 次`;
  }

  if (recent7.length > 0) {
    return `最近 7 天记录了 ${recent7.length} 次`;
  }

  return "最近有在认真记录哦";
}

export async function listUserRecordsByMonth(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    fromDate: string;
    toDate: string;
  },
): Promise<{ data: PoopRecordRow[]; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("poop_records")
    .select("*")
    .eq("user_id", params.userId)
    .is("deleted_at", null)
    .gte("record_date", params.fromDate)
    .lte("record_date", params.toDate)
    .order("record_time", { ascending: false });

  return { data: (data ?? []) as PoopRecordRow[], error };
}

export async function listUserRecentRecords(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    limit?: number;
  },
): Promise<{ data: PoopRecordRow[]; error: PostgrestError | null }> {
  const limit = params.limit ?? 10;

  const { data, error } = await supabase
    .from("poop_records")
    .select("*")
    .eq("user_id", params.userId)
    .is("deleted_at", null)
    .order("record_time", { ascending: false })
    .limit(limit);

  return { data: (data ?? []) as PoopRecordRow[], error };
}

export async function getPoopRecordById(
  supabase: SupabaseClient<Database>,
  params: {
    id: string;
    userId: string;
  },
): Promise<{ data: PoopRecordRow | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("poop_records")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", params.userId)
    .is("deleted_at", null)
    .maybeSingle();

  return { data: data as PoopRecordRow | null, error };
}

export async function getRecordById(
  supabase: SupabaseClient<Database>,
  params: {
    id: string;
    userId: string;
  },
): Promise<{ data: PoopRecordRow | null; error: PostgrestError | null }> {
  return getPoopRecordById(supabase, params);
}

export async function createPoopRecord(
  supabase: SupabaseClient<Database>,
  payload: PoopRecordInsert,
): Promise<{ data: PoopRecordRow | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("poop_records")
    .insert(payload)
    .select("*")
    .single();

  return { data: data as PoopRecordRow | null, error };
}

export async function updatePoopRecord(
  supabase: SupabaseClient<Database>,
  params: {
    id: string;
    userId: string;
    patch: PoopRecordUpdate;
  },
): Promise<{ data: PoopRecordRow | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("poop_records")
    .update(params.patch)
    .eq("id", params.id)
    .eq("user_id", params.userId)
    .is("deleted_at", null)
    .select("*")
    .single();

  return { data: data as PoopRecordRow | null, error };
}

export async function softDeletePoopRecord(
  supabase: SupabaseClient<Database>,
  params: {
    id: string;
    userId: string;
  },
): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase
    .from("poop_records")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("user_id", params.userId)
    .is("deleted_at", null);

  return { error };
}

async function getCount(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    fromDate: string;
    toDate: string;
  },
) {
  const { count, error } = await supabase
    .from("poop_records")
    .select("id", { count: "exact", head: true })
    .eq("user_id", params.userId)
    .is("deleted_at", null)
    .gte("record_date", params.fromDate)
    .lte("record_date", params.toDate);

  return { count: count ?? 0, error };
}

export async function getHomeSummary(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ data: HomeSummary | null; error: PostgrestError | null }> {
  const now = new Date();
  const todayKey = formatDateKeyLocal(now);
  const weekStart = formatDateKeyLocal(getWeekStartDate(now));
  const monthStart = formatDateKeyLocal(getMonthStartDate(now));

  const recentFrom = formatDateKeyLocal(new Date(Date.now() - 30 * 24 * 3600 * 1000));
  const [todayResult, weekResult, monthResult, latestResult, recentResult] = await Promise.all([
    getCount(supabase, { userId, fromDate: todayKey, toDate: todayKey }),
    getCount(supabase, { userId, fromDate: weekStart, toDate: todayKey }),
    getCount(supabase, { userId, fromDate: monthStart, toDate: todayKey }),
    supabase
      .from("poop_records")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("record_time", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("poop_records")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("record_date", recentFrom)
      .lte("record_date", todayKey)
      .order("record_time", { ascending: false }),
  ]);

  const firstError =
    todayResult.error ??
    weekResult.error ??
    monthResult.error ??
    latestResult.error ??
    recentResult.error;

  if (firstError) {
    return { data: null, error: firstError };
  }

  return {
    data: {
      hasRecordToday: todayResult.count > 0,
      weekCount: weekResult.count,
      monthCount: monthResult.count,
      latestRecord: (latestResult.data as PoopRecordRow | null) ?? null,
      insightText: buildInsightText((recentResult.data ?? []) as PoopRecordRow[], weekResult.count),
    },
    error: null,
  };
}

export async function getMonthCalendar(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    year: number;
    month: number;
  },
): Promise<{ data: MonthCalendar | null; error: PostgrestError | null }> {
  const range = getMonthRange(params.year, params.month);

  const { data, error } = await listUserRecordsByMonth(supabase, {
    userId: params.userId,
    fromDate: range.fromDate,
    toDate: range.toDate,
  });

  if (error) {
    return { data: null, error };
  }

  const countMap = new Map<string, number>();

  data.forEach((record) => {
    const current = countMap.get(record.record_date) ?? 0;
    countMap.set(record.record_date, current + 1);
  });

  const days = Array.from(countMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    data: {
      monthCount: data.length,
      days,
    },
    error: null,
  };
}

export async function getRecordsByDate(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    date: string;
  },
): Promise<{ data: PoopRecordRow[]; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("poop_records")
    .select("*")
    .eq("user_id", params.userId)
    .eq("record_date", params.date)
    .is("deleted_at", null)
    .order("record_time", { ascending: false });

  return { data: (data ?? []) as PoopRecordRow[], error };
}
