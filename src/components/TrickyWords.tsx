"use client";

import { EXERCISES } from "@/lib/exercises";
import { speak } from "@/lib/speech";
import { isTricky, mainCause, rate, trickyList, type WordStat } from "@/lib/wordStats";

const IPA = new Map(EXERCISES.flatMap((e) => e.words).map((w) => [w.text.toLowerCase(), w.ipa]));

export function TrickyWords({ stats, onBack }: { stats: WordStat[]; onBack: () => void }) {
  const tricky = trickyList(stats);
  const watching = stats.filter((s) => s.struggled > 0 && !isTricky(s)).sort((a, b) => b.struggled - a.struggled);

  const row = (s: WordStat) => (
    <li key={s.word}>
      <div>
        <b>{s.word}</b> <span className="muted">{IPA.get(s.word)}</span>
        <div className="muted saved-src">
          {mainCause(s) === "listening" ? "Hard to hear" : "Spelling"} · stumbled {s.struggled} of {s.seen} ({Math.round(rate(s) * 100)}%)
        </div>
      </div>
      <span className="word-actions">
        <button type="button" className="link" onClick={() => speak(s.word, 1)} aria-label={`Hear ${s.word}`}>
          🔊
        </button>
        <button type="button" className="link" onClick={() => speak(s.word, 0.6)} aria-label={`Hear ${s.word} slowly`}>
          🐢
        </button>
      </span>
    </li>
  );

  return (
    <main className="shell center">
      <h1 className="hero">🧩 Tricky words</h1>
      {tricky.length === 0 ? (
        <p className="muted">Nothing is holding you back right now. Words you stumble on more than once will show up here.</p>
      ) : (
        <>
          <p className="muted">These come back in your sessions until they feel easy. Tap 🔊 to hear a word alone, or 🐢 to hear it slowly.</p>
          <ul className="saved-list">{tricky.map(row)}</ul>
        </>
      )}
      {watching.length > 0 && (
        <>
          <p className="muted">Keeping an eye on</p>
          <ul className="saved-list">{watching.map(row)}</ul>
        </>
      )}
      <button type="button" className="check" onClick={onBack}>
        ← Back
      </button>
    </main>
  );
}
