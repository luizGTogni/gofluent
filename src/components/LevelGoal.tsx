import { levelGoal } from "@/lib/xp";
import { Lock } from "./icons";

/** A lock's visible goal: "Level 4 · 320 XP to go", with a mini bar of the way already covered. */
export function LevelGoal({ rp, level }: { rp: number; level: number }) {
  const g = levelGoal(rp, level);
  return (
    <span className="rank-goal">
      <span className="rank-goal-text icon-text">
        <Lock /> Level {level} · {g.xpLeft} XP to go
      </span>
      <span className="xpbar rank-goal-bar" aria-hidden>
        <span style={{ width: `${g.pct}%` }} />
      </span>
    </span>
  );
}
