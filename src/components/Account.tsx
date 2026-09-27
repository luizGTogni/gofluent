"use client";

import { useEffect, useState } from "react";
import { getAccount, getProfile, signOut, type Account as AccountInfo, type Profile } from "@/lib/auth";

export function Account({ onBack, onSignedOut }: { onBack: () => void; onSignedOut: () => void }) {
  const [account, setAccount] = useState<AccountInfo | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getAccount().then(setAccount);
    getProfile().then(setProfile);
  }, []);

  const leave = async () => {
    setBusy(true);
    await signOut();
    onSignedOut();
  };

  return (
    <main className="shell center">
      <h1 className="hero">Account</h1>
      {account === undefined ? (
        <p className="muted">Loading…</p>
      ) : account ? (
        <>
          {profile && (
            <p className="profile-name">
              {profile.fullName} <span className="muted">@{profile.username}</span>
            </p>
          )}
          <p className="muted">
            Signed in as <b className="missed">{account.email}</b>. Your progress is saved to this account.
          </p>
          <button type="button" className="check" onClick={leave} disabled={busy}>
            Sign out
          </button>
        </>
      ) : (
        <p className="muted">You&apos;re not signed in.</p>
      )}
      <button type="button" className="link" onClick={onBack}>
        ← Back
      </button>
    </main>
  );
}
