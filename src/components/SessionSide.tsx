"use client";

import { advancedQuests, type QuestProgress } from "@/lib/questStore";
import type { SessionGains } from "@/lib/rewards";
import { Currency } from "./Currency";
import { Check, Combo } from "./icons";

type Props = {
  full: boolean;
  gains: SessionGains;
  combo: number;
  bestCombo: number;
  questsBefore: QuestProgress[];
  questsNow: QuestProgress[];
};

const KEYS: [string, string][] = [
  ["Enter", "Check · Next phrase"],
  ["Space", "Jump to the next word"],
  ["Backspace", "Back to the previous word (when empty)"],
];

/** Wide screens only: this session at a glance, next to the exercise. */
export function SessionSide({ full, gains, combo, bestCombo, questsBefore, questsNow }: Props) {
  const missions = full ? advancedQuests(questsBefore, questsNow, new Date()) : [];
  return (
    <aside className="session-side" aria-label="This session">
      {full && (
        <section className="side-card">
          <span className="muted side-kicker">This session</span>
          <b className="side-xp accent">+{gains.xp} XP</b>
          {(gains.coins > 0 || gains.crystals > 0) && (
            <Currency r={{ coins: gains.coins, crystals: gains.crystals }} className="currency-row side-currency" />
          )}
        </section>
      )}

      <section className="side-card side-combo">
        <span className="icon-text">
          <Combo /> Combo <b>{combo}</b>
        </span>
        <span className="muted">Best {bestCombo}</span>
      </section>

      {missions.length > 0 && (
        <section className="side-card">
          <span className="muted side-kicker">Missions moving</span>
          {missions.map(({ q, after }) => (
            <div key={q.id} className="rail-mission">
              <div className="quest-card-head">
                <span>{q.name}</span>
                <span className="muted">{after >= q.target ? <Check label="Done" className="done-check" /> : `${after}/${q.target}`}</span>
              </div>
              <div className="xpbar quest-bar">
                <span style={{ width: `${Math.round((after / q.target) * 100)}%` }} />
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="side-card">
        <span className="muted side-kicker">Keyboard</span>
        <dl className="side-keys">
          {KEYS.map(([k, what]) => (
            <div key={k}>
              <dt>
                <kbd>{k}</kbd>
              </dt>
              <dd className="muted">{what}</dd>
            </div>
          ))}
        </dl>
      </section>
    </aside>
  );
}
