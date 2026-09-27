"use client";

import { useEffect, useState } from "react";
import { listCatalog, loadAiSettings, saveAiSettings, testModels, type AiSettings, type Attempt } from "@/lib/adminStore";
import s from "./admin.module.css";

const SLOTS = ["Primary model", "Fallback 1", "Fallback 2", "Fallback 3"];
// DEFAULT_MODELS in src/lib/nim.ts (a server module, so repeated here).
const DEFAULT_MODELS = ["google/gemma-4-31b-it", "mistralai/mistral-nemotron", "mistralai/mistral-large-2-instruct", "nvidia/nemotron-3-super-120b-a12b"];
const COOLDOWN_MIN = 10; // COOLDOWN_MS in src/lib/nim.ts

/** NVIDIA NIM: the keys are stored in the database and never shown again, only their last 4 characters. */
export function AiSettingsForm() {
  const [saved, setSaved] = useState<AiSettings | null>(null);
  const [models, setModels] = useState<string[]>(["", "", "", ""]);
  const [reasoning, setReasoning] = useState(false);
  // What's typed in each key field; empty keeps the saved key.
  const [keys, setKeys] = useState(["", ""]);
  const [catalog, setCatalog] = useState<string[]>([]);
  const [tests, setTests] = useState<Attempt[] | null>(null);
  const [testing, setTesting] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const apply = (r: AiSettings) => {
    setSaved({ ...r, failures: r.failures ?? {} });
    // Nothing saved yet (or settings from before migration 0026): start from the default chain.
    setModels([...(r.models?.length ? r.models : DEFAULT_MODELS), "", "", "", ""].slice(0, 4));
    setReasoning(r.reasoning);
  };

  useEffect(() => {
    loadAiSettings()
      .then(apply)
      .catch((e) => setNote({ ok: false, text: e.message }));
    listCatalog().then(setCatalog).catch(() => {});
  }, []);

  const chosen = models.map((m) => m.trim()).filter(Boolean);
  const unknown = catalog.length ? chosen.filter((m) => !catalog.includes(m)) : [];

  const hints = [saved?.keyHint ?? null, saved?.keyHint2 ?? null];
  const typed = (i: number) => keys[i].trim() || null;

  /** Saves the form; `remove` clears that key (1 or 2) instead. */
  const save = async (remove?: number) => {
    setNote(null);
    try {
      apply(await saveAiSettings(chosen, reasoning, remove === 1 ? "" : typed(0), remove === 2 ? "" : typed(1)));
      setKeys(["", ""]);
      setNote({ ok: true, text: "Saved." });
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : String(e) });
    }
  };

  const test = async () => {
    setTesting(true);
    setTests(null);
    setNote(null);
    try {
      setTests(await testModels(chosen));
      loadAiSettings().then(setSaved).catch(() => {});
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setTesting(false);
    }
  };

  const resting = (m: string) => {
    const at = saved?.failures?.[m];
    const left = at ? COOLDOWN_MIN - Math.floor((Date.now() - Date.parse(at)) / 60_000) : 0;
    return left > 0 ? left : 0;
  };

  return (
    <section className={s.panel}>
      <h2 className={s.h2}>NVIDIA NIM</h2>
      <p className={s.muted}>
        Create a key at build.nvidia.com. Generation tries the models in order: if one errors, times out or replies without phrases, the next takes over. When a key
        is rate-limited or refused, the same model is retried with the second key first. A model that failed waits {COOLDOWN_MIN} minutes at the back of the line, so a model that is down doesn&apos;t slow every request.
      </p>
      {["API key", "Second API key"].map((label, i) => (
        <label key={label} className={s.field}>
          <span>
            {label}
            {i === 1 && <span className={s.muted}> (optional: used when the first is rate-limited or refused)</span>}{" "}
            {hints[i] ? (
              <>
                <span className={s.muted}>(saved: {hints[i]})</span>{" "}
                <button type="button" className={s.linkBtn} onClick={() => window.confirm(`Remove the saved ${label.toLowerCase()}?`) && save(i + 1)}>
                  remove
                </button>
              </>
            ) : (
              <span className={i === 0 ? s.bad : s.muted}>(none saved)</span>
            )}
          </span>
          <input
            className={s.input}
            type="password"
            autoComplete="off"
            placeholder={hints[i] ? "Leave empty to keep the saved key" : "nvapi-…"}
            value={keys[i]}
            onChange={(e) => setKeys((ks) => ks.map((k, j) => (j === i ? e.target.value : k)))}
          />
        </label>
      ))}

      <datalist id="nim-models">
        {catalog.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      {SLOTS.map((label, i) => {
        const m = models[i].trim();
        const wait = m ? resting(m) : 0;
        const results = tests?.filter((a) => a.model === m) ?? [];
        return (
          <label key={label} className={s.field}>
            <span>
              {label}
              {i > 0 && <span className={s.muted}> (optional)</span>}
              {wait > 0 && <span className={s.bad}> · failed recently, back in line in {wait} min</span>}
              {results.map((t) =>
                t.ok ? (
                  <span key={t.key} className={s.ok}>
                    {" "}
                    · key {t.key}: {(t.ms / 1000).toFixed(1)}s
                  </span>
                ) : (
                  <span key={t.key} className={s.bad}>
                    {" "}
                    · key {t.key}: {t.error}
                  </span>
                ),
              )}
            </span>
            <input className={s.input} list="nim-models" value={models[i]} placeholder={i === 0 ? "google/gemma-4-31b-it" : ""} onChange={(e) => setModels((ms) => ms.map((x, k) => (k === i ? e.target.value : x)))} />
          </label>
        );
      })}
      {unknown.length > 0 && <p className={s.bad}>Not in the NIM catalog: {unknown.join(", ")}</p>}

      <label className={s.check}>
        <input type="checkbox" checked={reasoning} onChange={(e) => setReasoning(e.target.checked)} />
        Reasoning (thinking) — better phrases on models that support it, but slower
      </label>
      <div className={s.row}>
        <button type="button" className={s.primary} onClick={() => save()} disabled={!chosen.length}>
          Save
        </button>
        <button type="button" className={s.secondary} onClick={test} disabled={testing || !chosen.length || !(saved?.keyHint || saved?.keyHint2)}>
          {testing ? "Testing…" : "Test models"}
        </button>
        {note && <span className={note.ok ? s.ok : s.bad}>{note.text}</span>}
      </div>
    </section>
  );
}
