import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Accept the project URL even if pasted with a path such as /rest/v1/.
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const url = (() => {
  try {
    return rawUrl ? new URL(rawUrl).origin : undefined;
  } catch {
    return undefined;
  }
})();
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/** True when the env vars are set; the app keeps working without them, minus accounts and saving. */
export const supabaseConfigured = Boolean(url && key);

/** Client without needing a session: enough for public, read-only content and for signing in. */
export function getPublicClient(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  client ??= createClient(url!, key!);
  return client;
}

/** The client only when someone is signed in; null for guests, who keep progress on the device. */
export async function getSupabase(): Promise<SupabaseClient | null> {
  const db = getPublicClient();
  if (!db) return null;
  const { data } = await db.auth.getSession();
  return data.session ? db : null;
}
