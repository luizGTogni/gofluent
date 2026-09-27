// Kept dependency-free so scripts can load it directly.

export type GameMode = "classic" | "timeAttack" | "survival" | "boss" | "blind";

export type ModeInfo = { id: GameMode; name: string; blurb: string; icon: string };

/** The modes offered from the "Free mode" picker. `classic` is today's default session, named. */
export const MODES: ModeInfo[] = [
  { id: "classic", name: "Classic Dictation", blurb: "Today's mix, at your own pace — the mode you already know.", icon: "📝" },
  { id: "timeAttack", name: "Time Attack", blurb: "60 seconds on the clock. Type as many phrases as you can.", icon: "⏱️" },
  { id: "survival", name: "Survival", blurb: "3 lives. Every mistake costs one — how far can you get?", icon: "❤️" },
  { id: "boss", name: "Solar Storm", blurb: "One long, tough phrase. Beat it to clear the level.", icon: "☀️" },
  { id: "blind", name: "Blind Dictation", blurb: "No text, no translation, no gaps — just the audio.", icon: "🙈" },
];

export const TIME_ATTACK_SECONDS = 60;
export const SURVIVAL_LIVES = 3;
