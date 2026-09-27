"use client";

import { useMemo, useState } from "react";
import { deletePhrase, type AdminPhrase } from "@/lib/adminStore";
import { PLANET_TARGET, tokenize } from "@/lib/contentText";
import { PLANETS, type PlanetId } from "@/lib/planets";
import s from "./admin.module.css";

const SHOWN = 300;

/** The library by planet, with each planet's count against its target, and a word search. */
export function PhraseList({ phrases, onChanged, onGenerateWith }: { phrases: AdminPhrase[]; onChanged: () => Promise<void>; onGenerateWith: (word: string, planet: PlanetId) => void }) {
  const [planet, setPlanet] = useState<PlanetId | "all">("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const m = new Map<PlanetId, number>();
    for (const p of phrases) m.set(p.planet, (m.get(p.planet) ?? 0) + 1);
    return m;
  }, [phrases]);

  const terms = tokenize(query.toLowerCase());
  const shown = phrases.filter(
    (p) =>
      (planet === "all" || p.planet === planet) &&
      terms.every((t) => p.words.some((w) => w.text.toLowerCase() === t) || p.translation.toLowerCase().includes(t)),
  );

  const remove = async (p: AdminPhrase) => {
    if (!window.confirm(`Delete "${p.text}"? Learners stop seeing it.`)) return;
    try {
      await deletePhrase(p.id);
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section className={s.panel}>
      <div className={s.chips}>
        <button type="button" className={planet === "all" ? s.chipOn : s.chip} onClick={() => setPlanet("all")}>
          All <b>{phrases.length}</b>
        </button>
        {PLANETS.map((p) => {
          const n = counts.get(p.id) ?? 0;
          return (
            <button key={p.id} type="button" className={planet === p.id ? s.chipOn : s.chip} onClick={() => setPlanet(p.id)}>
              {p.name} <span className={s.muted}>{p.cefr}</span>{" "}
              <b className={n >= PLANET_TARGET ? s.ok : undefined}>
                {n}/{PLANET_TARGET}
              </b>
            </button>
          );
        })}
      </div>

      <div className={s.row}>
        <input className={s.input} placeholder="Search by word (English) or translation" value={query} onChange={(e) => setQuery(e.target.value)} />
        {terms.length === 1 && (
          <button type="button" className={s.secondary} onClick={() => onGenerateWith(terms[0], planet === "all" ? "earth" : planet)}>
            Generate examples with “{terms[0]}”
          </button>
        )}
      </div>
      {error && <p className={s.bad}>{error}</p>}

      <p className={s.muted}>
        {shown.length} phrase{shown.length === 1 ? "" : "s"}
        {shown.length > SHOWN ? ` · showing the first ${SHOWN}` : ""}
      </p>
      <table className={s.table}>
        <thead>
          <tr>
            <th>English</th>
            <th>Portuguese</th>
            <th>Planet</th>
            <th>Words</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {shown.slice(0, SHOWN).map((p) => (
            <tr key={p.id}>
              <td>{p.text}</td>
              <td>{p.translation}</td>
              <td className={s.muted}>{p.planet}</td>
              <td className={s.muted}>{p.words.length}</td>
              <td>
                <button type="button" className={s.linkBtn} onClick={() => remove(p)} aria-label={`Delete ${p.text}`}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
