"use client";

import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import type { StudyCalendar } from "@/lib/economyStore";
import { coinsForXp, milestoneReward } from "@/lib/economy";
import { plural } from "@/lib/format";
import { daysAround, firstDay, longDate, mondayIndex, nextMilestone, orbitSummary, trackPosition, WEEKDAYS } from "@/lib/heatmap";
import { currencyText, type Amounts } from "@/lib/rewards";
import { addDays, computeStreak, milestoneHit, MILESTONES } from "@/lib/streak";
import { Currency } from "./Currency";
import { Check, Gift, Orbit, Play, Shield } from "./icons";

type Props = {
  calendar: StudyCalendar;
  today: string;
  shields: number;
  /** Starts a session right away; false while there's nothing to play. */
  canStudy: boolean;
  onStudy: () => void;
  onShop: () => void;
  /** Where the day's rewards fly to when the card celebrates a newly secured day. */
  walletRef?: RefObject<HTMLElement | null>;
};

/** Stats need a few days before they say anything. */
const STATS_FROM_DAYS = 3;
/** The last day the card celebrated securing, so it plays once per day. */
const K_CELEBRATED = "gofluent:orbitCelebrated";

/**
 * "before": today's check-in hidden, the card as it was; "after": the same markup with it back,
 * so CSS transitions grow the ring, the chain and today's circle; null: at rest, no transitions.
 */
type Phase = "before" | "after" | null;
type Fly = { id: number; amounts: Amounts; x: number; y: number; dx: number; dy: number; delay: number };

type DayKind = "done" | "shield" | "pending" | "missed" | "unstarted" | "upcoming";
const DAY_NAME: Record<DayKind, string> = {
  done: "studied",
  shield: "covered by a Streak Shield",
  pending: "not studied yet",
  missed: "missed",
  unstarted: "before your first orbit",
  upcoming: "upcoming",
};

/**
 * The profile's orbit card: the streak in a ring that fills toward the next milestone, today's
 * status and a way to secure it, the last seven days as a chain, the milestone track, one line of
 * stats. Its height never depends on the state, so securing the day doesn't move the page.
 */
export function StreakCard({ calendar, today, shields, canStudy, onStudy, onShop, walletRef }: Props) {
  const { checked, frozen, volume } = calendar;
  const secured = checked.has(today);
  const [phase, setPhase] = useState<Phase>(null);
  const [flying, setFlying] = useState<Fly[]>([]);
  const ringRef = useRef<HTMLSpanElement>(null);

  const real = computeStreak(checked, frozen, today);
  const hit = secured ? milestoneHit(real.current - 1, real.current) : null;

  // Once per day, the first time the card is seen after securing it, replay the moment.
  useLayoutEffect(() => {
    if (!secured || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (localStorage.getItem(K_CELEBRATED) === today) return;
    } catch {
      return;
    }
    setPhase("before");
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        try {
          localStorage.setItem(K_CELEBRATED, today);
        } catch {
          /* no storage: it just won't remember */
        }
        setPhase("after");
        setFlying(flights(ringRef.current, walletRef?.current ?? null, today));
      });
    });
    const done = setTimeout(() => {
      setPhase(null);
      setFlying([]);
    }, 1800);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
    // `flights` reads volume through the closure; the replay is keyed on the day alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secured, today]);

  // What the card draws: without today's check-in while it's about to replay it.
  const shown = useMemo(() => {
    if (phase !== "before") return checked;
    const c = new Set(checked);
    c.delete(today);
    return c;
  }, [checked, phase, today]);

  const streak = phase === "before" ? computeStreak(shown, frozen, today) : real;
  const next = nextMilestone(streak.current);
  // Reaching a milestone today: the ring fills all the way before it starts on the next one.
  const pct = phase === "after" && hit ? 100 : (next?.pct ?? 100);
  const summary = orbitSummary(checked, volume, today);

  function flights(from: HTMLElement | null, to: HTMLElement | null, day: string): Fly[] {
    if (!from || !to) return [];
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    const each: Amounts[] = [];
    const coins = coinsForXp(volume.get(day)?.xp ?? 0) + (hit ? milestoneReward(hit).coins : 0);
    if (coins) each.push({ coins });
    if (hit) {
      const r = milestoneReward(hit);
      if (r.crystals) each.push({ crystals: r.crystals });
      if (r.freezes) each.push({ freezes: r.freezes });
    }
    const x = a.left + a.width / 2;
    const y = a.top + a.height / 2;
    return each.map((amounts, i) => ({ id: i, amounts, x, y, dx: b.left + b.width / 2 - x, dy: b.top + b.height / 2 - y, delay: 350 + i * 120 }));
  }

  const stats =
    summary.total >= STATS_FROM_DAYS
      ? [
          `${plural(summary.thisMonth, "day")} this month`,
          `${summary.total} total`,
          summary.avgPhrases === null ? null : `~${Math.round(summary.avgPhrases)} phrases/day`,
        ]
          .filter(Boolean)
          .join(" · ")
      : "";

  return (
    <section
      className={`profile-card streak-card ${phase ? `replay ${phase}` : ""}`}
      aria-label={`Orbit: ${plural(real.current, "day")} in a row, best ${plural(real.longest, "day")}. ${secured ? "Today is secured." : "Not studied yet today."}`}
    >
      <div className="orbit-head">
        <OrbitRing ref={ringRef} current={streak.current} pct={pct} />
        <div className="orbit-title">
          <p className="orbit-name">
            <b>{streak.current ? "Orbit streak" : "Start your orbit"}</b>
            {real.longest > real.current && <span className="muted">Best: {plural(real.longest, "day")}</span>}
          </p>
          {next ? (
            <p className="orbit-next">
              <span className="icon-text">
                {plural(next.left, "day")} to <Gift className="accent" /> {next.target}-day orbit
              </span>
              <RewardChips reward={next.reward} />
            </p>
          ) : (
            <p className="orbit-next">Every orbit milestone reached. Legendary.</p>
          )}
        </div>
        <div className="orbit-actions">
          {secured ? (
            <span className="orbit-slot orbit-secured icon-text">
              <Check /> Secured today
            </span>
          ) : (
            <button
              type="button"
              className="orbit-slot orbit-study icon-text"
              disabled={!canStudy}
              title={canStudy ? undefined : "Your journey stop has no phrases yet"}
              onClick={onStudy}
            >
              <Play /> Study now
            </button>
          )}
          <button
            type="button"
            className="chip-mini chip-link orbit-shields icon-text"
            onClick={onShop}
            title="Streak Shields cover a missed day. Get more in the Store."
            aria-label={`${plural(shields, "Streak Shield")}. Open the Store`}
          >
            <Shield /> {shields}
          </button>
        </div>
      </div>

      <WeekChain
        checked={shown}
        frozen={frozen}
        today={today}
        // The day the next milestone lands if the orbit holds: counting today once it's secured.
        milestoneDay={next ? addDays(today, next.left - (shown.has(today) ? 0 : 1)) : null}
      />

      <MilestoneTrack current={streak.current} />

      <p className="orbit-stats" aria-hidden={!stats}>
        {stats}
      </p>

      {flying.map((f) => (
        <span
          key={f.id}
          className="orbit-fly"
          aria-hidden
          style={{ left: f.x, top: f.y, "--dx": `${f.dx}px`, "--dy": `${f.dy}px`, animationDelay: `${f.delay}ms` } as CSSProperties}
        >
          <Currency r={f.amounts} />
        </span>
      ))}
    </section>
  );
}

/** Progress toward the next milestone as a ring; the streak inside, or the orbit icon before day one. */
function OrbitRing({ current, pct, ref }: { current: number; pct: number; ref: RefObject<HTMLSpanElement | null> }) {
  const r = 27;
  const c = 2 * Math.PI * r;
  return (
    <span ref={ref} className="orbit-ring" aria-hidden>
      <svg viewBox="0 0 64 64">
        <circle className="orbit-ring-track" cx="32" cy="32" r={r} />
        <circle
          className="orbit-ring-fill"
          cx="32"
          cy="32"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          transform="rotate(-90 32 32)"
          opacity={pct > 0 ? 1 : 0}
        />
      </svg>
      <span className={`orbit-ring-num ${current ? "" : "empty"}`}>{current || <Orbit />}</span>
    </span>
  );
}

function RewardChips({ reward }: { reward: Amounts }) {
  return (
    <span className="orbit-rewards" role="img" aria-label={`Reward: ${currencyText(reward)}`}>
      {(["coins", "crystals", "freezes"] as const)
        .filter((k) => reward[k])
        .map((k) => (
          <span key={k} className="orbit-reward" aria-hidden>
            <Currency r={{ [k]: reward[k] }} signed={false} />
          </span>
        ))}
    </span>
  );
}

// Day column geometry, mirrored in globals.css (.orbit-week: --day, --day-gap).
const DAY = 36;
const DAY_GAP = 4;
/** Days before today in the strip; the rest of the width is filled with upcoming days. */
const PAST_DAYS = 4;

/**
 * The last few days, today, and as many upcoming days as the card's width holds. Covered days
 * next to each other are joined into a chain; upcoming days are dim, the next milestone's day
 * holds a gift.
 */
function WeekChain({ checked, frozen, today, milestoneDay }: { checked: ReadonlySet<string>; frozen: ReadonlySet<string>; today: string; milestoneDay: string | null }) {
  const listRef = useRef<HTMLOListElement>(null);
  const [count, setCount] = useState(7);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const fit = () => setCount(Math.max(PAST_DAYS + 3, Math.floor((el.clientWidth + DAY_GAP) / (DAY + DAY_GAP))));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const days = daysAround(today, PAST_DAYS, count);
  const first = firstDay(checked, frozen);
  const kind = (day: string): DayKind =>
    checked.has(day)
      ? "done"
      : frozen.has(day)
        ? "shield"
        : day === today
          ? "pending"
          : day > today
            ? "upcoming"
            : !first || day < first
              ? "unstarted"
              : "missed";
  const covered = (k: DayKind) => k === "done" || k === "shield";
  const kinds = days.map(kind);
  return (
    <ol ref={listRef} className="orbit-week" aria-label="The days around today">
      {days.map((day, i) => {
        const k = kinds[i];
        return (
          <li
            key={day}
            className={`orbit-day ${k} ${day === today ? "today" : ""}`}
            aria-label={`${longDate(day)}${day === today ? " (today)" : ""}: ${DAY_NAME[k]}${day === milestoneDay ? ", next orbit milestone" : ""}`}
          >
            <span className="orbit-day-name" aria-hidden>
              {WEEKDAYS[mondayIndex(day)]}
            </span>
            <span className="orbit-day-num" aria-hidden>
              {Number(day.slice(8))}
            </span>
            <span className="orbit-dot" aria-hidden>
              {k === "done" ? <Check /> : k === "shield" ? <Shield /> : day === milestoneDay && k === "upcoming" ? <Gift /> : null}
            </span>
            {i < days.length - 1 && <span className={`orbit-link ${covered(k) && covered(kinds[i + 1]) ? "on" : ""}`} aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

/** 7 · 30 · 100 · 365 on one line, evenly spaced, with where the streak is now; each shows its reward. */
function MilestoneTrack({ current }: { current: number }) {
  const [open, setOpen] = useState<number | null>(null);
  const pos = trackPosition(current);
  return (
    <div className="orbit-track" onMouseLeave={() => setOpen(null)}>
      <div className="orbit-track-inner">
        <span className="orbit-track-line" aria-hidden>
          <span className="orbit-track-fill" style={{ width: `${pos}%` }} />
        </span>
        <span className="orbit-track-you" style={{ left: `${pos}%` }} aria-hidden />
        <ol className="orbit-ms-list" aria-label="Orbit milestones">
          {MILESTONES.map((m, i) => {
            const reached = current >= m;
            const reward = milestoneReward(m);
            return (
              <li
                key={m}
                className={`orbit-ms ${reached ? "reached" : ""} ${open === m ? "open" : ""} ${i === MILESTONES.length - 1 ? "last" : ""}`}
                style={{ left: `${((i + 1) / MILESTONES.length) * 100}%` }}
              >
                <button
                  type="button"
                  className="orbit-ms-dot"
                  aria-label={`${m}-day orbit${reached ? ", reached" : ""}: ${currencyText(reward)}`}
                  aria-expanded={open === m}
                  onClick={() => setOpen(open === m ? null : m)}
                  onMouseEnter={() => setOpen(m)}
                  onBlur={() => setOpen(null)}
                >
                  {reached ? <Check /> : <Gift />}
                </button>
                <span className="orbit-ms-label" aria-hidden>
                  {m}
                </span>
                <span className="orbit-ms-tip" aria-hidden>
                  <b className="icon-text">
                    {m}-day orbit{reached && <Check className="done-check" />}
                  </b>
                  <Currency r={reward} />
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
