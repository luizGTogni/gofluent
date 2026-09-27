"use client";

import { useEffect, useState } from "react";
import { createAccount, getAccount, MIN_PASSWORD, signIn, signOut, type Account as AccountInfo } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";

type Mode = "create" | "signin";

export function Account({ onBack }: { onBack: () => void }) {
  const [account, setAccount] = useState<AccountInfo | null | undefined>(undefined);
  const [mode, setMode] = useState<Mode>("create");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const refresh = () => getAccount().then(setAccount);
  useEffect(() => {
    refresh();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNote("");
    const result = mode === "create" ? await createAccount(email.trim(), password) : await signIn(email.trim(), password);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setNote(result.message ?? "");
    setPassword("");
    refresh();
  };

  const leave = async () => {
    setBusy(true);
    await signOut();
    setBusy(false);
    setNote("You're signed out. A fresh guest session is ready.");
    refresh();
  };

  const isMember = account && !account.isAnonymous;

  return (
    <main className="shell center">
      <h1 className="hero">Account</h1>

      {!supabaseConfigured ? (
        <p className="muted">Accounts aren&apos;t set up yet. Add your Supabase keys to .env.local.</p>
      ) : account === undefined ? (
        <p className="muted">Loading…</p>
      ) : account === null ? (
        <p className="muted">Couldn&apos;t reach your account right now.</p>
      ) : isMember ? (
        <>
          <p className="muted">
            Signed in as <b className="missed">{account.email}</b>. Your progress is saved to this account.
          </p>
          <button type="button" className="check" onClick={leave} disabled={busy}>
            Sign out
          </button>
        </>
      ) : (
        <>
          <p className="muted">
            {account.pendingEmail
              ? `Waiting for you to confirm ${account.pendingEmail}. Check your inbox.`
              : mode === "create"
                ? "You're studying as a guest. Add an email and password to keep your progress on any device."
                : "Sign in to an existing account. This device's guest progress won't be merged into it."}
          </p>
          <div className="levels" role="tablist" aria-label="Account">
            {(["create", "signin"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                className={`level ${mode === m ? "on" : ""}`}
                onClick={() => {
                  setMode(m);
                  setError("");
                  setNote("");
                }}
              >
                {m === "create" ? "Create account" : "Sign in"}
              </button>
            ))}
          </div>
          <form className="auth-form" onSubmit={submit}>
            <input type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input
              type="password"
              required
              minLength={MIN_PASSWORD}
              autoComplete={mode === "create" ? "new-password" : "current-password"}
              placeholder={`Password (${MIN_PASSWORD}+ characters)`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" className="check" disabled={busy}>
              {busy ? "…" : mode === "create" ? "Create account →" : "Sign in →"}
            </button>
          </form>
        </>
      )}

      <p className="auth-error" role="alert">
        {error || " "}
      </p>
      {note && <p className="muted">{note}</p>}

      <button type="button" className="link" onClick={onBack}>
        ← Back
      </button>
    </main>
  );
}
