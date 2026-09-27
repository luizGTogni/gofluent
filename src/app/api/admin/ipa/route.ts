// For new words: American IPA from CMUdict, and a guess at the part of speech from the phrase the
// word is used in. { words: string[], contexts?: { [word]: sentence } } →
// { ipa: { [word]: string | null }, pos: { [word]: Pos | null } }.
import { dictionary } from "cmu-pronouncing-dictionary";
import { adminClient } from "@/lib/adminServer";
import { arpabetToIpa } from "@/lib/ipa";
import { guessPos } from "@/lib/posGuess";
import type { Pos } from "@/lib/exercises";

export async function POST(request: Request) {
  const db = await adminClient(request);
  if (db instanceof Response) return db;
  const body = (await request.json().catch(() => null)) as { words?: unknown; contexts?: unknown } | null;
  const words = Array.isArray(body?.words) ? body.words.filter((w): w is string => typeof w === "string").slice(0, 1000) : [];
  const contexts = body?.contexts && typeof body.contexts === "object" ? (body.contexts as Record<string, unknown>) : {};
  const ipa: Record<string, string | null> = {};
  const pos: Record<string, Pos | null> = {};
  for (const w of words) {
    const arpabet = dictionary[w.toLowerCase()];
    ipa[w] = arpabet ? arpabetToIpa(arpabet) : null;
    const sentence = contexts[w];
    pos[w] = guessPos(w, typeof sentence === "string" ? sentence.slice(0, 300) : undefined);
  }
  return Response.json({ ipa, pos });
}
