"use client";

import { useState } from "react";
import { parseList, type DraftPhrase } from "@/lib/contentText";
import { isPlanetId, PLANETS, type PlanetId } from "@/lib/planets";
import s from "./admin.module.css";

let next = 0;
const key = () => `draft-${Date.now()}-${next++}`;

/** Type one phrase, or paste/upload a list: everything goes to the review below first. */
export function AddPhrases({ onDrafts }: { onDrafts: (d: DraftPhrase[]) => void }) {
  const [planet, setPlanet] = useState<PlanetId>("earth");
  const [en, setEn] = useState("");
  const [pt, setPt] = useState("");
  const [list, setList] = useState("");

  const addOne = () => {
    if (!en.trim()) return;
    onDrafts([{ key: key(), en, pt, planet }]);
    setEn("");
    setPt("");
  };

  const addList = () => {
    const drafts = parseList(list, planet, isPlanetId);
    if (drafts.length) onDrafts(drafts);
    setList("");
  };

  const readFile = async (file: File | undefined) => {
    if (file) setList((await file.text()).trim());
  };

  return (
    <section className={s.panel}>
      <label className={s.field}>
        Planet (default for lists without a planet column)
        <select className={s.input} value={planet} onChange={(e) => setPlanet(e.target.value as PlanetId)}>
          {PLANETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.cefr}) · {p.topic}
            </option>
          ))}
        </select>
      </label>

      <h3 className={s.h3}>One phrase</h3>
      <form
        className={s.row}
        onSubmit={(e) => {
          e.preventDefault();
          addOne();
        }}
      >
        <input className={s.input} placeholder="English: see you tomorrow" value={en} onChange={(e) => setEn(e.target.value)} />
        <input className={s.input} placeholder="Portuguese: até amanhã" value={pt} onChange={(e) => setPt(e.target.value)} />
        <button type="submit" className={s.secondary}>
          Add to review
        </button>
      </form>

      <h3 className={s.h3}>A list</h3>
      <p className={s.muted}>
        One phrase per line: <code>english | portuguese</code> (tab or <code>;</code> also work). An optional third column sets the planet, e.g. <code>good morning | bom dia | venus</code>. Lines starting with # are skipped.
      </p>
      <textarea className={s.textarea} rows={8} value={list} onChange={(e) => setList(e.target.value)} placeholder={"thank you | obrigado\nsee you soon | até logo"} />
      <div className={s.row}>
        <input type="file" accept=".txt,.tsv,.csv,text/plain" onChange={(e) => readFile(e.target.files?.[0])} />
        <button type="button" className={s.secondary} disabled={!list.trim()} onClick={addList}>
          Add list to review
        </button>
      </div>
    </section>
  );
}
