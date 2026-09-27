import { getPublicClient, getSupabase } from "./supabase";

export type Account = { email: string };
export type AuthResult = { ok: true; signedIn: boolean; message?: string } | { ok: false; error: string };

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
  if (m.includes("database error")) return "That username or email is already in use.";
  return message;
};

/** The signed-in account, or null for a guest. */
export async function getAccount(): Promise<Account | null> {
  const db = await getSupabase();
  if (!db) return null;
  const { data } = await db.auth.getUser();
  return data.user?.email ? { email: data.user.email } : null;
}

export type SignupInput = { fullName: string; username: string; email: string; password: string; confirm: string };

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

/** Client-side checks with friendly messages; returns null when the input is fine. */
export function validateSignup(i: SignupInput): string | null {
  if (i.fullName.trim().length < 2) return "Please enter your full name.";
  if (!USERNAME_RE.test(i.username.trim().toLowerCase()))
    return "Username: 3 to 20 characters, using letters, numbers and underscores.";
  if (!/^\S+@\S+\.\S+$/.test(i.email.trim())) return "Please enter a valid email.";
  if (i.password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (i.password !== i.confirm) return "The passwords don't match.";
  return null;
}

/** Creates an account with a profile. With email confirmation on there is no session yet, so signedIn is false. */
export async function createAccount(i: SignupInput): Promise<AuthResult> {
  const db = getPublicClient();
  if (!db) return { ok: false, error: "Accounts aren't set up yet." };
  const invalid = validateSignup(i);
  if (invalid) return { ok: false, error: invalid };

  const username = i.username.trim().toLowerCase();
  const taken = await db.rpc("username_available", { name: username });
  if (taken.error) return { ok: false, error: "Couldn't check that username. Please try again." };
  if (!taken.data) return { ok: false, error: "That username is already taken." };

  const email = i.email.trim();
  const { data, error } = await db.auth.signUp({
    email,
    password: i.password,
    options: { emailRedirectTo: window.location.origin, data: { full_name: i.fullName.trim(), username } },
  });
  if (error) return { ok: false, error: friendly(error.message) };
  if (!data.session) return { ok: true, signedIn: false, message: `Almost there. We sent a confirmation link to ${email}. Confirm it, then sign in.` };
  return { ok: true, signedIn: true };
}

export type Profile = { username: string; fullName: string };

export async function getProfile(): Promise<Profile | null> {
  const db = await getSupabase();
  if (!db) return null;
  const { data } = await db.from("profiles").select("username, full_name").maybeSingle();
  return data ? { username: data.username, fullName: data.full_name } : null;
}

/** Signs in to an existing account. */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  const db = getPublicClient();
  if (!db) return { ok: false, error: "Accounts aren't set up yet." };
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: friendly(error.message) };
  clearLocalCaches();
  return { ok: true, signedIn: true };
}

export async function signOut(): Promise<void> {
  await getPublicClient()?.auth.signOut();
  clearLocalCaches();
}
