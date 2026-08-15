/** Maps our `speed` multiplier (1.0 = normal) onto the SSML `rate` percentage `msedge-tts` expects. */
export function speedToRate(speed: number): string {
  const percent = Math.round((speed - 1) * 100);
  return percent >= 0 ? `+${percent}%` : `${percent}%`;
}
