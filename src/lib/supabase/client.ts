"use client";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

let browserClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const { url, anonKey } = getSupabaseEnv();
  browserClient = createClient<Database>(url, anonKey);
  return browserClient;
}
