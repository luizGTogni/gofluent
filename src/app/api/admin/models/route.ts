// The NIM catalog's model ids, for suggestions in the settings form.
import { adminClient } from "@/lib/adminServer";

export async function POST(request: Request) {
  const db = await adminClient(request);
  if (db instanceof Response) return db;
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/models", { signal: AbortSignal.timeout(15_000) });
    const data = (await res.json()) as { data?: { id: string }[] };
    return Response.json({ models: (data.data ?? []).map((m) => m.id).sort() });
  } catch {
    return Response.json({ models: [] });
  }
}
