"use client";

import { useState } from "react";
import { generateDrafts, type AdminPhrase, type Attempt } from "@/lib/adminStore";
import type { DraftPhrase } from "@/lib/contentText";
import { PLANET_BY_ID, PLANETS, type PlanetId } from "@/lib/planets";
import s from "./admin.module.css";

let next = 0;

/** Drafts from NVIDIA NIM for a planet, optionally around a theme or one word. */
export function Generate({ phrases, preset, onDrafts }: { phrases: AdminPhrase[]; preset: { word: string; planet: PlanetId } | null; onDrafts: (d: DraftPhrase[]) => void }) {
  const [planet, setPlanet] = useState<PlanetId>(preset?.planet ?? "earth");
  const [count, setCount] = useState(20);
  const [theme, setTheme] = useState("");
  const [word, setWord] = useState(preset?.word ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  const run = async () => {
    setBusy(true);
    setError(null);
    setAttempts([]);
    try {
      // The planet's latest phrases, so the model doesn't repeat them.
      const avoid = phrases.filter((p) => p.planet === planet).slice(-150).map((p) => p.text);
      const r = await generateDrafts({ planet, count, theme: theme || undefined, word: word || undefined, avoid });
      setAttempts(r.attempts);
      if (r.error) setError(r.error);
      onDrafts(r.phrases.map((p) => ({ key: `gen-${Date.now()}-${next++}`, en: p.en, pt: p.pt, planet })));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={s.panel}>
      <label className={s.field}>
        Planet
        <select className={s.input} value={planet} onChange={(e) => setPlanet(e.target.value as PlanetId)}>
          {PLANETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.cefr}) · {p.topic}
            </option>
          ))}
        </select>
      </label>
      <div className={s.row}>
        <label className={s.field}>
          How many (1-50)
          <input className={s.input} type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} />
        </label>
        <label className={s.field}>
          Theme (optional)
          <input className={s.input} placeholder={`e.g. ${PLANET_BY_ID.get(planet)!.topic.toLowerCase()} at the weekend`} value={theme} onChange={(e) => setTheme(e.target.value)} />
        </label>
        <label className={s.field}>
          Must contain the word (optional)
          <input className={s.input} placeholder="e.g. breakfast" value={word} onChange={(e) => setWord(e.target.value)} />
        </label>
      </div>
      <div className={s.row}>
        <button type="button" className={s.primary} disabled={busy} onClick={run}>
          {busy ? "Generating… (reasoning models can take a few minutes)" : "Generate drafts"}
        </button>
        {error && <span className={s.bad}>{error}</span>}
      </div>
      {attempts.length > 0 && (
        <ul className={s.muted}>
          {attempts.map((a, i) => (
            <li key={i}>
              {a.model} (key {a.key}): {a.ok ? <span className={s.ok}>answered in {(a.ms / 1000).toFixed(1)}s</span> : <span className={s.bad}>{a.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
