// Server side of the admin routes: acts as the signed-in admin (their JWT), never with a service key,
// so the database's own checks (is_admin, RLS) decide what's allowed.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : undefined;
  } catch {
    return undefined;
  }
})();
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** The admin's client for this request, or the error response to send back. */
export async function adminClient(request: Request): Promise<SupabaseClient | Response> {
  if (!url || !key) return Response.json({ error: "Supabase is not configured" }, { status: 500 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Sign in first" }, { status: 401 });
  const db = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.rpc("is_admin");
  if (error) return Response.json({ error: error.message }, { status: 401 });
  if (data !== true) return Response.json({ error: "Admins only" }, { status: 403 });
  return db;
}
