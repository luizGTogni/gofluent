import { newEventId } from "./ledger";
import { getSupabase } from "./supabase";
import { localDay } from "./streak";
import { TITLES, type Title } from "./titles";

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

// ---------------------------------------------------------------------------------------------
// Friends: requests, the friends list, blocks, search, public profiles and the leaderboard.
// Migration 0030. Every write takes the other player's @username — clients never see a user_id.

export type Relation = "none" | "pending_out" | "pending_in" | "friends" | "self" | "blocked";

/** Index into TITLES, and which third of it (rankOf in src/lib/ranks.ts), from the server's own
 * copy of rp (effectiveRp already applied), since another learner's player_stats isn't readable
 * directly. */
export type RankBadge = { index: number; stars: 1 | 2 | 3 };
export const rankTitle = (r: RankBadge): Title => TITLES[r.index];

export type PlayerCard = {
  username: string;
  trail: string | null;
  halo: string | null;
  rank: RankBadge;
  level: number;
  relation: Relation;
};

export type FriendRow = {
  username: string;
  trail: string | null;
  halo: string | null;
  rank: RankBadge;
  level: number;
  streak: number;
  xpWeek: number;
  activeToday: boolean;
  since: string;
};

export type RequestRow = { username: string; trail: string | null; halo: string | null; requestedAt: string };
export type Requests = { incoming: RequestRow[]; outgoing: RequestRow[] };
export type BlockedRow = { username: string; blockedAt: string };

export type Activity = "today" | "this_week" | "earlier" | null;

/** The full profile a friend (or anyone, if public) sees. */
export type PublicProfile = {
  username: string;
  fullName: string | null;
  bio: string | null;
  trail: string | null;
  halo: string | null;
  rank: RankBadge;
  level: number;
  xp: number;
  streak: number | null;
  bestStreak: number | null;
  cefr: string | null;
  currentPlanet: string | null;
  planetsDone: number;
  badges: { id: string; unlockedAt: string }[];
  personalBests: Record<string, number>;
  memberSince: string;
  lastActive: Activity;
  mutualFriends: number;
  relation: Relation;
  visibility: Visibility;
};

/** What a 'friends'-visibility profile shows a non-friend: the same minimal card search returns. */
export type MinimalProfile = PlayerCard & { visibility: Visibility };

/** True once the fuller shape is there — a 'friends'-visibility profile a non-friend opens comes
 * back as a MinimalProfile instead. */
export const isFullProfile = (p: PublicProfile | MinimalProfile): p is PublicProfile => "xp" in p;

export type LeaderboardPeriod = "week" | "month" | "all";
export type LeaderboardPlayer = {
  username: string;
  trail: string | null;
  halo: string | null;
  isSelf: boolean;
  position: number;
  delta: number | null;
  xp: number;
  level: number;
  streak: number;
  planetsDone: number;
  activeToday: boolean;
  rank: RankBadge;
};
export type Leaderboard = { period: LeaderboardPeriod; periodStart: string | null; players: LeaderboardPlayer[] };

export type RpcResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Any of the friend-request/friend/block mutations below: takes the other player's username. */
export type Action = (username: string) => Promise<RpcResult<{ relation: Relation }>>;

async function callRpc<T>(rpc: string, args: Record<string, unknown> = {}): Promise<RpcResult<T>> {
  const db = await getSupabase();
  if (!db) return { ok: false, error: "Sign in to use this." };
  const { data, error, status } = await db.rpc(rpc, args);
  if (error) return { ok: false, error: status === 0 ? OFFLINE : error.message || "Couldn't do that. Please try again." };
  return { ok: true, data: data as T };
}

export const searchPlayers = (q: string) => callRpc<PlayerCard[]>("search_players", { q });

export const getPublicProfile = (username: string) =>
  callRpc<PublicProfile | MinimalProfile>("get_public_profile", { p_username: username, p_local_day: localDay(new Date()) });

export const sendFriendRequest = (username: string) => callRpc<{ relation: Relation }>("send_friend_request", { p_target: username });
export const cancelFriendRequest = (username: string) => callRpc<{ relation: Relation }>("cancel_friend_request", { p_target: username });
export const acceptFriendRequest = (username: string) => callRpc<{ relation: Relation }>("accept_friend_request", { p_from: username });
export const declineFriendRequest = (username: string) => callRpc<{ relation: Relation }>("decline_friend_request", { p_from: username });
export const removeFriend = (username: string) => callRpc<{ relation: Relation }>("remove_friend", { p_target: username });
export const blockUser = (username: string) => callRpc<{ relation: Relation }>("block_user", { p_target: username });
export const unblockUser = (username: string) => callRpc<{ relation: Relation }>("unblock_user", { p_target: username });

export const listFriends = () => callRpc<FriendRow[]>("list_friends", { p_local_day: localDay(new Date()) });
export const listRequests = () => callRpc<Requests>("list_requests");
export const listBlocked = () => callRpc<BlockedRow[]>("list_blocked");

export const friendsLeaderboard = (period: LeaderboardPeriod, day = localDay(new Date())) =>
  callRpc<Leaderboard>("friends_leaderboard", { p_period: period, p_local_day: day });
