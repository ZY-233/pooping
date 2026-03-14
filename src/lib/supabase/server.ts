import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv, getSupabaseServiceRoleKey } from "@/lib/env";
import type { Database } from "@/types/database";

export function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseEnv();

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createSupabaseAdminClient() {
  const { url } = getSupabaseEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
