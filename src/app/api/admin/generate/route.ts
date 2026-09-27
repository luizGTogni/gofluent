// Drafts phrases with NVIDIA NIM for the admin to review: { planet, count, theme?, word?, avoid? }.
// Falls back through the saved models (src/lib/nim.ts) and records which ones failed.
import { adminClient } from "@/lib/adminServer";
import { answeredModels, failedModels, generatePhrases, type NimSettings } from "@/lib/nim";
import { PLANET_BY_ID, isPlanetId } from "@/lib/planets";

// Reasoning models can think for minutes, and a fallback may follow.
export const maxDuration = 300;

export async function POST(request: Request) {
  const db = await adminClient(request);
  if (db instanceof Response) return db;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !isPlanetId(body.planet)) return Response.json({ error: "Pick a planet" }, { status: 400 });
  const count = Math.min(50, Math.max(1, Math.round(Number(body.count) || 20)));
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : undefined);
  const avoid = Array.isArray(body.avoid) ? body.avoid.filter((a): a is string => typeof a === "string").slice(0, 150) : [];

  const { data: settings, error } = await db.rpc("admin_ai_credentials");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!settings?.apiKeys?.length) return Response.json({ error: "Save an NVIDIA NIM API key in Settings first" }, { status: 400 });

  const result = await generatePhrases(settings as NimSettings, { planet: PLANET_BY_ID.get(body.planet)!, count, theme: text(body.theme), word: text(body.word), avoid });
  await db.rpc("admin_model_health", { p_failed: failedModels(result.attempts), p_ok: answeredModels(result.attempts) });
  return Response.json(result, { status: result.error ? 502 : 200 });
}
