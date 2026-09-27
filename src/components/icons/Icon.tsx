import type { CSSProperties, ReactNode } from "react";

export type IconSize = "sm" | "md" | "lg" | "xl";

export type IconProps = {
  /** A size class (sm 14 · md 18 · lg 28 · xl 48px) or pixels; by default 1em, so it follows the text. */
  size?: IconSize | number;
  className?: string;
  /** For an icon that means something on its own: read out, and shown as a tooltip. Otherwise hidden from screen readers. */
  label?: string;
  strokeWidth?: number;
  style?: CSSProperties;
};

/**
 * The one SVG shell every icon shares: 24×24, 1.75 strokes in currentColor. `solid` icons are the
 * game's own objects (coins, crystals, shields…), filled in their brand colour instead.
 */
export function Icon({ size, className, label, strokeWidth = 1.75, style, solid = false, children }: IconProps & { solid?: boolean; children: ReactNode }) {
  const px = typeof size === "number" ? size : undefined;
  const classes = ["gf-icon", solid && "gf-icon-solid", typeof size === "string" && `icon-${size}`, className].filter(Boolean).join(" ");
  return (
    <svg
      viewBox="0 0 24 24"
      width={px ?? "1em"}
      height={px ?? "1em"}
      className={classes}
      style={style}
      fill="none"
      stroke={solid ? "none" : "currentColor"}
      strokeWidth={solid ? undefined : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {label && <title>{label}</title>}
      {children}
    </svg>
  );
}
