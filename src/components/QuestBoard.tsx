"use client";

import { periodKeyFor, QUESTS, type QuestDef } from "@/lib/quests";
import { progressFor, type QuestProgress } from "@/lib/questStore";
import { MODE_UNLOCKS, modeUnlocked } from "@/lib/unlocks";
import { ClaimButton, type OnClaim } from "./ClaimButton";
import { Currency } from "./Currency";
import { ArrowLeft, ArrowRight, Lock } from "./icons";

type Props = { rows: QuestProgress[]; level: number; onClaim: OnClaim; onBack: () => void; onAchievements: () => void };

export function QuestCard({ q, row, level, onClaim }: { q: QuestDef; row: QuestProgress; level: number; onClaim: OnClaim }) {
  const pct = Math.min(100, Math.round((row.count / q.target) * 100));
  const done = row.count >= q.target;
  const locked = q.mode !== undefined && !modeUnlocked(q.mode, level);
  return (
    <div className={`quest-card ${done ? "done" : ""} ${done && !row.claimed ? "ready" : ""} ${locked ? "locked" : ""}`}>
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
        {done ? (
          <ClaimButton def={q} periodKey={row.periodKey} claimed={row.claimed} onClaim={onClaim} />
        ) : locked ? (
          <span className="icon-text">
            <Lock /> Opens at level {MODE_UNLOCKS[q.mode!]}
          </span>
        ) : (
          <Currency r={q} />
        )}
      </div>
    </div>
  );
}

/** Daily and weekly missions (progress synced, see questStore.ts). */
export function QuestBoard({ rows, level, onClaim, onBack, onAchievements }: Props) {
  const now = new Date();
  const rowFor = (q: QuestDef) => progressFor(rows, q.id, periodKeyFor(q, now));

  const daily = QUESTS.filter((q) => q.period === "daily");
  const weekly = QUESTS.filter((q) => q.period === "weekly");

  return (
    <main className="shell center quest-board">
      <button type="button" className="link mode-picker-back icon-text" onClick={onBack}>
        <ArrowLeft /> Back
      </button>
      <h1 className="hero">Missions</h1>
      <p className="muted">Quick wins today, bigger goals this week.</p>

      <div className="quest-columns">
      <section className="quest-section">
        <h2 className="mode-picker-sub muted">Daily</h2>
        <div className="quest-grid">
          {daily.map((q) => (
            <QuestCard key={q.id} q={q} row={rowFor(q)} level={level} onClaim={onClaim} />
          ))}
        </div>
      </section>

      <section className="quest-section">
        <h2 className="mode-picker-sub muted">Weekly</h2>
        <div className="quest-grid">
          {weekly.map((q) => (
            <QuestCard key={q.id} q={q} row={rowFor(q)} level={level} onClaim={onClaim} />
          ))}
        </div>
      </section>

      </div>

      <button type="button" className="profile-link" onClick={onAchievements}>
        <span className="icon-text">Achievements</span>
        <span className="muted icon-text">
          See what you've unlocked <ArrowRight />
        </span>
      </button>
    </main>
  );
}
