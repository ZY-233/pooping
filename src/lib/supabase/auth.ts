import type { User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export async function ensureClientUser(): Promise<{
  user: User | null;
  errorMessage: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const current = await supabase.auth.getUser();

  if (current.error) {
    return { user: null, errorMessage: current.error.message };
  }

  if (current.data.user) {
    return { user: current.data.user, errorMessage: null };
  }

  const anonymous = await supabase.auth.signInAnonymously();

  if (anonymous.error) {
    return {
      user: null,
      errorMessage:
        "匿名登录失败，请在 Supabase Auth 中开启 Anonymous sign-ins 后重试。",
    };
  }

  return { user: anonymous.data.user, errorMessage: null };
}
