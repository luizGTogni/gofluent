"use client";

import { useMemo, useState } from "react";
import type { Pos } from "@/lib/exercises";
import { POS_LIST } from "@/lib/contentText";
import { deleteWord, updateWord, type AdminPhrase, type AdminWord } from "@/lib/adminStore";
import s from "./admin.module.css";

const SHOWN = 200;

/** The dictionary: fix a word's IPA or part of speech, or drop a word no phrase uses. */
export function WordList({ words, phrases, onChanged }: { words: AdminWord[]; phrases: AdminPhrase[]; onChanged: () => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [edits, setEdits] = useState<Record<number, { ipa: string; pos: Pos }>>({});
  const [error, setError] = useState<string | null>(null);

  const uses = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of phrases) for (const w of p.words) m.set(`${w.text}|${w.pos}`, (m.get(`${w.text}|${w.pos}`) ?? 0) + 1);
    return m;
  }, [phrases]);

  const q = query.trim().toLowerCase();
  const shown = q ? words.filter((w) => w.text.toLowerCase().startsWith(q)) : words;

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section className={s.panel}>
      <div className={s.row}>
        <input className={s.input} placeholder="Find a word" value={query} onChange={(e) => setQuery(e.target.value)} />
        <span className={s.muted}>
          {shown.length} of {words.length} words
        </span>
      </div>
      {error && <p className={s.bad}>{error}</p>}
      <table className={s.table}>
        <thead>
          <tr>
            <th>Word</th>
            <th>IPA</th>
            <th>Part of speech</th>
            <th>Uses</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {shown.slice(0, SHOWN).map((w) => {
            const e = edits[w.id] ?? { ipa: w.ipa, pos: w.pos };
            const dirty = e.ipa !== w.ipa || e.pos !== w.pos;
            const n = uses.get(`${w.text}|${w.pos}`) ?? 0;
            return (
              <tr key={w.id}>
                <td>{w.text}</td>
                <td>
                  <input className={s.input} value={e.ipa} onChange={(ev) => setEdits((m) => ({ ...m, [w.id]: { ...e, ipa: ev.target.value } }))} />
                </td>
                <td>
                  <select className={s.input} value={e.pos} onChange={(ev) => setEdits((m) => ({ ...m, [w.id]: { ...e, pos: ev.target.value as Pos } }))}>
                    {POS_LIST.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={s.muted}>{n}</td>
                <td>
                  {dirty && (
                    <button type="button" className={s.linkBtn} onClick={() => run(() => updateWord(w.id, e.ipa, e.pos))}>
                      Save
                    </button>
                  )}
                  {n === 0 && (
                    <button type="button" className={s.linkBtn} onClick={() => run(() => deleteWord(w.id))}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
