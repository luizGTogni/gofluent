// Client side of the content admin: reads the library, and writes only through the admin RPCs
// (supabase/migrations/0025_content_admin.sql). Every call runs as the signed-in admin.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Pos } from "./exercises";
import { isPlanetId, type PlanetId } from "./planets";
import { getSupabase } from "./supabase";

export type AdminWord = { id: number; text: string; ipa: string; pos: Pos };
export type AdminPhrase = { id: number; text: string; translation: string; planet: PlanetId; words: { text: string; pos: Pos }[] };
export type AiSettings = { models: string[]; reasoning: boolean; keyHint: string | null; keyHint2: string | null; failures: Record<string, string> };
export type Attempt = { model: string; key: number; ok: boolean; ms: number; error?: string; keyIssue?: boolean };
export type NewPhrase = { text: string; translation: string; planet: PlanetId; words: { text: string; pos: Pos }[] };

const PAGE = 1000;

async function db(): Promise<SupabaseClient> {
  const client = await getSupabase();
  if (!client) throw new Error("Sign in first");
  return client;
}

/** Every row of a query, past the API's 1000-row limit. */
async function all<T>(query: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) return rows;
  }
}

const rpc = async <T,>(fn: string, args?: Record<string, unknown>): Promise<T> => {
  const { data, error } = await (await db()).rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
};

/** null when signed out, else whether this account is an admin. */
export async function checkAdmin(): Promise<boolean | null> {
  const client = await getSupabase();
  if (!client) return null;
  const { data } = await client.rpc("is_admin");
  return data === true;
}

export async function loadLibrary(): Promise<{ words: AdminWord[]; phrases: AdminPhrase[] }> {
  const client = await db();
  const [words, rows] = await Promise.all([
    all<AdminWord>((from, to) => client.from("words").select("id, text, ipa, pos").order("text").order("id").range(from, to)),
    all<{ id: number; text: string; translation: string; planet: string; phrase_words: { word_index: number; words: { text: string; pos: Pos } | null }[] }>(
      (from, to) => client.from("phrases").select("id, text, translation, planet, phrase_words(word_index, words(text, pos))").order("id").range(from, to),
    ),
  ]);
  const phrases = rows.map((r) => ({
    id: r.id,
    text: r.text,
    translation: r.translation,
    planet: isPlanetId(r.planet) ? r.planet : "earth",
    words: [...r.phrase_words].sort((a, b) => a.word_index - b.word_index).flatMap((p) => (p.words ? [p.words] : [])),
  }));
  return { words, phrases };
}

export const saveWords = (words: { text: string; ipa: string; pos: Pos }[]) => rpc<number>("admin_save_words", { p_words: words });
export const updateWord = (id: number, ipa: string, pos: Pos) => rpc<void>("admin_update_word", { p_id: id, p_ipa: ipa, p_pos: pos });
export const deleteWord = (id: number) => rpc<boolean>("admin_delete_word", { p_id: id });
export const savePhrases = (phrases: NewPhrase[]) => rpc<{ inserted: number; updated: number }>("admin_save_phrases", { p_phrases: phrases });
export const deletePhrase = (id: number) => rpc<void>("admin_delete_phrase", { p_id: id });
export const loadAiSettings = () => rpc<AiSettings>("admin_ai_settings");
/** Each key: null keeps the saved one, "" removes it. */
export const saveAiSettings = (models: string[], reasoning: boolean, apiKey: string | null, apiKey2: string | null) =>
  rpc<AiSettings>("admin_save_ai_settings", { p_models: models, p_reasoning: reasoning, p_api_key: apiKey, p_api_key_2: apiKey2 });

/** POSTs to an admin API route with the session's token. */
async function callRoute<T>(path: string, body: unknown): Promise<T> {
  const { data } = await (await db()).auth.getSession();
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw Object.assign(new Error(json.error ?? `Request failed (${res.status})`), { body: json });
  return json;
}

/** IPA from CMUdict and a suggested part of speech, each word read in the phrase it comes from. */
export const lookupWords = (words: string[], contexts: Record<string, string>) =>
  callRoute<{ ipa: Record<string, string | null>; pos: Record<string, Pos | null> }>("/api/admin/ipa", { words, contexts });

export type GenerateResult = { phrases: { en: string; pt: string }[]; model: string | null; attempts: Attempt[]; error?: string };

/** Never throws for a model failure: the result carries the error and every attempt made. */
export const generateDrafts = (req: { planet: PlanetId; count: number; theme?: string; word?: string; avoid: string[] }) =>
  callRoute<GenerateResult>("/api/admin/generate", req).catch((e: Error & { body?: GenerateResult }) => {
    if (e.body?.attempts) return e.body;
    throw e;
  });

export const testModels = (models: string[]) => callRoute<{ attempts: Attempt[] }>("/api/admin/test-models", { models }).then((r) => r.attempts);
export const listCatalog = () => callRoute<{ models: string[] }>("/api/admin/models", {}).then((r) => r.models);
