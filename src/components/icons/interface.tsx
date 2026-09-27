// Interface icons: outlines in currentColor. Shapes adapted from Lucide (https://lucide.dev),
// ISC/MIT licensed — Copyright (c) Lucide Contributors 2022, Copyright (c) Cole Bemis 2013-2022.
import { Icon, type IconProps } from "./Icon";

export const Play = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 3.8v16.4a.8.8 0 0 0 1.2.7l13.4-8.2a.8.8 0 0 0 0-1.4L7.2 3.1a.8.8 0 0 0-1.2.7Z" />
  </Icon>
);

export const ArrowRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </Icon>
);

export const ArrowLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </Icon>
);

export const Check = (p: IconProps) => (
  <Icon strokeWidth={2.5} {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
);

export const Close = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Icon>
);

export const Lock = (p: IconProps) => (
  <Icon {...p}>
    <rect width="16" height="11" x="4" y="11" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Icon>
);

export const Volume = (p: IconProps) => (
  <Icon {...p}>
    <path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6a1.4 1.4 0 0 1-1 .4H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5Z" />
    <path d="M16 9a5 5 0 0 1 0 6" />
    <path d="M19.4 18.4a9 9 0 0 0 0-12.8" />
  </Icon>
);

/** Slowed-down audio: a gauge with its needle low. */
export const Slow = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.3 19a10 10 0 1 1 17.4 0" />
    <path d="m12 15-4.5-3" />
    <circle cx="12" cy="15" r="1" />
  </Icon>
);

const STAR = "M11.5 2.3a.5.5 0 0 1 1 0l2.3 4.7a2.1 2.1 0 0 0 1.6 1.2l5.2.7a.5.5 0 0 1 .3.9l-3.8 3.7a2.1 2.1 0 0 0-.6 1.8l.9 5.2a.5.5 0 0 1-.8.5l-4.6-2.4a2.1 2.1 0 0 0-2 0L6.4 21a.5.5 0 0 1-.8-.5l.9-5.2a2.1 2.1 0 0 0-.6-1.8L2.2 9.8a.5.5 0 0 1 .3-.9l5.1-.7a2.1 2.1 0 0 0 1.6-1.2Z";

export const Star = (p: IconProps) => (
  <Icon {...p}>
    <path d={STAR} />
  </Icon>
);

export const StarFilled = (p: IconProps) => (
  <Icon {...p}>
    <path d={STAR} fill="currentColor" />
  </Icon>
);

export const Gift = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="8" width="18" height="4" rx="1" />
    <path d="M12 8v13" />
    <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
    <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
  </Icon>
);

export const Target = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <circle cx="12" cy="12" r="5.5" />
    <circle cx="12" cy="12" r="1.5" />
  </Icon>
);

export const Store = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 2.5 3 6.5v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-13l-3-4Z" />
    <path d="M3 6.5h18" />
    <path d="M16 10.5a4 4 0 0 1-8 0" />
  </Icon>
);

/** Tricky words: the ones that trip you up. */
export const Alert = (p: IconProps) => (
  <Icon {...p}>
    <path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </Icon>
);

export const Timer = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 2h4" />
    <path d="m12 14 3-3" />
    <circle cx="12" cy="14" r="8" />
  </Icon>
);

const HEART = "M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z";

/** A life left (Survival). */
export const Heart = (p: IconProps) => (
  <Icon {...p}>
    <path d={HEART} fill="currentColor" />
  </Icon>
);

/** A life lost. */
export const HeartEmpty = (p: IconProps) => (
  <Icon {...p}>
    <path d={HEART} />
  </Icon>
);

export const EyeOff = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10.7 5.1a10.7 10.7 0 0 1 11.2 6.6 1 1 0 0 1 0 .7 10.7 10.7 0 0 1-1.4 2.5" />
    <path d="M14.1 14.2a3 3 0 0 1-4.3-4.3" />
    <path d="M17.5 17.5a10.8 10.8 0 0 1-15.4-5.2 1 1 0 0 1 0-.7 10.8 10.8 0 0 1 4.4-5.1" />
    <path d="m2 2 20 20" />
  </Icon>
);

export const Pencil = (p: IconProps) => (
  <Icon {...p}>
    <path d="M21.2 6.8a1 1 0 0 0-4-4L3.8 16.2a2 2 0 0 0-.5.8L2 21.4a.5.5 0 0 0 .6.6l4.4-1.3a2 2 0 0 0 .8-.5Z" />
    <path d="m15 5 4 4" />
  </Icon>
);

/** Solar Storm. */
export const Storm = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" />
  </Icon>
);

/** Do it again: replay the audio of an exercise, play a mode again. */
export const Refresh = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 1 0 9-9 9.8 9.8 0 0 0-6.7 2.7L3 8" />
    <path d="M3 3v5h5" />
  </Icon>
);

/** Saved for later (My words). */
export const Bookmark = (p: IconProps) => (
  <Icon {...p}>
    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" />
  </Icon>
);

/** Free mode: explore on your own terms. */
export const Compass = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="m16.2 7.8-1.8 5.4a2 2 0 0 1-1.3 1.3l-5.3 1.7 1.8-5.4a2 2 0 0 1 1.3-1.3Z" />
  </Icon>
);

/** A comeback: nailing what used to trip you up. */
export const Comeback = (p: IconProps) => (
  <Icon {...p}>
    <path d="M16 7h6v6" />
    <path d="m22 7-8.5 8.5-5-5L2 17" />
  </Icon>
);

export const Sparkles = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9.9 15.5a2 2 0 0 0-1.4-1.4l-6.1-1.6a.5.5 0 0 1 0-1l6.1-1.6a2 2 0 0 0 1.4-1.4l1.6-6.1a.5.5 0 0 1 1 0l1.6 6.1a2 2 0 0 0 1.4 1.4l6.1 1.6a.5.5 0 0 1 0 1l-6.1 1.6a2 2 0 0 0-1.4 1.4l-1.6 6.1a.5.5 0 0 1-1 0Z" />
    <path d="M20 3v4M22 5h-4" />
  </Icon>
);

export const BulbOff = (p: IconProps) => (
  <Icon {...p}>
    <path d="M16.8 11.2c.8-.9 1.2-2 1.2-3.2a6 6 0 0 0-9.3-5" />
    <path d="m2 2 20 20" />
    <path d="M6.3 6.3a4.7 4.7 0 0 0 1.2 5.2c.7.7 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6M10 22h4" />
  </Icon>
);

export const Sunrise = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 2v8M4.9 10.9l1.4 1.4M2 18h2M20 18h2M19.1 10.9l-1.4 1.4M22 22H2" />
    <path d="m8 6 4-4 4 4" />
    <path d="M16 18a4 4 0 0 0-8 0" />
  </Icon>
);

export const Moon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </Icon>
);
