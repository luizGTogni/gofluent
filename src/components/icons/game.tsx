// The game's own objects, filled. Each one's colour comes from its token (--icon-coin…) through the
// `gf-<name>` class, so it reads the same everywhere; highlights and shades are white/black overlays.
import { Icon, type IconProps } from "./Icon";

const LIGHT = { fill: "#fff", fillOpacity: 0.3 };
const SHADE = { fill: "#000", fillOpacity: 0.16 };
const cls = (name: string, p: IconProps) => `gf-${name}${p.className ? ` ${p.className}` : ""}`;

/** Lunar Coin: a gold coin stamped with a crescent. */
export const Coin = (p: IconProps) => (
  <Icon solid {...p} className={cls("coin", p)}>
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <path d="M2 12a10 10 0 0 0 20 0Z" {...SHADE} />
    <circle cx="12" cy="12" r="7.3" stroke="#000" strokeOpacity={0.2} strokeWidth={1.3} />
    <circle cx="11" cy="12.2" r="4" fill="#000" fillOpacity={0.24} />
    <circle cx="12.9" cy="10.9" r="3.4" fill="currentColor" />
    <path d="M5.3 9.6a7.2 7.2 0 0 1 4.3-4.3" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.5} strokeLinecap="round" />
  </Icon>
);

/** Crystal: a cut gem, lit from the top. */
export const Crystal = (p: IconProps) => (
  <Icon solid {...p} className={cls("crystal", p)}>
    <path d="M7 3.5h10l4.5 5.5L12 21.5 2.5 9Z" fill="currentColor" />
    <path d="M7 3.5h10l4.5 5.5h-19Z" {...LIGHT} />
    <path d="M15 9h6.5L12 21.5Z" {...SHADE} />
    <path d="M9 9 12 21.5 15 9M9 9l3-5.5L15 9" stroke="#fff" strokeOpacity={0.35} strokeWidth={0.9} strokeLinejoin="round" />
  </Icon>
);

/** Streak Shield. */
export const Shield = (p: IconProps) => (
  <Icon solid {...p} className={cls("shield", p)}>
    <path d="M12 2 20 5.2v6.3c0 4.6-3.3 8.4-8 10.5-4.7-2.1-8-5.9-8-10.5V5.2Z" fill="currentColor" />
    <path d="M12 2 4 5.2v6.3c0 4.6 3.3 8.4 8 10.5Z" fill="#fff" fillOpacity={0.22} />
    <path d="M12 5.8 16.8 7.7v3.9c0 2.9-1.9 5.3-4.8 6.7-2.9-1.4-4.8-3.8-4.8-6.7V7.7Z" stroke="#000" strokeOpacity={0.22} strokeWidth={1.3} />
  </Icon>
);

/** Orbit (the streak): a planet with a satellite going round it. */
export const Orbit = (p: IconProps) => (
  <Icon solid {...p} className={cls("orbit", p)}>
    <g transform="rotate(-22 12 12)">
      <path d="M1.5 12a10.5 4 0 0 1 21 0" stroke="currentColor" strokeOpacity={0.55} strokeWidth={1.6} />
    </g>
    <circle cx="12" cy="12" r="5.3" fill="currentColor" />
    <path d="M6.7 12a5.3 5.3 0 0 0 10.6 0Z" {...SHADE} />
    <circle cx="10.2" cy="10.2" r="1.5" fill="#fff" fillOpacity={0.45} />
    <g transform="rotate(-22 12 12)">
      <path d="M22.5 12a10.5 4 0 0 1-21 0" stroke="currentColor" strokeWidth={1.6} />
      <circle cx="21.6" cy="13.7" r="1.9" fill="currentColor" />
    </g>
  </Icon>
);

/** Oxygen Extra: a few bubbles of air. */
export const Oxygen = (p: IconProps) => (
  <Icon solid {...p} className={cls("oxygen", p)}>
    {[
      [9.5, 14, 6.5],
      [17.8, 6.3, 3.6],
      [19.2, 15.8, 2.3],
    ].map(([cx, cy, r]) => (
      <g key={cx}>
        <circle cx={cx} cy={cy} r={r} fill="currentColor" fillOpacity={0.35} stroke="currentColor" strokeWidth={1.5} />
        <path
          d={`M${cx - r * 0.6} ${cy - r * 0.1}a${r * 0.6} ${r * 0.6} 0 0 1 ${r * 0.5} -${r * 0.5}`}
          stroke="#fff"
          strokeOpacity={0.8}
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      </g>
    ))}
  </Icon>
);

/** Combo: a lightning bolt. */
export const Combo = (p: IconProps) => (
  <Icon solid {...p} className={cls("combo", p)}>
    <path d="M13.5 2 4 13.5h7L10 22l10-12.5h-7Z" fill="currentColor" />
    <path d="M13.5 2 4 13.5h7Z" {...LIGHT} />
  </Icon>
);

/** The learner's rocket, pointing up and to the right. */
export const Rocket = (p: IconProps) => (
  <Icon solid {...p} className={cls("rocket", p)}>
    <g transform="translate(12 12) rotate(45) scale(1.18) translate(-12 -12)">
      <path d="M9.8 17.3h4.4L12 22.6Z" style={{ fill: "var(--icon-flame)" }} />
      <path d="M8.4 11.3 5 15.1l.6 2.9L9 16ZM15.6 11.3 19 15.1l-.6 2.9L15 16Z" style={{ fill: "var(--icon-rocket-fin)" }} />
      <path d="M12 1.6c3.4 2.4 4.6 6.6 4 11.3l-1 4.4H9l-1-4.4c-.6-4.7.6-8.9 4-11.3Z" fill="currentColor" />
      <path d="M12 1.6c3.4 2.4 4.6 6.6 4 11.3l-1 4.4h-3Z" {...SHADE} />
      <circle cx="12" cy="8.6" r="2.1" style={{ fill: "var(--icon-visor)" }} />
    </g>
  </Icon>
);

/** The learner: an astronaut's helmet. */
export const Astronaut = (p: IconProps) => (
  <Icon solid {...p} className={cls("astronaut", p)}>
    <rect x="6.5" y="18.5" width="11" height="4" rx="2" fill="currentColor" fillOpacity={0.75} />
    <circle cx="12" cy="11" r="9.3" fill="currentColor" />
    <path d="M2.7 11a9.3 9.3 0 0 0 18.6 0Z" {...SHADE} />
    <rect x="5.3" y="6.8" width="13.4" height="8.6" rx="4.3" style={{ fill: "var(--icon-visor)" }} />
    <path d="M8 10a2.8 2.8 0 0 1 2.4-1.6" stroke="#fff" strokeOpacity={0.7} strokeWidth={1.4} strokeLinecap="round" />
  </Icon>
);
