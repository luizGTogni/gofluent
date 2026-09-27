import { rankGoal } from "@/lib/ranks";

/** A lock's visible goal: "Comet · 32 XP to go", with a mini bar of the way already covered. */
export function RankGoal({ rp, index }: { rp: number; index: number }) {
  const g = rankGoal(rp, index);
  return (
    <span className="rank-goal">
      <span className="rank-goal-text">
        🔒 {g.title.name} · {g.xpLeft} XP to go
      </span>
      <span className="xpbar rank-goal-bar" aria-hidden>
        <span style={{ width: `${g.pct}%` }} />
      </span>
    </span>
  );
}
