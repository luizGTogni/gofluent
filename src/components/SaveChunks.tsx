"use client";

import { useState } from "react";
import type { Exercise } from "@/lib/exercises";
import { sentenceOf } from "@/lib/exercises";
import { enrollIfMissing } from "@/lib/reviewStore";
import { saveItem, type SaveResult } from "@/lib/saved";
import { supabaseConfigured } from "@/lib/supabase";

const MESSAGE: Record<SaveResult, string> = {
  saved: "Saved. This sentence will come back for review.",
  duplicate: "Already in My words.",
  error: "Couldn't save right now. Try again.",
  offline: "Saving isn't set up yet.",
  signedout: "Create an account to save words.",
};

/** Click a word, or click two words to pick a chunk between them, then save it. */
export function SaveChunks({ exercise }: { exercise: Exercise }) {
  const [range, setRange] = useState<[number, number] | null>(null);
  const [result, setResult] = useState<SaveResult | null>(null);
  const [busy, setBusy] = useState(false);
  const words = exercise.words.map((w) => w.text);

  if (!supabaseConfigured) return null;

  const click = (i: number) => {
    setResult(null);
    setRange((r) => {
      if (!r) return [i, i];
      if (r[0] === r[1]) return r[0] === i ? null : [Math.min(r[0], i), Math.max(r[0], i)];
      return [i, i];
    });
  };

  const selected = range ? words.slice(range[0], range[1] + 1).join(" ") : "";

  const save = async () => {
    if (!range) return;
    setBusy(true);
    const outcome = await saveItem({
      text: selected,
      sentence: sentenceOf(exercise),
      translation: exercise.translation,
      start: range[0],
      end: range[1],
    });
    if (outcome === "saved") await enrollIfMissing(sentenceOf(exercise));
    setResult(outcome);
    setBusy(false);
  };

  return (
    <div className="save">
      <p className="muted save-hint">Tap a word, or two words to pick a chunk, and save it for later.</p>
      <div className="save-words">
        {words.map((w, i) => (
          <button
            key={i}
            type="button"
            className={`save-word ${range && i >= range[0] && i <= range[1] ? "on" : ""}`}
            onClick={() => click(i)}
          >
            {w}
          </button>
        ))}
      </div>
      <div className="save-actions">
        <button type="button" className="link" disabled={!range || busy} onClick={save}>
          {range ? `☆ Save “${selected}”` : "☆ Save"}
        </button>
        <span className={`muted save-msg ${result === "error" ? "bad" : ""}`}>{result ? MESSAGE[result] : " "}</span>
      </div>
    </div>
  );
}
