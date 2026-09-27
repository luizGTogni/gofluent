"use client";

import { useEffect, useState } from "react";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  getProfileSettings,
  listFriends,
  listRequests,
  rankTitle,
  searchPlayers,
  sendFriendRequest,
  type Action,
  type FriendRow,
  type PlayerCard,
  type Requests,
} from "@/lib/social";
import { ArrowLeft, Check, Orbit, Search, Trophy, UserCheck, UserPlus, Users, UserX } from "./icons";
import { Stars } from "./icons/Stars";

type Tab = "friends" | "requests" | "search";
type Sort = "xp" | "streak" | "name";

type Props = {
  onBack: () => void;
  onOpenProfile: (username: string) => void;
  onLeaderboard: () => void;
  /** A friend code carried in from an invite link, to drop straight into the search box. */
  initialQuery?: string | null;
};

const TABS: { value: Tab; label: string }[] = [
  { value: "friends", label: "Friends" },
  { value: "requests", label: "Requests" },
  { value: "search", label: "Add" },
];

const SORTS: { value: Sort; label: string }[] = [
  { value: "xp", label: "XP this week" },
  { value: "streak", label: "Streak" },
  { value: "name", label: "Name" },
];

const sortFriends = (rows: FriendRow[], sort: Sort) =>
  [...rows].sort((a, b) =>
    sort === "xp" ? b.xpWeek - a.xpWeek : sort === "streak" ? b.streak - a.streak : a.username.localeCompare(b.username),
  );

export function Friends({ onBack, onOpenProfile, onLeaderboard, initialQuery }: Props) {
  const [tab, setTab] = useState<Tab>(initialQuery ? "search" : "friends");
  const [sort, setSort] = useState<Sort>("xp");
  const [friends, setFriends] = useState<FriendRow[] | null>(null);
  const [requests, setRequests] = useState<Requests | null>(null);
  const [friendCode, setFriendCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [results, setResults] = useState<PlayerCard[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFriends = () => listFriends().then((r) => setFriends(r.ok ? r.data : []));
  const loadRequests = () => listRequests().then((r) => setRequests(r.ok ? r.data : { incoming: [], outgoing: [] }));

  useEffect(() => {
    loadFriends();
    loadRequests();
    getProfileSettings().then((s) => setFriendCode(s?.friendCode ?? null));
  }, []);

  const search = async (q: string) => {
    setQuery(q);
    setError(null);
    if (q.trim().length < 3) return setResults(null);
    setSearching(true);
    const r = await searchPlayers(q.trim());
    setSearching(false);
    if (r.ok) setResults(r.data);
  };

  useEffect(() => {
    if (initialQuery) search(initialQuery);
    // Runs once, from the invite link that opened this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshAll = () => {
    loadFriends();
    loadRequests();
    if (query.trim().length >= 3) search(query);
  };

  const act = async (username: string, fn: Action) => {
    setBusy(username);
    setError(null);
    const r = await fn(username);
    setBusy(null);
    if (!r.ok) return setError(r.error);
    refreshAll();
  };

  const copyCode = async () => {
    if (!friendCode) return;
    try {
      await navigator.clipboard.writeText(friendCode);
      setCopied(true);
    } catch {
      /* the code stays on screen to copy by hand */
    }
  };

  const shareCode = async () => {
    if (!friendCode) return;
    const url = `${window.location.origin}/?add=${friendCode}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "GoFluent", text: `Add me on GoFluent — my code is ${friendCode}`, url });
      } catch {
        /* the person cancelled the share sheet */
      }
    } else {
      await copyCode();
    }
  };

  return (
    <main className="shell center profile">
      <div className="profile-topbar">
        <button type="button" className="link icon-text" onClick={onBack}>
          <ArrowLeft /> Back
        </button>
        <button type="button" className="link icon-text" onClick={onLeaderboard}>
          <Trophy /> Leaderboard
        </button>
      </div>

      <h1 className="profile-title icon-text">
        <Users /> Friends
      </h1>

      <div className="social-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.value} type="button" role="tab" aria-selected={tab === t.value} className={`social-tab ${tab === t.value ? "on" : ""}`} onClick={() => setTab(t.value)}>
            {t.label}
            {t.value === "requests" && requests && requests.incoming.length > 0 ? <span className="social-badge">{requests.incoming.length}</span> : null}
          </button>
        ))}
      </div>

      {error && <p className="auth-error">{error}</p>}

      {tab === "friends" &&
        (friends === null ? (
          <p className="muted">Loading…</p>
        ) : friends.length === 0 ? (
          <section className="profile-card">
            <p className="profile-note">No friends yet — invite someone with your code.</p>
            {friendCode && <FriendCodeShare code={friendCode} copied={copied} onCopy={copyCode} onShare={shareCode} />}
          </section>
        ) : (
          <>
            <div className="social-tabs">
              {SORTS.map((s) => (
                <button key={s.value} type="button" className={`social-tab ${sort === s.value ? "on" : ""}`} onClick={() => setSort(s.value)}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="social-list">
              {sortFriends(friends, sort).map((f) => (
                <button key={f.username} type="button" className="social-row" onClick={() => onOpenProfile(f.username)}>
                  {f.activeToday && <span className="social-dot" title="Studied today" aria-label="Studied today" />}
                  <span className="social-row-name">
                    @{f.username} <Stars n={f.rank.stars} />
                    <span className="muted social-row-meta icon-text">
                      {rankTitle(f.rank).name} · Level {f.level} · <Orbit size="sm" /> {f.streak}
                    </span>
                  </span>
                  <span className="muted lb-xp">{f.xpWeek} XP</span>
                </button>
              ))}
            </div>
          </>
        ))}

      {tab === "requests" && requests && (
        <div className="social-list">
          <h2 className="settings-legend">Incoming</h2>
          {requests.incoming.length === 0 ? (
            <p className="muted profile-note">Nothing pending.</p>
          ) : (
            requests.incoming.map((r) => (
              <div key={r.username} className="social-row social-row-actions">
                <button type="button" className="social-row-name link" onClick={() => onOpenProfile(r.username)}>
                  @{r.username}
                </button>
                <span className="social-actions">
                  <button type="button" className="check settings-small" disabled={busy === r.username} onClick={() => act(r.username, acceptFriendRequest)}>
                    Accept
                  </button>
                  <button type="button" className="check ghost settings-small" disabled={busy === r.username} onClick={() => act(r.username, declineFriendRequest)}>
                    Decline
                  </button>
                </span>
              </div>
            ))
          )}
          <h2 className="settings-legend">Sent</h2>
          {requests.outgoing.length === 0 ? (
            <p className="muted profile-note">Nothing sent.</p>
          ) : (
            requests.outgoing.map((r) => (
              <div key={r.username} className="social-row social-row-actions">
                <button type="button" className="social-row-name link" onClick={() => onOpenProfile(r.username)}>
                  @{r.username}
                </button>
                <button type="button" className="check ghost settings-small" disabled={busy === r.username} onClick={() => act(r.username, cancelFriendRequest)}>
                  Cancel
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "search" && (
        <div className="social-list">
          {friendCode && <FriendCodeShare code={friendCode} copied={copied} onCopy={copyCode} onShare={shareCode} />}
          <label className="settings-code-row social-search">
            <Search />
            <input type="text" placeholder="@username or friend code" value={query} onChange={(e) => search(e.target.value)} autoComplete="off" className="social-search-input" />
          </label>
          {query.trim().length > 0 && query.trim().length < 3 ? (
            <p className="muted profile-note">Keep typing — at least 3 characters.</p>
          ) : searching ? (
            <p className="muted">Searching…</p>
          ) : results && results.length === 0 ? (
            <p className="muted profile-note">Nobody found — double-check the @username or code.</p>
          ) : (
            results?.map((p) => (
              <div key={p.username} className="social-row social-row-actions">
                <button type="button" className="social-row-name link" onClick={() => onOpenProfile(p.username)}>
                  @{p.username} <Stars n={p.rank.stars} />
                </button>
                <RelationAction username={p.username} relation={p.relation} busy={busy === p.username} act={act} />
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}

function FriendCodeShare({ code, copied, onCopy, onShare }: { code: string; copied: boolean; onCopy: () => void; onShare: () => void }) {
  return (
    <div className="settings-code-row">
      <span className="muted">My code</span>
      <code className="settings-code">{code}</code>
      <button type="button" className="check ghost settings-small" onClick={onCopy}>
        {copied ? (
          <span className="icon-text">
            <Check /> Copied
          </span>
        ) : (
          "Copy"
        )}
      </button>
      <button type="button" className="check settings-small" onClick={onShare}>
        Share invite
      </button>
    </div>
  );
}

function RelationAction({ username, relation, busy, act }: { username: string; relation: PlayerCard["relation"]; busy: boolean; act: (username: string, fn: Action) => void }) {
  if (relation === "friends")
    return (
      <span className="muted icon-text social-row-status">
        <UserCheck /> Friends
      </span>
    );
  if (relation === "pending_out")
    return (
      <button type="button" className="check ghost settings-small" disabled={busy} onClick={() => act(username, cancelFriendRequest)}>
        Cancel
      </button>
    );
  if (relation === "pending_in")
    return (
      <span className="social-actions">
        <button type="button" className="check settings-small" disabled={busy} onClick={() => act(username, acceptFriendRequest)}>
          Accept
        </button>
        <button type="button" className="check ghost settings-small" disabled={busy} onClick={() => act(username, declineFriendRequest)} title="Decline">
          <UserX />
        </button>
      </span>
    );
  return (
    <button type="button" className="check settings-small icon-text" disabled={busy} onClick={() => act(username, sendFriendRequest)}>
      <UserPlus /> Add
    </button>
  );
}
