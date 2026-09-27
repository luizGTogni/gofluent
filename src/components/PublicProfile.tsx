"use client";

import { useEffect, useState } from "react";
import {
  acceptFriendRequest,
  blockUser,
  cancelFriendRequest,
  declineFriendRequest,
  friendsLeaderboard,
  getPublicProfile,
  isFullProfile,
  rankTitle,
  removeFriend,
  sendFriendRequest,
  type LeaderboardPlayer,
  type MinimalProfile,
  type PublicProfile as PublicProfileData,
  type Relation,
  type RpcResult,
} from "@/lib/social";
import { ACHIEVEMENT_BY_ID } from "@/lib/achievements";
import { levelProgress } from "@/lib/xp";
import { ArrowLeft, MoreHorizontal, Orbit, UserCheck, UserPlus, UserX } from "./icons";
import { Medal } from "./icons/Medal";
import { Stars } from "./icons/Stars";

type Props = { username: string; onBack: () => void };

const ACTIVITY_LABEL: Record<string, string> = { today: "Active today", this_week: "Active this week", earlier: "Away for a while" };
const MODE_LABEL: Record<string, string> = { classic: "Classic", timeAttack: "Time Attack", survival: "Survival", storm: "Solar Storm", blind: "Eclipse" };

export function PublicProfile({ username, onBack }: Props) {
  const [profile, setProfile] = useState<PublicProfileData | MinimalProfile | null | "error">(null);
  const [compare, setCompare] = useState<{ me: LeaderboardPlayer; them: LeaderboardPlayer } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState<"unfriend" | "block" | null>(null);

  const load = () => {
    setProfile(null);
    setMenuOpen(false);
    setConfirming(null);
    getPublicProfile(username).then((r) => setProfile(r.ok ? r.data : "error"));
  };

  useEffect(load, [username]);

  useEffect(() => {
    setCompare(null);
    if (profile === null || profile === "error" || profile.relation !== "friends") return;
    friendsLeaderboard("week").then((r) => {
      if (!r.ok) return;
      const me = r.data.players.find((p) => p.isSelf);
      const them = r.data.players.find((p) => p.username === username);
      if (me && them) setCompare({ me, them });
    });
  }, [profile, username]);

  const act = async (fn: () => Promise<RpcResult<{ relation: Relation }>>) => {
    setBusy(true);
    setError(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) return setError(r.error);
    load();
  };

  if (profile === null) return <p className="muted">Loading…</p>;
  if (profile === "error")
    return (
      <main className="shell center profile">
        <div className="profile-topbar">
          <button type="button" className="link icon-text" onClick={onBack}>
            <ArrowLeft /> Back
          </button>
        </div>
        <p className="muted profile-note">This profile isn't available.</p>
      </main>
    );

  const full = isFullProfile(profile);
  const title = rankTitle(profile.rank);
  const lvl = full ? levelProgress(profile.xp) : null;

  return (
    <main className="shell center profile">
      <div className="profile-topbar">
        <button type="button" className="link icon-text" onClick={onBack}>
          <ArrowLeft /> Back
        </button>
      </div>

      <div className="profile-head">
        <div>
          <h1 className="profile-title">@{profile.username}</h1>
          {full && profile.fullName && <p className="muted">{profile.fullName}</p>}
        </div>
        {profile.relation !== "self" && (
          <ProfileMenu
            relation={profile.relation}
            busy={busy}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
            confirming={confirming}
            setConfirming={setConfirming}
            onSend={() => act(() => sendFriendRequest(username))}
            onCancel={() => act(() => cancelFriendRequest(username))}
            onAccept={() => act(() => acceptFriendRequest(username))}
            onDecline={() => act(() => declineFriendRequest(username))}
            onUnfriend={() => act(() => removeFriend(username))}
            onBlock={() => act(() => blockUser(username))}
          />
        )}
      </div>

      {error && <p className="auth-error">{error}</p>}

      <div className="profile-grid">
        <div className="profile-col">
          <section className="profile-card">
            <div className="profile-card-head">
              <b>
                {title.name} <Stars n={profile.rank.stars} />
              </b>
              <span className="muted">Level {profile.level}</span>
            </div>
            {lvl && (
              <div className="xpbar" aria-hidden>
                <span style={{ width: `${lvl.pct}%` }} />
              </div>
            )}
            {full && (
              <p className="muted profile-note">
                {profile.streak !== null && `${profile.streak} day streak (best ${profile.bestStreak})`}
                {profile.streak !== null && profile.lastActive && " · "}
                {profile.lastActive && ACTIVITY_LABEL[profile.lastActive]}
              </p>
            )}
          </section>

          {full && profile.bio && (
            <section className="profile-card">
              <p className="profile-note">{profile.bio}</p>
            </section>
          )}

          {full && (
            <section className="profile-card">
              <div className="profile-card-head">
                <b>Estimated English level</b>
                <span className="chip-cefr">{profile.cefr ?? "—"}</span>
              </div>
              <p className="muted profile-note">
                {profile.planetsDone} planet{profile.planetsDone === 1 ? "" : "s"} completed
                {profile.currentPlanet ? ` · now on ${profile.currentPlanet}` : ""}
              </p>
            </section>
          )}

          {compare && (
            <section className="profile-card">
              <div className="profile-card-head">
                <b>You vs @{username}</b>
              </div>
              <div className="compare-row">
                <span>XP this week</span>
                <span className={compare.me.xp >= compare.them.xp ? "compare-lead" : ""}>{compare.me.xp}</span>
                <span className={compare.them.xp >= compare.me.xp ? "compare-lead" : ""}>{compare.them.xp}</span>
              </div>
              <div className="compare-row">
                <span>Streak</span>
                <span className={compare.me.streak >= compare.them.streak ? "compare-lead" : ""}>{compare.me.streak}</span>
                <span className={compare.them.streak >= compare.me.streak ? "compare-lead" : ""}>{compare.them.streak}</span>
              </div>
              <div className="compare-row">
                <span>Planets</span>
                <span className={compare.me.planetsDone >= compare.them.planetsDone ? "compare-lead" : ""}>{compare.me.planetsDone}</span>
                <span className={compare.them.planetsDone >= compare.me.planetsDone ? "compare-lead" : ""}>{compare.them.planetsDone}</span>
              </div>
            </section>
          )}
        </div>

        <div className="profile-col">
          {full && (
            <>
              <section className="profile-card">
                <div className="profile-card-head">
                  <b>About</b>
                </div>
                <p className="muted profile-note">Member since {new Date(profile.memberSince).toLocaleDateString()}</p>
                <p className="muted profile-note">
                  {profile.mutualFriends} mutual friend{profile.mutualFriends === 1 ? "" : "s"}
                </p>
              </section>

              {Object.keys(profile.personalBests).length > 0 && (
                <section className="profile-card">
                  <div className="profile-card-head">
                    <b>Personal bests</b>
                  </div>
                  <div className="social-list">
                    {Object.entries(profile.personalBests).map(([mode, score]) => (
                      <div key={mode} className="compare-row">
                        <span className="muted">{MODE_LABEL[mode] ?? mode}</span>
                        <span>{score}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {profile.badges.length > 0 && (
                <section className="profile-card">
                  <div className="profile-card-head">
                    <b>Achievements</b>
                  </div>
                  <div className="end-badges">
                    {profile.badges
                      .map((b) => ACHIEVEMENT_BY_ID.get(b.id))
                      .filter((d) => d !== undefined)
                      .slice(0, 8)
                      .map((d) => (
                        <span key={d.id} className="end-badge" title={d.description}>
                          <Medal icon={d.icon} rarity={d.rarity} /> {d.name}
                        </span>
                      ))}
                  </div>
                </section>
              )}
            </>
          )}

          {!full && (
            <section className="profile-card">
              <p className="muted profile-note icon-text">
                <Orbit size="sm" /> This profile is only fully visible to friends.
              </p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

type MenuProps = {
  relation: Relation;
  busy: boolean;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  confirming: "unfriend" | "block" | null;
  setConfirming: (v: "unfriend" | "block" | null) => void;
  onSend: () => void;
  onCancel: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onUnfriend: () => void;
  onBlock: () => void;
};

function ProfileMenu({ relation, busy, menuOpen, setMenuOpen, confirming, setConfirming, onSend, onCancel, onAccept, onDecline, onUnfriend, onBlock }: MenuProps) {
  if (confirming === "unfriend")
    return (
      <div className="settings-confirm">
        <p className="profile-note">You'll stop being friends. They won't be notified, and you can send a request again later.</p>
        <div className="settings-actions">
          <button type="button" className="check settings-small" disabled={busy} onClick={onUnfriend}>
            Unfriend
          </button>
          <button type="button" className="link" onClick={() => setConfirming(null)}>
            Keep as friends
          </button>
        </div>
      </div>
    );
  if (confirming === "block")
    return (
      <div className="settings-confirm">
        <p className="profile-note">Blocking removes any friendship and stops either of you from finding or messaging the other again.</p>
        <div className="settings-actions">
          <button type="button" className="check settings-small" disabled={busy} onClick={onBlock}>
            Block
          </button>
          <button type="button" className="link" onClick={() => setConfirming(null)}>
            Cancel
          </button>
        </div>
      </div>
    );

  if (relation === "friends")
    return (
      <div className="profile-menu">
        <button type="button" className="link icon-text" onClick={() => setMenuOpen(!menuOpen)} aria-haspopup="menu" aria-expanded={menuOpen}>
          <UserCheck /> Friends <MoreHorizontal />
        </button>
        {menuOpen && (
          <div className="profile-menu-panel" role="menu">
            <button type="button" role="menuitem" onClick={() => setConfirming("unfriend")}>
              Unfriend
            </button>
            <button type="button" role="menuitem" onClick={() => setConfirming("block")}>
              Block
            </button>
            <button type="button" role="menuitem" disabled title="Coming soon">
              Report
            </button>
          </div>
        )}
      </div>
    );

  if (relation === "pending_out")
    return (
      <button type="button" className="check ghost settings-small" disabled={busy} onClick={onCancel}>
        Cancel request
      </button>
    );

  if (relation === "pending_in")
    return (
      <span className="social-actions">
        <button type="button" className="check settings-small" disabled={busy} onClick={onAccept}>
          Accept
        </button>
        <button type="button" className="check ghost settings-small icon-text" disabled={busy} onClick={onDecline}>
          <UserX /> Decline
        </button>
      </span>
    );

  return (
    <div className="profile-menu">
      <button type="button" className="check settings-small icon-text" disabled={busy} onClick={onSend}>
        <UserPlus /> Add friend
      </button>
      <button type="button" className="link icon-text" onClick={() => setMenuOpen(!menuOpen)} aria-haspopup="menu" aria-expanded={menuOpen}>
        <MoreHorizontal />
      </button>
      {menuOpen && (
        <div className="profile-menu-panel" role="menu">
          <button type="button" role="menuitem" onClick={() => setConfirming("block")}>
            Block
          </button>
          <button type="button" role="menuitem" disabled title="Coming soon">
            Report
          </button>
        </div>
      )}
    </div>
  );
}
