// Pings each saved model with each saved key (or the models posted, to try a list before saving).
import { adminClient } from "@/lib/adminServer";
import { answeredModels, failedModels, pingModels } from "@/lib/nim";

export const maxDuration = 60;

export async function POST(request: Request) {
  const db = await adminClient(request);
  if (db instanceof Response) return db;
  const body = (await request.json().catch(() => null)) as { models?: unknown } | null;
  const { data: settings, error } = await db.rpc("admin_ai_credentials");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!settings?.apiKeys?.length) return Response.json({ error: "Save an NVIDIA NIM API key first" }, { status: 400 });
  const posted = Array.isArray(body?.models) ? body.models.filter((m): m is string => typeof m === "string" && m.trim() !== "").map((m) => m.trim()) : [];
  const models = (posted.length ? posted : (settings.models as string[])).slice(0, 4);

  const attempts = await pingModels(settings.apiKeys, models);
  await db.rpc("admin_model_health", { p_failed: failedModels(attempts), p_ok: answeredModels(attempts) });
  return Response.json({ attempts });
}
