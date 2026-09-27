// Phrase generation with NVIDIA NIM (OpenAI-compatible chat completions). Server-only: the API key
// comes from the ai_settings row through the admin's own session (see /api/admin/generate).
import { MAX_WORDS } from "./contentText";
import type { Planet } from "./planets";

export const NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

export type GenerateRequest = { planet: Planet; count: number; theme?: string; word?: string; avoid: string[] };
export type Generated = { en: string; pt: string };

const LEVEL_NOTES: Record<string, string> = {
  A1: "Very simple, high-frequency words; present tense; short.",
  A2: "Simple everyday language; present, past and future with 'going to'.",
  B1: "Everyday situations with some detail; common phrasal verbs are fine.",
  B2: "Natural conversation, opinions and plans; contractions are fine.",
  C1: "Idiomatic, nuanced language and common expressions; contractions are fine.",
  C2: "Fast, natural native-speaker speech like in series and films; contractions are fine.",
};

export function buildMessages({ planet, count, theme, word, avoid }: GenerateRequest) {
  const system = [
    "You write English practice phrases for adult Brazilian Portuguese speakers learning English by listening and typing what they hear.",
    "The content must be friendly, encouraging and useful in real life. Never frightening, sad, violent, sexual, political, religious or about illness and death.",
    "Reply with JSON only, no commentary: {\"phrases\": [{\"en\": \"...\", \"pt\": \"...\"}]}.",
  ].join(" ");
  const rules = [
    `Write ${count} different items for CEFR level ${planet.cefr} on the topic "${planet.topic}"${theme ? `, theme: "${theme}"` : ""}.`,
    word ? `Every item must contain the exact word "${word}".` : "",
    LEVEL_NOTES[planet.cefr] ?? "",
    word
      ? "Lengths: mostly sentences of 3-6 words, a few of 2 words or of 7-9 words. Never more than " + MAX_WORDS + " words."
      : "Mix of lengths: about 20% single words, 30% short phrases of 2-3 words, 50% sentences of 4-6 words. At most a few of 7-9 words. Never more than " + MAX_WORDS + " words.",
    "English: lowercase, except \"I\" and proper names. No punctuation at all (no . , ! ? or quotes). Write numbers as words, never digits.",
    planet.cefr === "A1" || planet.cefr === "A2" || planet.cefr === "B1" ? "No contractions: write \"I am\", \"do not\"." : "",
    "Portuguese: a natural Brazilian Portuguese translation, with normal punctuation and accents.",
    avoid.length ? `Do not repeat any of these existing items: ${avoid.join("; ")}.` : "",
  ];
  return [
    { role: "system", content: system },
    { role: "user", content: rules.filter(Boolean).join("\n") },
  ];
}

/** The phrases in a model reply: JSON if possible (thinking stripped), else "en | pt" lines. */
export function parseGenerated(reply: string): Generated[] {
  const text = reply.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const data = JSON.parse(text.slice(start, end + 1)) as { phrases?: { en?: unknown; pt?: unknown }[] };
      const rows = (data.phrases ?? []).filter((p) => typeof p.en === "string" && typeof p.pt === "string");
      if (rows.length) return rows.map((p) => ({ en: String(p.en).trim(), pt: String(p.pt).trim() }));
    } catch {
      /* fall through to lines */
    }
  }
  return text
    .split("\n")
    .map((l) => l.split("|").map((s) => s.trim()))
    .filter(([en, pt]) => en && pt)
    .map(([en, pt]) => ({ en, pt }));
}

export type NimSettings = { apiKeys: string[]; models: string[]; reasoning: boolean; failures: Record<string, string> };
/** One call: `key` is 1 or 2; `keyIssue` marks a failure of the key (rate limit, refused), not of the model. */
export type Attempt = { model: string; key: number; ok: boolean; ms: number; error?: string; keyIssue?: boolean };

/** How long a model that failed is tried only after the healthy ones. */
export const COOLDOWN_MS = 10 * 60_000;
/**
 * The default chain (also the default in migration 0026): strong in Portuguese and at following a
 * format, and less crowded than the popular coding models; Nemotron Super as the last resort.
 */
export const DEFAULT_MODELS = ["google/gemma-4-31b-it", "mistralai/mistral-nemotron", "mistralai/mistral-large-2-instruct", "nvidia/nemotron-3-super-120b-a12b"];
/** Budget for one generation across every model, inside the route's maxDuration (300 s). */
const TOTAL_MS = 270_000;
/** A model still thinking after this long gets company: the next one starts too, the first answer wins. */
export const HEDGE_MS = 20_000;

/**
 * A failed call. `refused` (401/403): that key is bad, for every model. `limited` (429): that key is
 * over its rate limit. Either way another key may work; anything else is the model's problem.
 */
class NimError extends Error {
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message);
  }
  get refused() {
    return this.status === 401 || this.status === 403;
  }
  get keyIssue() {
    return this.refused || this.status === 429;
  }
  get serverError() {
    return this.status >= 500;
  }
}

async function chat(apiKey: string, model: string, body: Record<string, unknown>, timeoutMs: number, cancel?: AbortSignal): Promise<string> {
  const signal = cancel ? AbortSignal.any([AbortSignal.timeout(timeoutMs), cancel]) : AbortSignal.timeout(timeoutMs);
  const failed = (e: unknown) =>
    new NimError(e instanceof Error && e.name === "TimeoutError" ? `timed out after ${Math.round(timeoutMs / 1000)}s` : String(e));
  let res: Response;
  try {
    res = await fetch(NIM_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ model, stream: false, ...body }),
      signal,
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 200);
      throw new NimError(`${res.status} ${detail}`, res.status);
    }
    // The body can stall too: the same signal covers reading it.
    const data = (await res.json()) as { choices?: { message?: { content?: string | null } }[] };
    return data.choices?.[0]?.message?.content ?? "";
  } catch (e) {
    throw e instanceof NimError ? e : failed(e);
  }
}

/** The models in their order, but any that failed recently go last (the oldest failure first). */
export function orderModels(models: string[], failures: Record<string, string>, now = Date.now()): string[] {
  const cooling = (m: string) => failures[m] && now - Date.parse(failures[m]) < COOLDOWN_MS;
  const healthy = models.filter((m) => !cooling(m));
  const resting = models.filter((m) => cooling(m)).sort((a, b) => Date.parse(failures[a]) - Date.parse(failures[b]));
  return [...healthy, ...resting];
}

/**
 * Drafts phrases, racing the models in a staggered way. The first model starts at once; each
 * HEDGE_MS without an answer (or as soon as one fails) the next one joins, and the first valid reply
 * wins while the others are cancelled. Within a model, the keys in order: a rate-limited or refused
 * key hands the same model to the next key (NIM limits are per key), and so does a 5xx; a model that
 * errors otherwise, times out or replies without phrases ends its lane. A refused key is dropped for the rest of the request.
 * Every finished attempt is reported, to show who answered and to rest the models that failed;
 * calls cancelled because another model won aren't failures and aren't reported.
 */
export async function generatePhrases(
  settings: NimSettings,
  req: GenerateRequest,
): Promise<{ phrases: Generated[]; model: string | null; attempts: Attempt[]; error?: string }> {
  const attempts: Attempt[] = [];
  const deadline = Date.now() + TOTAL_MS;
  const keys = settings.apiKeys.map((key, i) => ({ key, n: i + 1, refused: false }));
  const models = orderModels(settings.models, settings.failures);
  const won = new AbortController();

  const lane = async (model: string): Promise<Generated[] | null> => {
    for (const k of keys) {
      if (k.refused) continue;
      const left = deadline - Date.now();
      if (left < 15_000 || won.signal.aborted) return null;
      const started = Date.now();
      try {
        const reply = await chat(
          k.key,
          model,
          {
            messages: buildMessages(req),
            temperature: 0.7,
            top_p: 0.95,
            max_tokens: settings.reasoning ? 16384 : 4096,
            // How NIM turns thinking on or off; models without it ignore the flag.
            chat_template_kwargs: { thinking: settings.reasoning, enable_thinking: settings.reasoning },
          },
          Math.min(left, settings.reasoning ? 150_000 : 75_000),
          won.signal,
        );
        const phrases = parseGenerated(reply);
        if (!phrases.length) throw new NimError("reply had no phrases");
        if (won.signal.aborted) return null;
        attempts.push({ model, key: k.n, ok: true, ms: Date.now() - started });
        return phrases;
      } catch (e) {
        if (won.signal.aborted) return null;
        const err = e instanceof NimError ? e : new NimError(String(e));
        attempts.push({ model, key: k.n, ok: false, ms: Date.now() - started, error: err.message, keyIssue: err.keyIssue });
        if (err.refused) k.refused = true;
        // An overloaded or erroring server may still answer on the next key (seen with NIM's 503).
        if (!err.keyIssue && !err.serverError) return null;
      }
    }
    return null;
  };

  return new Promise((resolve) => {
    let next = 0;
    let running = 0;
    let settled = false;
    let hedge: ReturnType<typeof setTimeout> | undefined;
    const finish = (r: { phrases: Generated[]; model: string | null; error?: string }) => {
      if (settled) return;
      settled = true;
      clearTimeout(hedge);
      won.abort();
      resolve({ ...r, attempts });
    };
    const giveUp = () =>
      finish({
        phrases: [],
        model: null,
        error: keys.every((k) => k.refused)
          ? "NVIDIA NIM refused every saved API key."
          : "Every model failed. See the attempts below, or try again in a few minutes.",
      });
    const launch = () => {
      clearTimeout(hedge);
      if (settled) return;
      if (next >= models.length || deadline - Date.now() < 15_000 || keys.every((k) => k.refused)) {
        if (running === 0) giveUp();
        return;
      }
      const model = models[next++];
      running++;
      lane(model).then((phrases) => {
        running--;
        if (phrases) finish({ phrases, model });
        else launch();
      });
      hedge = setTimeout(launch, HEDGE_MS);
    };
    launch();
  });
}

/** Models to rest after a request: those that failed on their own account, and never answered. */
export const failedModels = (attempts: Attempt[]) =>
  [...new Set(attempts.filter((a) => !a.ok && !a.keyIssue).map((a) => a.model))].filter((m) => !attempts.some((a) => a.ok && a.model === m));
export const answeredModels = (attempts: Attempt[]) => [...new Set(attempts.filter((a) => a.ok).map((a) => a.model))];

/** A tiny request per model and key, all at once, to see which answer and how fast. */
export async function pingModels(apiKeys: string[], models: string[]): Promise<Attempt[]> {
  return Promise.all(
    models.flatMap((model) =>
      apiKeys.map(async (apiKey, i) => {
        const started = Date.now();
        try {
          const reply = await chat(
            apiKey,
            model,
            { messages: [{ role: "user", content: "Reply with the single word: ok" }], max_tokens: 64, temperature: 0, chat_template_kwargs: { thinking: false, enable_thinking: false } },
            45_000,
          );
          return { model, key: i + 1, ok: reply.trim().length > 0, ms: Date.now() - started, error: reply.trim() ? undefined : "empty reply" };
        } catch (e) {
          const err = e instanceof NimError ? e : new NimError(String(e));
          return { model, key: i + 1, ok: false, ms: Date.now() - started, error: err.message, keyIssue: err.keyIssue };
        }
      }),
    ),
  );
}
