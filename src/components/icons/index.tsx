import type { ComponentType } from "react";
import type { IconName } from "@/lib/icons";
import type { IconProps } from "./Icon";
import { Astronaut, Coin, Combo, Crystal, Orbit, Oxygen, Rocket, Shield } from "./game";
import {
  Alert,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BulbOff,
  Check,
  Close,
  Comeback,
  Compass,
  EyeOff,
  Gift,
  Heart,
  HeartEmpty,
  Lock,
  Moon,
  Pencil,
  Play,
  Refresh,
  Slow,
  Sparkles,
  Star,
  StarFilled,
  Store,
  Storm,
  Sunrise,
  Target,
  Timer,
  Volume,
} from "./interface";

export * from "./game";
export * from "./interface";
export type { IconProps, IconSize } from "./Icon";

/**
 * One icon, one meaning, everywhere. Data in src/lib names its icon (see IconName); this is where
 * the name turns into a drawing.
 */
export const ICONS: Record<IconName, ComponentType<IconProps>> = {
  play: Play,
  "arrow-right": ArrowRight,
  "arrow-left": ArrowLeft,
  check: Check,
  close: Close,
  lock: Lock,
  volume: Volume,
  slow: Slow,
  star: Star,
  "star-filled": StarFilled,
  gift: Gift,
  target: Target,
  store: Store,
  alert: Alert,
  timer: Timer,
  heart: Heart,
  "heart-empty": HeartEmpty,
  "eye-off": EyeOff,
  pencil: Pencil,
  storm: Storm,
  refresh: Refresh,
  bookmark: Bookmark,
  compass: Compass,
  comeback: Comeback,
  sparkles: Sparkles,
  "bulb-off": BulbOff,
  sunrise: Sunrise,
  moon: Moon,
  coin: Coin,
  crystal: Crystal,
  shield: Shield,
  orbit: Orbit,
  oxygen: Oxygen,
  combo: Combo,
  rocket: Rocket,
  astronaut: Astronaut,
};

/** An icon picked by name, for data that carries one (a mode, a badge, a reward). */
export function NamedIcon({ name, ...p }: IconProps & { name: IconName }) {
  const Glyph = ICONS[name];
  return <Glyph {...p} />;
}
