import { enrolled, type ReviewState } from "./review";
import { getSupabase } from "./supabase";

const KEY = "gofluent:review";

const readLocal = (): ReviewState[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as ReviewState[];
  } catch {
    return [];
  }
};

const writeLocal = (states: ReviewState[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(states));
  } catch {
    /* storage unavailable: review just won't persist offline */
  }
};

type Row = { phrase: string; box: number; due_at: string; reps: number; lapses: number };

/** Supabase when reachable (source of truth, mirrored to localStorage); otherwise the local copy. */
export async function loadReview(): Promise<ReviewState[]> {
  const db = await getSupabase();
  if (!db) return readLocal();
  const { data, error } = await db.from("review_state").select("phrase, box, due_at, reps, lapses");
  if (error || !data) return readLocal();
  const states = (data as Row[]).map((r) => ({ phrase: r.phrase, box: r.box, dueAt: r.due_at, reps: r.reps, lapses: r.lapses }));
  writeLocal(states);
  return states;
}

export async function putReview(state: ReviewState): Promise<void> {
  const rest = readLocal().filter((s) => s.phrase !== state.phrase);
  writeLocal([...rest, state]);

  const db = await getSupabase();
  if (!db) return;
  const { data } = await db.auth.getUser();
  if (!data.user) return;
  const { error } = await db.from("review_state").upsert(
    {
      user_id: data.user.id,
      phrase: state.phrase,
      box: state.box,
      due_at: state.dueAt,
      reps: state.reps,
      lapses: state.lapses,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,phrase" },
  );
  if (error) console.error("putReview failed:", error.message);
}

export async function enrollIfMissing(phrase: string): Promise<void> {
  const current = await loadReview();
  if (current.some((s) => s.phrase === phrase)) return;
  await putReview(enrolled(phrase, new Date()));
}
