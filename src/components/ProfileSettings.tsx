"use client";

import { useEffect, useState } from "react";
import {
  BIO_MAX,
  getProfileSettings,
  regenerateFriendCode,
  saveProfileSettings,
  type AllowRequests,
  type ProfileSettings as Settings,
  type Visibility,
} from "@/lib/social";
import { ArrowLeft, Check, Lock, Refresh } from "./icons";

type Props = { onBack: () => void };

const VISIBILITY: { value: Visibility; label: string; note: string }[] = [
  { value: "public", label: "Everyone", note: "Anyone with your username or friend code can open your profile." },
  { value: "friends", label: "Friends", note: "Only people you've accepted as friends." },
  { value: "private", label: "Only me", note: "Nobody else can open your profile." },
];

const REQUESTS: { value: AllowRequests; label: string; note: string }[] = [
  { value: "everyone", label: "Anyone", note: "Anyone who finds you can send a request." },
  { value: "nobody", label: "Nobody", note: "Nobody can send you new requests. Your friends stay." },
];

type Draft = Omit<Settings, "friendCode">;

const sameDraft = (a: Draft, b: Draft) =>
  a.visibility === b.visibility &&
  a.showFullName === b.showFullName &&
  a.showActivity === b.showActivity &&
  a.allowRequests === b.allowRequests &&
  (a.bio ?? "").trim() === (b.bio ?? "").trim();

export function ProfileSettings({ onBack }: Props) {
  const [saved, setSaved] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmNewCode, setConfirmNewCode] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getProfileSettings().then((s) => {
      setSaved(s);
      setDraft(s);
      setLoading(false);
    });
  }, []);

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setStatus(null);
  };

  const dirty = Boolean(saved && draft && !sameDraft(saved, draft));
  const bioLength = draft?.bio?.length ?? 0;

  const save = async () => {
    if (!draft || busy) return;
    setBusy(true);
    const r = await saveProfileSettings(draft);
    setBusy(false);
    if (!r.ok) return setStatus({ ok: false, text: r.error });
    setSaved(r.settings);
    setDraft(r.settings);
    setStatus({ ok: true, text: "Saved." });
  };

  const newCode = async () => {
    if (busy) return;
    setBusy(true);
    const r = await regenerateFriendCode();
    setBusy(false);
    setConfirmNewCode(false);
    if (!r.ok) return setStatus({ ok: false, text: r.error });
    setSaved((s) => (s ? { ...s, friendCode: r.settings.friendCode } : s));
    setCopied(false);
  };

  const copy = async () => {
    if (!saved) return;
    try {
      await navigator.clipboard.writeText(saved.friendCode);
      setCopied(true);
    } catch {
      /* the code stays on screen to copy by hand */
    }
  };

  return (
    <main className="shell center profile">
      <div className="profile-topbar">
        <button type="button" className="link icon-text" onClick={onBack}>
          <ArrowLeft /> Back
        </button>
      </div>

      <h1 className="profile-title settings-title icon-text">
        <Lock /> Profile &amp; privacy
      </h1>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : !saved || !draft ? (
        <p className="muted">Sign in to choose who can see your profile.</p>
      ) : (
        <div className="profile-grid">
          <div className="profile-col">
            <section className="profile-card">
              <div className="profile-card-head">
                <b>
                  <label htmlFor="settings-bio">Bio</label>
                </b>
                <span className={`muted settings-count ${bioLength > BIO_MAX ? "over" : ""}`}>
                  {bioLength}/{BIO_MAX}
                </span>
              </div>
              <textarea
                id="settings-bio"
                className="settings-bio"
                rows={3}
                maxLength={BIO_MAX}
                placeholder="A line about you and why you're learning English"
                value={draft.bio ?? ""}
                onChange={(e) => set({ bio: e.target.value.replace(/\n/g, " ") })}
              />
            </section>

            <section className="profile-card">
              <div className="profile-card-head">
                <b>Friend code</b>
              </div>
              <div className="settings-code-row">
                <code className="settings-code">{saved.friendCode}</code>
                <button type="button" className="check ghost settings-small" onClick={copy}>
                  {copied ? (
                    <span className="icon-text">
                      <Check /> Copied
                    </span>
                  ) : (
                    "Copy"
                  )}
                </button>
              </div>
              <p className="muted profile-note">Share it with someone so they can add you as a friend.</p>
              {confirmNewCode ? (
                <div className="settings-confirm">
                  <p className="profile-note">Your current code will stop working. Anyone who has it won't be able to add you with it.</p>
                  <div className="settings-actions">
                    <button type="button" className="check settings-small" onClick={newCode} disabled={busy}>
                      Make a new code
                    </button>
                    <button type="button" className="link" onClick={() => setConfirmNewCode(false)}>
                      Keep this one
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="link icon-text settings-left" onClick={() => setConfirmNewCode(true)}>
                  <Refresh /> New code
                </button>
              )}
            </section>
          </div>

          <div className="profile-col">
            <fieldset className="profile-card settings-group">
              <legend className="settings-legend">Who can see your profile</legend>
              {VISIBILITY.map((o) => (
                <label key={o.value} className={`settings-option ${draft.visibility === o.value ? "on" : ""}`}>
                  <input type="radio" name="visibility" checked={draft.visibility === o.value} onChange={() => set({ visibility: o.value })} />
                  <span>
                    <b>{o.label}</b>
                    <span className="muted profile-note">{o.note}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <fieldset className="profile-card settings-group">
              <legend className="settings-legend">What they see</legend>
              <p className="muted profile-note">Your @username, rank, level and badges are always on your profile.</p>
              <label className="settings-option">
                <input type="checkbox" checked={draft.showFullName} onChange={(e) => set({ showFullName: e.target.checked })} />
                <span>
                  <b>Full name</b>
                  <span className="muted profile-note">Show your name next to your @username.</span>
                </span>
              </label>
              <label className="settings-option">
                <input type="checkbox" checked={draft.showActivity} onChange={(e) => set({ showActivity: e.target.checked })} />
                <span>
                  <b>Activity</b>
                  <span className="muted profile-note">Show your streak and when you last studied.</span>
                </span>
              </label>
            </fieldset>

            <fieldset className="profile-card settings-group">
              <legend className="settings-legend">Friend requests</legend>
              {REQUESTS.map((o) => (
                <label key={o.value} className={`settings-option ${draft.allowRequests === o.value ? "on" : ""}`}>
                  <input type="radio" name="requests" checked={draft.allowRequests === o.value} onChange={() => set({ allowRequests: o.value })} />
                  <span>
                    <b>{o.label}</b>
                    <span className="muted profile-note">{o.note}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="settings-actions">
              <button type="button" className="check" onClick={save} disabled={busy || !dirty || bioLength > BIO_MAX}>
                {busy ? "…" : "Save changes"}
              </button>
              <p className={status?.ok ? "settings-ok icon-text" : "auth-error"} role="status">
                {status?.ok && <Check />}
                {status?.text ?? " "}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
