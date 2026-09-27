"use client";

import { useEffect, useState } from "react";
import { BADGES } from "@/lib/badges";
import { unlockedBadges } from "@/lib/badgeStore";
import { periodKeyFor, QUESTS, type QuestDef } from "@/lib/quests";
import { allProgress, type QuestProgress } from "@/lib/questStore";

type Props = { onBack: () => void };

const emptyRow = (q: QuestDef, now: Date): QuestProgress => ({ id: q.id, periodKey: periodKeyFor(q, now), count: 0, claimed: false });

function QuestCard({ q, row }: { q: QuestDef; row: QuestProgress }) {
  const pct = Math.min(100, Math.round((row.count / q.target) * 100));
  const done = row.count >= q.target;
  return (
    <div className={`quest-card ${done ? "done" : ""}`}>
      <div className="quest-card-head">
        <b>{q.name}</b>
        <span className="muted">
          {row.count}/{q.target}
        </span>
      </div>
      <p className="muted quest-desc">{q.description}</p>
      <div className="xpbar quest-bar">
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="quest-reward muted">
        {done ? "✅ Claimed" : `🪙 +${q.coins}${q.crystals ? ` · 💎 +${q.crystals}` : ""}`}
      </div>
    </div>
  );
}

/** Daily and weekly missions, plus the mission badges earned so far. Progress lives on this
 * device only for now (see questStore.ts) so it's read fresh each time this screen opens. */
export function QuestBoard({ onBack }: Props) {
  const [rows, setRows] = useState<QuestProgress[]>([]);
  const [badges, setBadges] = useState<Set<string>>(new Set());

  useEffect(() => {
    setRows(allProgress());
    setBadges(unlockedBadges());
  }, []);

  const now = new Date();
  const rowFor = (q: QuestDef) => {
    const key = periodKeyFor(q, now);
    return rows.find((r) => r.id === q.id && r.periodKey === key) ?? emptyRow(q, now);
  };

  const daily = QUESTS.filter((q) => q.period === "daily");
  const weekly = QUESTS.filter((q) => q.period === "weekly");

  return (
    <main className="shell center">
      <button type="button" className="link mode-picker-back" onClick={onBack}>
        ← Back
      </button>
      <h1 className="hero">Missions</h1>
      <p className="muted">Quick wins today, bigger goals this week.</p>

      <section className="quest-section">
        <h2 className="mode-picker-sub muted">Daily</h2>
        <div className="quest-grid">
          {daily.map((q) => (
            <QuestCard key={q.id} q={q} row={rowFor(q)} />
          ))}
        </div>
      </section>

      <section className="quest-section">
        <h2 className="mode-picker-sub muted">Weekly</h2>
        <div className="quest-grid">
          {weekly.map((q) => (
            <QuestCard key={q.id} q={q} row={rowFor(q)} />
          ))}
        </div>
      </section>

      <section className="quest-section">
        <h2 className="mode-picker-sub muted">Mission badges</h2>
        <div className="badge-grid">
          {BADGES.map((b) => {
            const on = badges.has(b.id);
            return (
              <div key={b.id} className={`badge-card ${on ? "on" : "locked"}`} title={b.description}>
                <span className="badge-icon" aria-hidden>
                  {on ? b.icon : "🔒"}
                </span>
                <b>{b.name}</b>
                <span className="muted badge-desc">{b.description}</span>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
