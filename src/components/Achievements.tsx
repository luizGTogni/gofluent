"use client";

import { useEffect, useState } from "react";
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_REWARD,
  ACHIEVEMENTS,
  CATEGORY_NAME,
  achievementProgress,
  type AchievementCategory,
} from "@/lib/achievements";
import { cachedAchievements, loadAchievements, type AchievementState } from "@/lib/achievementStore";
import { Currency } from "./Currency";
import { ArrowLeft } from "./icons";
import { Medal } from "./icons/Medal";

type Filter = "all" | "unlocked" | "locked";

const fmt = (n: number) => n.toLocaleString("en-US");

export function Achievements({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<AchievementState>({ unlocked: new Map(), metrics: {} });
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    setState(cachedAchievements());
    loadAchievements().then(setState);
  }, []);

  const total = ACHIEVEMENTS.length;
  const done = ACHIEVEMENTS.filter((d) => state.unlocked.has(d.id)).length;
  const shown = (category: AchievementCategory) =>
    ACHIEVEMENTS.filter((d) => d.category === category).filter((d) => {
      const on = state.unlocked.has(d.id);
      return filter === "all" || (filter === "unlocked" ? on : !on);
    });

  return (
    <main className="shell center profile">
      <div className="profile-topbar">
        <button type="button" className="link icon-text" onClick={onBack}>
          <ArrowLeft /> Back
        </button>
      </div>

      <header className="ach-head">
        <div>
          <h1 className="profile-title">Achievements</h1>
          <p className="muted profile-note">
            {done} of {total} unlocked
          </p>
        </div>
        <div className="ach-filters" role="group" aria-label="Show">
          {(["all", "unlocked", "locked"] as Filter[]).map((f) => (
            <button key={f} type="button" className={`chip-mini chip-link ${filter === f ? "accent" : ""}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "unlocked" ? "Unlocked" : "Locked"}
            </button>
          ))}
        </div>
      </header>
      <div className="xpbar ach-total" aria-hidden>
        <span style={{ width: `${Math.round((done / total) * 100)}%` }} />
      </div>

      {ACHIEVEMENT_CATEGORIES.map((category) => {
        const defs = shown(category);
        if (!defs.length) return null;
        return (
          <section key={category} className="ach-section">
            <h2 className="mode-picker-sub muted">{CATEGORY_NAME[category]}</h2>
            <div className="ach-grid">
              {defs.map((d) => {
                const on = state.unlocked.has(d.id);
                const p = achievementProgress(d, state.metrics[d.metric]);
                const reward = ACHIEVEMENT_REWARD[d.rarity];
                const bar = !on && !d.mask && d.target > 1;
                return (
                  <article key={d.id} className={`ach-card rarity-${d.rarity} ${on ? "on" : "locked"}`}>
                    <Medal icon={d.icon} rarity={d.rarity} locked={!on} className="ach-medal" />
                    <div className="ach-body">
                      <b>
                        {d.name}
                        {!on && <span className="sr-only"> (locked)</span>}
                      </b>
                      <span className="ach-pt">{d.pt}</span>
                      <span className="ach-desc">{d.description}</span>
                      {bar && (
                        <span className="ach-progress">
                          <span className="xpbar" aria-hidden>
                            <span style={{ width: `${p.pct}%` }} />
                          </span>
                          <span className="ach-count">
                            {fmt(Math.min(p.value, d.target))}/{fmt(d.target)}
                          </span>
                        </span>
                      )}
                      <span className="ach-reward">
                        <span className={`ach-rarity rarity-${d.rarity}`}>{d.rarity}</span>
                        <Currency r={{ coins: reward.coins, crystals: reward.crystals }} signed={false} />
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
