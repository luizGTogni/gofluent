import { stopGoal, type PlanetStat } from "@/lib/planetStats";
import { Lock } from "./icons";

type Props = {
  /** The stop whose progress this is (the previous one, for a lock). */
  name: string;
  stat?: PlanetStat;
  count: number;
  /** An open stop's own progress, rather than a lock's requirement. */
  own?: boolean;
};

/** A stop's visible goal: "Finish Venus · 4/10" behind a lock, with a mini bar, or its own "4/10 to finish". */
export function StopGoal({ name, stat, count, own = false }: Props) {
  if (count === 0)
    return (
      <span className="rank-goal-text icon-text">
        {own ? (
          "Phrases coming soon"
        ) : (
          <>
            <Lock /> After {name} · coming soon
          </>
        )}
      </span>
    );
  const goal = stopGoal(count);
  const solid = Math.min(goal, stat?.solid ?? 0);
  return (
    <span className="rank-goal">
      <span className="rank-goal-text icon-text">
        {own ? (
          `${solid}/${goal} to finish`
        ) : (
          <>
            <Lock /> Finish {name} · {solid}/{goal}
          </>
        )}
      </span>
      <span className="xpbar rank-goal-bar" aria-hidden>
        <span style={{ width: `${Math.round((solid / goal) * 100)}%` }} />
      </span>
    </span>
  );
}
