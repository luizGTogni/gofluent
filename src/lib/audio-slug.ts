export const audioSlug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const audioUrl = (text: string) => `/audio/${audioSlug(text)}.mp3`;
