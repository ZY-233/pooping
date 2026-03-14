export function getSupabaseEnv() {
  // Static NEXT_PUBLIC access is required for client-side bundling.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("Missing required env var: NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!anonKey) {
    throw new Error("Missing required env var: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return { url, anonKey };
}

export function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error("Missing required env var: SUPABASE_SERVICE_ROLE_KEY");
  }

  return key;
}

export function validateRequiredEnv() {
  getSupabaseEnv();
}

export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!raw) {
    return "http://localhost:3000";
  }

  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return normalized.replace(/\/$/, "");
}
