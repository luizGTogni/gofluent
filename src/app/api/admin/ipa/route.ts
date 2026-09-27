// American IPA for words, from CMUdict: { words: string[] } → { ipa: { [word]: string | null } }.
import { dictionary } from "cmu-pronouncing-dictionary";
import { adminClient } from "@/lib/adminServer";
import { arpabetToIpa } from "@/lib/ipa";

export async function POST(request: Request) {
  const db = await adminClient(request);
  if (db instanceof Response) return db;
  const body = (await request.json().catch(() => null)) as { words?: unknown } | null;
  const words = Array.isArray(body?.words) ? body.words.filter((w): w is string => typeof w === "string").slice(0, 1000) : [];
  const ipa: Record<string, string | null> = {};
  for (const w of words) {
    const arpabet = dictionary[w.toLowerCase()];
    ipa[w] = arpabet ? arpabetToIpa(arpabet) : null;
  }
  return Response.json({ ipa });
}
