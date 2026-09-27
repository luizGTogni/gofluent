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
let ready: Promise<SupabaseClient | null> | null = null;

/** True when the env vars are set; the app keeps working without them, minus saving. */
export const supabaseConfigured = Boolean(url && key);

/** Returns a client that already has a session, signing in anonymously on first use. */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured) return Promise.resolve(null);
  ready ??= (async () => {
    client ??= createClient(url!, key!);
    const { data } = await client.auth.getSession();
    if (!data.session) {
      const { error } = await client.auth.signInAnonymously();
      if (error) {
        console.error("Supabase anonymous sign-in failed:", error.message);
        ready = null;
        return null;
      }
    }
    return client;
  })();
  return ready;
}
