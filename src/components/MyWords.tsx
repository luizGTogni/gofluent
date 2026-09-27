"use client";

import { useEffect, useState } from "react";
import { getAccount } from "@/lib/auth";
import { deleteSaved, listSaved, type SavedItem } from "@/lib/saved";
import { supabaseConfigured } from "@/lib/supabase";

export function MyWords({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<SavedItem[] | null | undefined>(undefined);

  const [signedIn, setSignedIn] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    getAccount().then((a) => {
      setSignedIn(Boolean(a));
      if (a) listSaved().then(setItems);
    });
  }, []);

  const remove = async (id: string) => {
    if (await deleteSaved(id)) setItems((list) => list?.filter((x) => x.id !== id));
  };

  return (
    <main className="shell center">
      <h1 className="hero">My words</h1>
      {!supabaseConfigured ? (
        <p className="muted">Saving isn&apos;t set up yet. Add your Supabase keys to .env.local.</p>
      ) : signedIn === undefined ? (
        <p className="muted">Loading…</p>
      ) : !signedIn ? (
        <p className="muted">Create an account, or sign in, to save words and see them here on any device.</p>
      ) : items === undefined ? (
        <p className="muted">Loading…</p>
      ) : items === null ? (
        <p className="muted">Couldn&apos;t load your words right now.</p>
      ) : items.length === 0 ? (
        <p className="muted">Nothing saved yet. Tap words after an exercise to keep them here.</p>
      ) : (
        <ul className="saved-list">
          {items.map((it) => (
            <li key={it.id}>
              <div>
                <b>{it.text}</b>
                <span className="muted">{it.kind === "chunk" ? " · chunk" : ""}</span>
                <div className="muted saved-src">
                  {it.sentence}
                  {it.translation ? ` — ${it.translation}` : ""}
                </div>
              </div>
              <button type="button" className="link" onClick={() => remove(it.id)} aria-label={`Remove ${it.text}`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="check" onClick={onBack}>
        ← Back
      </button>
    </main>
  );
}
