export const audioSlug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Site-relative path, as stored in the database (phrases.audio_path). */
export const audioPath = (text: string) => `/audio/${audioSlug(text)}.mp3`;

/**
 * Where the browser loads audio from. Empty by default (served from /public);
 * set NEXT_PUBLIC_AUDIO_BASE_URL to move files to a bucket or CDN without code changes.
 */
export const audioUrl = (text: string, accent: "us" | "gb" = "us") => {
  const base = (process.env.NEXT_PUBLIC_AUDIO_BASE_URL ?? "").replace(/\/+$/, "");
  return accent === "gb" ? `${base}/audio/gb/${audioSlug(text)}.mp3` : `${base}${audioPath(text)}`;
};
