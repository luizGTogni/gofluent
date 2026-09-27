// Uploads public/audio/**/*.mp3 to the Supabase Storage "audio" bucket, mirroring the folder
// layout (American at the bucket root, British under gb/) so it matches audioUrl()'s paths.
//
// Usage (needs the service_role key, which bypasses RLS — never commit it or expose it to the
// browser): set -a; . ./.env.local; set +a; node --experimental-strip-types scripts/upload-audio.mjs
import { createClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Accept the project URL even if it was pasted with a path such as /rest/v1/.
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const url = rawUrl ? new URL(rawUrl).origin : undefined;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (from Project Settings > API) first.");
  process.exit(1);
}

const db = createClient(url, serviceKey);
const dir = new URL("../public/audio/", import.meta.url).pathname;

const files = [
  ...readdirSync(dir).filter((f) => f.endsWith(".mp3")).map((f) => ({ local: join(dir, f), remote: f })),
  ...readdirSync(join(dir, "gb")).filter((f) => f.endsWith(".mp3")).map((f) => ({ local: join(dir, "gb", f), remote: `gb/${f}` })),
];

let uploaded = 0;
for (const { local, remote } of files) {
  const { error } = await db.storage.from("audio").upload(remote, readFileSync(local), {
    contentType: "audio/mpeg",
    cacheControl: "604800", // 7 days: audio for a given phrase rarely changes
    upsert: true,
  });
  if (error) {
    console.error(`FAILED ${remote}: ${error.message}`);
    continue;
  }
  uploaded++;
  if (uploaded % 50 === 0) console.log(`${uploaded}/${files.length}...`);
}
console.log(`Uploaded ${uploaded}/${files.length} files to the "audio" bucket.`);
