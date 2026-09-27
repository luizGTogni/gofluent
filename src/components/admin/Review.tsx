"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Pos } from "@/lib/exercises";
import { checkDraft, newWordText, POS_LIST, type DraftPhrase } from "@/lib/contentText";
import { lookupIpa, savePhrases, saveWords, type AdminPhrase, type AdminWord, type NewPhrase } from "@/lib/adminStore";
import { PLANETS, type PlanetId } from "@/lib/planets";
import s from "./admin.module.css";

type NewWord = { text: string; ipa: string; pos: Pos | "" };
type Props = {
  drafts: DraftPhrase[];
  setDrafts: (fn: (d: DraftPhrase[]) => DraftPhrase[]) => void;
  words: AdminWord[];
  phrases: AdminPhrase[];
  onSaved: () => Promise<void>;
};

/**
 * Drafts from any source (typed, imported, generated) before they reach the database: each phrase
 * is checked, and words not in the dictionary get their IPA from CMUdict and a part of speech you pick.
 */
export function Review({ drafts, setDrafts, words, phrases, onSaved }: Props) {
  const [newWords, setNewWords] = useState<Record<string, NewWord>>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const asked = useRef(new Set<string>());

  const dict = useMemo(() => {
    const m = new Map<string, AdminWord>();
    for (const w of words) if (!m.has(w.text.toLowerCase())) m.set(w.text.toLowerCase(), w);
    return m;
  }, [words]);
  const existing = useMemo(() => new Set(phrases.map((p) => p.text.toLowerCase())), [phrases]);

  // Each draft checked in order, so the second copy of a phrase in one batch is the duplicate.
  const checked = useMemo(() => {
    const seen = new Set<string>();
    return drafts.map((d) => {
      const c = checkDraft(d.en, d.pt, (t) => existing.has(t) || seen.has(t));
      if (c.tokens.length) seen.add(c.tokens.join(" ").toLowerCase());
      const unknown = c.errors.length ? [] : c.tokens.map((t, i) => ({ key: t.toLowerCase(), text: newWordText(t, i) })).filter((u) => !dict.has(u.key));
      return { draft: d, ...c, unknown };
    });
  }, [drafts, existing, dict]);

  const needed = useMemo(() => {
    const m = new Map<string, { text: string; uses: number }>();
    for (const c of checked) for (const u of c.unknown) m.set(u.key, { text: m.get(u.key)?.text ?? u.text, uses: (m.get(u.key)?.uses ?? 0) + 1 });
    return m;
  }, [checked]);

  useEffect(() => {
    const missing = [...needed.keys()].filter((k) => !asked.current.has(k));
    if (!missing.length) return;
    missing.forEach((k) => asked.current.add(k));
    lookupIpa(missing)
      .then((ipa) =>
        setNewWords((prev) => {
          const next = { ...prev };
          for (const k of missing) next[k] ??= { text: needed.get(k)!.text, ipa: ipa[k] ?? "", pos: "" };
          return next;
        }),
      )
      .catch((e) => {
        missing.forEach((k) => asked.current.delete(k));
        setNote({ ok: false, text: `IPA lookup failed: ${e.message}` });
      });
  }, [needed]);

  const valid = checked.filter((c) => !c.errors.length);
  const incomplete = [...needed.keys()].filter((k) => !newWords[k]?.ipa.trim() || !newWords[k]?.pos);
  const edit = (key: string, patch: Partial<DraftPhrase>) => setDrafts((d) => d.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const editWord = (key: string, patch: Partial<NewWord>) => setNewWords((w) => ({ ...w, [key]: { ...w[key], ...patch } }));

  const save = async () => {
    setBusy(true);
    setNote(null);
    try {
      const fresh = [...needed.keys()].map((k) => ({ text: newWords[k].text, ipa: newWords[k].ipa.trim(), pos: newWords[k].pos as Pos }));
      if (fresh.length) await saveWords(fresh);
      const rows: NewPhrase[] = valid.map((c) => {
        const parts = c.tokens.map((t) => {
          const known = dict.get(t.toLowerCase());
          const w = known ?? newWords[t.toLowerCase()];
          return { text: w.text, pos: w.pos as Pos };
        });
        return { text: parts.map((p) => p.text).join(" "), translation: c.draft.pt.trim(), planet: c.draft.planet, words: parts };
      });
      const r = await savePhrases(rows);
      const saved = new Set(valid.map((c) => c.draft.key));
      setDrafts((d) => d.filter((x) => !saved.has(x.key)));
      setNewWords({});
      asked.current.clear();
      await onSaved();
      setNote({ ok: true, text: `Saved ${r.inserted} new phrase${r.inserted === 1 ? "" : "s"}${r.updated ? `, updated ${r.updated}` : ""}${fresh.length ? ` and ${fresh.length} new word${fresh.length === 1 ? "" : "s"}` : ""}.` });
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  if (!drafts.length) return note ? <p className={note.ok ? s.ok : s.bad}>{note.text}</p> : null;

  return (
    <section className={s.panel}>
      <div className={s.row}>
        <h2 className={s.h2}>Review ({drafts.length})</h2>
        <span className={s.muted}>
          {valid.length} ready · {drafts.length - valid.length} with problems
        </span>
        <button type="button" className={s.linkBtn} onClick={() => setDrafts(() => [])}>
          Discard all
        </button>
      </div>

      <table className={s.table}>
        <thead>
          <tr>
            <th>English</th>
            <th>Portuguese</th>
            <th>Planet</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {checked.map((c) => (
            <tr key={c.draft.key} className={c.errors.length ? s.rowBad : undefined}>
              <td>
                <input className={s.input} value={c.draft.en} onChange={(e) => edit(c.draft.key, { en: e.target.value })} />
                {c.errors.length > 0 && <div className={s.bad}>{c.errors.join(" · ")}</div>}
                {c.unknown.length > 0 && <div className={s.muted}>new: {c.unknown.map((u) => u.text).join(", ")}</div>}
              </td>
              <td>
                <input className={s.input} value={c.draft.pt} onChange={(e) => edit(c.draft.key, { pt: e.target.value })} />
              </td>
              <td>
                <select className={s.input} value={c.draft.planet} onChange={(e) => edit(c.draft.key, { planet: e.target.value as PlanetId })}>
                  {PLANETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.cefr})
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button type="button" className={s.linkBtn} onClick={() => setDrafts((d) => d.filter((x) => x.key !== c.draft.key))} aria-label="Remove">
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {needed.size > 0 && (
        <>
          <h3 className={s.h3}>New words ({needed.size})</h3>
          <p className={s.muted}>IPA comes from CMUdict when it knows the word; check it and pick the part of speech.</p>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Word</th>
                <th>IPA</th>
                <th>Part of speech</th>
                <th>Uses</th>
              </tr>
            </thead>
            <tbody>
              {[...needed.entries()].map(([k, n]) => {
                const w = newWords[k];
                return (
                  <tr key={k}>
                    <td>
                      <input className={s.input} value={w?.text ?? n.text} disabled={!w} onChange={(e) => editWord(k, { text: e.target.value })} />
                    </td>
                    <td>
                      <input className={s.input} value={w?.ipa ?? ""} disabled={!w} placeholder={w ? "/.../" : "looking up…"} onChange={(e) => editWord(k, { ipa: e.target.value })} />
                    </td>
                    <td>
                      <select className={s.input} value={w?.pos ?? ""} disabled={!w} onChange={(e) => editWord(k, { pos: e.target.value as Pos })}>
                        <option value="">pick…</option>
                        {POS_LIST.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={s.muted}>{n.uses}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      <div className={s.row}>
        <button type="button" className={s.primary} disabled={busy || !valid.length || incomplete.length > 0} onClick={save}>
          {busy ? "Saving…" : `Save ${valid.length} phrase${valid.length === 1 ? "" : "s"}`}
        </button>
        {incomplete.length > 0 && <span className={s.muted}>Fill in IPA and part of speech for {incomplete.length} new word{incomplete.length === 1 ? "" : "s"}.</span>}
        {note && <span className={note.ok ? s.ok : s.bad}>{note.text}</span>}
      </div>
    </section>
  );
}
