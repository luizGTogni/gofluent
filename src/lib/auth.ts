import { getSupabase, resetSession } from "./supabase";

export type Account = { email: string | null; isAnonymous: boolean; pendingEmail: string | null };
export type AuthResult = { ok: true; message?: string } | { ok: false; error: string };

export const MIN_PASSWORD = 8;

// Progress caches in localStorage belong to whoever is signed in; drop them when that changes.
const clearLocalCaches = () => {
  try {
    ["gofluent:review", "gofluent:words"].forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
};

const friendly = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match.";
  if (m.includes("already") && m.includes("registered")) return "That email already has an account. Try signing in.";
  if (m.includes("rate limit")) return "Too many attempts. Please wait a bit and try again.";
  if (m.includes("password") && m.includes("characters")) return `Use at least ${MIN_PASSWORD} characters.`;
  if (m.includes("same") && m.includes("password")) return "Choose a different password.";
  return message;
};

export async function getAccount(): Promise<Account | null> {
  const db = await getSupabase();
  if (!db) return null;
  const { data } = await db.auth.getUser();
  if (!data.user) return null;
  return {
    email: data.user.email ?? null,
    isAnonymous: Boolean(data.user.is_anonymous),
    pendingEmail: data.user.new_email ?? null,
  };
}

/** Turns the current guest into a real account. Everything already saved stays with them. */
export async function createAccount(email: string, password: string): Promise<AuthResult> {
  const db = await getSupabase();
  if (!db) return { ok: false, error: "Accounts aren't set up yet." };
  if (password.length < MIN_PASSWORD) return { ok: false, error: `Use at least ${MIN_PASSWORD} characters.` };
  const { data, error } = await db.auth.updateUser({ email, password }, { emailRedirectTo: window.location.origin });
  if (error) return { ok: false, error: friendly(error.message) };
  return data.user?.new_email
    ? { ok: true, message: `Almost there. We sent a confirmation link to ${email}.` }
    : { ok: true, message: "Your account is ready. Your progress is saved." };
}

/** Switches to an existing account. This device's guest progress is not merged into it. */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  const db = await getSupabase();
  if (!db) return { ok: false, error: "Accounts aren't set up yet." };
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: friendly(error.message) };
  clearLocalCaches();
  resetSession();
  return { ok: true, message: "Welcome back." };
}

export async function signOut(): Promise<void> {
  const db = await getSupabase();
  await db?.auth.signOut();
  clearLocalCaches();
  resetSession();
}
