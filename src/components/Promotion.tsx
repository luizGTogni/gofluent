"use client";

import { useEffect } from "react";
import { promotionPhrase, promotionTranslation, type Title } from "@/lib/titles";
import { speak, stopSpeech } from "@/lib/speech";
import { ArrowRight, Rocket } from "./icons";

/** Full-screen promotion: a rocket lifts off, then the phrase, which doubles as an English lesson. */
export function Promotion({ title, onContinue }: { title: Title; onContinue: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => speak(promotionPhrase(title), 1), 1300);
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === "Escape") && !e.repeat) onContinue();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      stopSpeech();
      window.removeEventListener("keydown", onKey);
    };
  }, [title, onContinue]);

  return (
    <div className="promo" role="dialog" aria-modal="true" aria-label="Promotion">
      <div className="rocket" aria-hidden>
        <Rocket />
      </div>
      <div className="promo-body">
        <p className="promo-kicker">Promotion</p>
        <h2 className="promo-phrase">{promotionPhrase(title)}</h2>
        <p className="promo-pt">{promotionTranslation(title)}</p>
        <p className="muted">{title.vibe}</p>
        <button type="button" className="check" onClick={onContinue} autoFocus>
          Continue <ArrowRight />
        </button>
      </div>
    </div>
  );
}
