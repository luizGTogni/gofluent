import { syncLocalReview } from "./reviewStore";
import { getPublicClient, getSupabase } from "./supabase";
import { syncLocalWordStats } from "./wordStore";

export type Account = { email: string };
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

/** The signed-in account, or null for a guest. */
export async function getAccount(): Promise<Account | null> {
  const db = await getSupabase();
  if (!db) return null;
  const { data } = await db.auth.getUser();
  return data.user?.email ? { email: data.user.email } : null;
}

/** Creates an account and uploads the progress this device tracked as a guest. */
export async function createAccount(email: string, password: string): Promise<AuthResult> {
  const db = getPublicClient();
  if (!db) return { ok: false, error: "Accounts aren't set up yet." };
  if (password.length < MIN_PASSWORD) return { ok: false, error: `Use at least ${MIN_PASSWORD} characters.` };
  const { data, error } = await db.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
  if (error) return { ok: false, error: friendly(error.message) };
  if (!data.session) return { ok: true, message: `Almost there. We sent a confirmation link to ${email}. Confirm it, then sign in.` };
  await Promise.all([syncLocalReview(), syncLocalWordStats()]);
  return { ok: true, message: "Your account is ready. Progress from this device is saved to it." };
}

/** Switches to an existing account. This device's guest progress is not merged into it. */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  const db = getPublicClient();
  if (!db) return { ok: false, error: "Accounts aren't set up yet." };
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: friendly(error.message) };
  clearLocalCaches();
  return { ok: true, message: "Welcome back." };
}

export async function signOut(): Promise<void> {
  await getPublicClient()?.auth.signOut();
  clearLocalCaches();
}
