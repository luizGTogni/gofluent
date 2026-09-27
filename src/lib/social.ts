import { newEventId } from "./ledger";
import { getSupabase } from "./supabase";

// The learner's own privacy settings and public fields. Reading them is a plain select (profiles
// is readable by its owner); writing goes through the RPCs in migration 0021.

export type Visibility = "public" | "friends" | "private";
export type AllowRequests = "everyone" | "nobody";

export type ProfileSettings = {
  visibility: Visibility;
  showFullName: boolean;
  showActivity: boolean;
  allowRequests: AllowRequests;
  bio: string | null;
  friendCode: string;
};

export const BIO_MAX = 140;

export type SettingsResult = { ok: true; settings: ProfileSettings } | { ok: false; error: string };

type Row = {
  visibility: Visibility;
  show_full_name: boolean;
  show_activity: boolean;
  allow_requests: AllowRequests;
  bio: string | null;
  friend_code: string;
};

const OFFLINE = "You're offline. Try again when you're back online.";

export async function getProfileSettings(): Promise<ProfileSettings | null> {
  const db = await getSupabase();
  if (!db) return null;
  const { data } = await db.from("profiles").select("visibility, show_full_name, show_activity, allow_requests, bio, friend_code").maybeSingle<Row>();
  if (!data) return null;
  return {
    visibility: data.visibility,
    showFullName: data.show_full_name,
    showActivity: data.show_activity,
    allowRequests: data.allow_requests,
    bio: data.bio,
    friendCode: data.friend_code,
  };
}

async function call(rpc: string, args: Record<string, unknown>, retry = false): Promise<SettingsResult> {
  const db = await getSupabase();
  if (!db) return { ok: false, error: "Sign in to change these settings." };
  let res = await db.rpc(rpc, args);
  // Both RPCs are safe to repeat (absolute values, or the same event id), so one retry is too.
  if (res.error && res.status === 0 && retry) res = await db.rpc(rpc, args);
  if (res.error) return { ok: false, error: res.status === 0 ? OFFLINE : "Couldn't save that. Please try again." };
  return { ok: true, settings: res.data as ProfileSettings };
}

export function saveProfileSettings(s: Omit<ProfileSettings, "friendCode">): Promise<SettingsResult> {
  const bio = s.bio?.trim().replace(/\s+/g, " ") ?? "";
  if (bio.length > BIO_MAX) return Promise.resolve({ ok: false, error: `Keep your bio to ${BIO_MAX} characters.` });
  return call(
    "update_profile_settings",
    {
      p_visibility: s.visibility,
      p_show_full_name: s.showFullName,
      p_show_activity: s.showActivity,
      p_allow_requests: s.allowRequests,
      p_bio: bio,
    },
    true,
  );
}

/** A new friend code; the old one stops working. */
export function regenerateFriendCode(): Promise<SettingsResult> {
  return call("regenerate_friend_code", { p_event_id: newEventId() }, true);
}
