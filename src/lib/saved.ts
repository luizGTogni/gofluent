import { getSupabase } from "./supabase";

export type SavedItem = {
  id: string;
  kind: "word" | "chunk";
  text: string;
  sentence: string;
  translation: string | null;
  created_at: string;
};

export type NewItem = {
  text: string;
  sentence: string;
  translation: string;
  start: number;
  end: number;
};

export type SaveResult = "saved" | "duplicate" | "error" | "offline";

export async function saveItem(item: NewItem): Promise<SaveResult> {
  const db = await getSupabase();
  if (!db) return "offline";
  const { error } = await db.from("saved_items").insert({
    kind: item.start === item.end ? "word" : "chunk",
    text: item.text.toLowerCase(),
    sentence: item.sentence,
    translation: item.translation,
    start_idx: item.start,
    end_idx: item.end,
  });
  if (!error) return "saved";
  if (error.code === "23505") return "duplicate";
  console.error("saveItem failed:", error.message);
  return "error";
}

export async function listSaved(): Promise<SavedItem[] | null> {
  const db = await getSupabase();
  if (!db) return null;
  const { data, error } = await db
    .from("saved_items")
    .select("id, kind, text, sentence, translation, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listSaved failed:", error.message);
    return null;
  }
  return data as SavedItem[];
}

export async function deleteSaved(id: string): Promise<boolean> {
  const db = await getSupabase();
  if (!db) return false;
  const { error } = await db.from("saved_items").delete().eq("id", id);
  return !error;
}
