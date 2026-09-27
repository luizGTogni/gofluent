"use client";

import { useState } from "react";
import { createAccount, MIN_PASSWORD, signIn } from "@/lib/auth";
import { ArrowRight } from "./icons";

type Mode = "signin" | "create";

export function AuthGate({ onMember, onGuest }: { onMember: () => void; onGuest: () => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNote("");
    const result =
      mode === "create" ? await createAccount({ fullName, username, email, password, confirm }) : await signIn(email.trim(), password);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    if (result.signedIn) return onMember();
    setNote(result.message ?? "");
    setPassword("");
    setConfirm("");
  };

  return (
    <main className="shell center gate">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="GoFluent" className="logo" />
      <h1 className="hero tagline">Make English part of your every day.</h1>

      <div className="levels" role="tablist" aria-label="Account">
        {(["signin", "create"] as Mode[]).map((m) => (
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
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form className={`auth-form ${mode === "create" ? "auth-grid" : ""}`} onSubmit={submit} noValidate>
        {mode === "create" && (
          <>
            <input required autoComplete="name" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <input
              required
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Username (letters, numbers, _)"
              maxLength={20}
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
            />
          </>
        )}
        <input className="span-2" type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          type="password"
          required
          minLength={MIN_PASSWORD}
          autoComplete={mode === "create" ? "new-password" : "current-password"}
          placeholder={`Password (${MIN_PASSWORD}+ characters)`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === "create" && (
          <input
            type="password"
            required
            autoComplete="new-password"
            placeholder="Repeat password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        )}
        <button type="submit" className="check span-2" disabled={busy}>
          {busy ? (
            "…"
          ) : (
            <>
              {mode === "create" ? "Create account" : "Sign in"} <ArrowRight />
            </>
          )}
        </button>
      </form>

      <p className="auth-error" role="alert">
        {error || " "}
      </p>
      {note && <p className="muted">{note}</p>}

      <div className="guest-box">
        <button type="button" className="link" onClick={onGuest}>
          Continue as guest
        </button>
        <span className="muted">Pick a level and play. Nothing is saved: no review, tricky words or saved words.</span>
      </div>
    </main>
  );
}
