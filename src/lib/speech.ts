import { audioUrl } from "./audio-slug";

let audio: HTMLAudioElement | null = null;
let token = 0;

function speakWithBrowser(text: string, rate: number, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = rate;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

/** Plays the pre-generated file for `text`; falls back to the browser voice if the file can't play. */
export function speak(text: string, rate: number, onEnd?: () => void) {
  stopSpeech();
  const mine = ++token;
  const el = new Audio(audioUrl(text));
  el.playbackRate = rate;
  el.onended = () => {
    if (mine === token) onEnd?.();
  };
  audio = el;
  el.play().catch(() => {
    if (mine === token) speakWithBrowser(text, rate, onEnd);
  });
}

export function stopSpeech() {
  token++;
  if (audio) {
    audio.pause();
    audio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
