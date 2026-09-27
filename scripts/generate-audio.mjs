// Generates public/audio/<slug>.mp3 for every exercise and dictionary word using Piper TTS.
//
// Usage:
//   PIPER_PYTHON=/path/to/venv/bin/python PIPER_VOICE=/path/to/en_US-lessac-medium.onnx \
//     node --experimental-strip-types scripts/generate-audio.mjs
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DICTIONARY_WORDS, EXERCISES, sentenceOf } from "../src/lib/exercises.ts";
import { audioSlug } from "../src/lib/audio-slug.ts";

const python = process.env.PIPER_PYTHON;
const voice = process.env.PIPER_VOICE;
if (!python || !voice) {
  console.error("Set PIPER_PYTHON and PIPER_VOICE (see header of this file).");
  process.exit(1);
}

const outDir = new URL("../public/audio/", import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), "gofluent-"));

// Phrases plus every dictionary word on its own (used to replay a single word slowly).
const texts = [...new Set([...EXERCISES.map(sentenceOf), ...DICTIONARY_WORDS.map((w) => w.text)])];
for (const text of texts) {
  const slug = audioSlug(text);
  const mp3 = join(outDir, `${slug}.mp3`);
  if (existsSync(mp3) && !process.argv.includes("--force")) continue;
  const wav = join(tmp, `${slug}.wav`);
  execFileSync(python, ["-m", "piper", "-m", voice, "-f", wav, "--", text], { stdio: "inherit" });
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-codec:a", "libmp3lame", "-q:a", "4", mp3]);
  console.log(`${slug}.mp3  ←  "${text}"`);
}
rmSync(tmp, { recursive: true, force: true });
