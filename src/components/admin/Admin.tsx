"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkAdmin, loadLibrary, type AdminPhrase, type AdminWord } from "@/lib/adminStore";
import type { DraftPhrase } from "@/lib/contentText";
import type { PlanetId } from "@/lib/planets";
import { AddPhrases } from "./AddPhrases";
import { AiSettingsForm } from "./AiSettingsForm";
import { Generate } from "./Generate";
import { PhraseList } from "./PhraseList";
import { Review } from "./Review";
import { WordList } from "./WordList";
import s from "./admin.module.css";

type Tab = "phrases" | "add" | "generate" | "words" | "settings";
const TABS: { id: Tab; label: string }[] = [
  { id: "phrases", label: "Phrases" },
  { id: "add", label: "Add / import" },
  { id: "generate", label: "Generate with AI" },
  { id: "words", label: "Dictionary" },
  { id: "settings", label: "Settings" },
];

/** Content admin: the library in the database, and the tools to grow it. */
export function Admin() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [tab, setTab] = useState<Tab>("phrases");
  const [words, setWords] = useState<AdminWord[]>([]);
  const [phrases, setPhrases] = useState<AdminPhrase[]>([]);
  const [drafts, setDraftsState] = useState<DraftPhrase[]>([]);
  const [preset, setPreset] = useState<{ word: string; planet: PlanetId } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const lib = await loadLibrary();
      setWords(lib.words);
      setPhrases(lib.phrases);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    // Anyone else goes back to the app without a word: the page doesn't admit it exists.
    checkAdmin().then((ok) => {
      if (!ok) return router.replace("/");
      setAllowed(true);
      reload();
    });
  }, [reload, router]);

  const setDrafts = (fn: (d: DraftPhrase[]) => DraftPhrase[]) => setDraftsState(fn);
  const addDrafts = (d: DraftPhrase[]) => setDraftsState((prev) => [...prev, ...d]);

  if (!allowed) return null;

  return (
    <main className={s.page}>
      <div className={s.row}>
        <h1 className={s.h1}>Content admin</h1>
        <a href="/" className={s.linkBtn}>
          Back to the app
        </a>
      </div>
      <nav className={s.tabs}>
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? s.tabOn : s.tab} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id !== "phrases" && t.id !== "words" && t.id !== "settings" && drafts.length > 0 ? ` (${drafts.length} in review)` : ""}
          </button>
        ))}
      </nav>
      {error && <p className={s.bad}>{error}</p>}

      {tab === "phrases" && (
        <PhraseList
          phrases={phrases}
          onChanged={reload}
          onGenerateWith={(word, planet) => {
            setPreset({ word, planet });
            setTab("generate");
          }}
        />
      )}
      {tab === "add" && <AddPhrases onDrafts={addDrafts} />}
      {tab === "generate" && <Generate key={preset ? `${preset.word}-${preset.planet}` : "none"} phrases={phrases} preset={preset} onDrafts={addDrafts} />}
      {tab === "words" && <WordList words={words} phrases={phrases} onChanged={reload} />}
      {tab === "settings" && <AiSettingsForm />}

      {/* Kept mounted on every tab, so parts of speech already picked survive a look at the list. */}
      <div hidden={tab !== "add" && tab !== "generate"}>
        <Review drafts={drafts} setDrafts={setDrafts} words={words} phrases={phrases} onSaved={reload} />
      </div>
    </main>
  );
}
