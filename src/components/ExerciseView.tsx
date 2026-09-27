"use client";

import { useEffect, useRef, useState } from "react";
import { DIFF_AFTER_WRONG, DIFFICULTY, diffWord, heardButMisspelled, norm, type Difficulty, type GapStatus, type Result } from "@/lib/engine";
import { sentenceOf, type Exercise } from "@/lib/exercises";
import { speak, stopSpeech } from "@/lib/speech";
import type { Accent } from "@/lib/unlocks";
import { WordCards } from "./WordCards";
import { ArrowRight, Refresh } from "./icons";

type Props = {
  exercise: Exercise;
  difficulty: Difficulty;
  hidden: boolean;
  rate: number;
  accent: Accent;
  audioTick: number;
  onTypedError: () => void;
  onComplete: (r: Result) => void;
  onReplay: () => void;
  onToggleHidden: () => void;
};

export function ExerciseView({ exercise, difficulty, hidden, rate, accent, audioTick, onTypedError, onComplete, onReplay, onToggleHidden }: Props) {
  const { words } = exercise;
  const cfg = DIFFICULTY[difficulty];
  const [free, setFree] = useState("");
  const [marks, setMarks] = useState<("correct" | "wrong")[] | null>(null);
  const freeRef = useRef<HTMLInputElement>(null);
  const freeFails = useRef<number[]>([]);
  // Eclipse has no gaps to diff, so after enough failed checks the whole sentence gets one instead.
  const [freeTries, setFreeTries] = useState(0);
  const freeDiff = !cfg.gaps && freeTries >= DIFF_AFTER_WRONG;
  const heardFails = useRef<number[]>([]);
  const noteHeard = (i: number, typed: string) => {
    if (!heardButMisspelled(typed, words[i].text)) heardFails.current[i] = (heardFails.current[i] ?? 0) + 1;
  };
  const [inputs, setInputs] = useState<string[]>(() => words.map(() => ""));
  const [status, setStatus] = useState<GapStatus[]>(() => words.map(() => "idle"));
  const [wrongCount, setWrongCount] = useState<number[]>(() => words.map(() => 0));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const stats = useRef({ typedErrors: 0, emptyChecks: 0, helped: false, missed: new Set<string>() });
  const startRef = useRef(performance.now());
  // Set once the phrase is finished: a second Enter or click on Check can't finish it again.
  const done = useRef(false);
  const typedRef = useRef(false);
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const accentRef = useRef(accent);
  accentRef.current = accent;

  useEffect(() => {
    speak(
      sentenceOf(exercise),
      rateRef.current,
      () => {
        if (!typedRef.current) startRef.current = performance.now();
      },
      accentRef.current,
    );
    return stopSpeech;
  }, [audioTick, exercise]);

  useEffect(() => {
    (cfg.gaps ? refs.current[0] : freeRef.current)?.focus();
  }, [cfg.gaps]);

  const focusGap = (i: number) => refs.current[i]?.focus();

  const nextOpen = (from: number, dir: 1 | -1) => {
    for (let i = from + dir; i >= 0 && i < words.length; i += dir) if (status[i] !== "correct") return i;
    return -1;
  };

  const diffMode = (i: number) => cfg.diff && status[i] !== "correct" && wrongCount[i] >= DIFF_AFTER_WRONG;

  const finish = (fails: number[]) => {
    done.current = true;
    onComplete({
      perWord: words.map((w, i) => ({ word: w.text, fails: fails[i] ?? 0, heard: heardFails.current[i] ?? 0 })),
      elapsedMs: performance.now() - startRef.current,
      typedErrors: stats.current.typedErrors,
      emptyChecks: stats.current.emptyChecks,
      helped: stats.current.helped,
      missed: [...stats.current.missed],
    });
  };

  // Eclipse (extreme): one open field, the whole sentence, no gaps to hint at word count.
  const checkFree = () => {
    if (done.current) return;
    const tokens = free.trim().split(/\s+/).filter(Boolean);
    const missedCheck = () => {
      if (freeTries + 1 >= DIFF_AFTER_WRONG) stats.current.helped = true;
      setFreeTries((n) => n + 1);
    };
    if (!tokens.length) {
      missedCheck();
      stats.current.emptyChecks += 1;
      words.forEach((_, i) => {
        freeFails.current[i] = (freeFails.current[i] ?? 0) + 1;
        noteHeard(i, "");
      });
      setMarks([]);
      return;
    }
    const result = tokens.map((t, i) => (i < words.length && norm(t) === norm(words[i].text) ? "correct" : "wrong")) as ("correct" | "wrong")[];
    const complete = tokens.length === words.length && result.every((m) => m === "correct");
    setMarks(result);
    words.forEach((_, i) => {
      if (result[i] !== "correct") {
        freeFails.current[i] = (freeFails.current[i] ?? 0) + 1;
        noteHeard(i, tokens[i] ?? "");
      }
    });
    if (complete) return finish(freeFails.current);
    missedCheck();
    stats.current.typedErrors += 1;
    onTypedError();
    words.forEach((w, i) => {
      if (result[i] !== "correct") stats.current.missed.add(w.text);
    });
  };

  const check = () => {
    if (done.current) return;
    if (!cfg.gaps) return checkFree();
    const nextStatus = [...status];
    const nextWrong = [...wrongCount];
    let anyEmpty = false;
    let anyTypedWrong = false;

    words.forEach((word, i) => {
      if (status[i] === "correct") return;
      const typed = norm(inputs[i]);
      if (!typed) {
        anyEmpty = true;
        nextStatus[i] = "wrong";
        nextWrong[i] += 1;
        noteHeard(i, "");
        if (nextWrong[i] >= DIFF_AFTER_WRONG) stats.current.helped = true;
      } else if (typed === norm(word.text)) {
        nextStatus[i] = "correct";
      } else {
        anyTypedWrong = true;
        nextStatus[i] = "wrong";
        nextWrong[i] += 1;
        noteHeard(i, inputs[i]);
        stats.current.missed.add(word.text);
        if (nextWrong[i] >= DIFF_AFTER_WRONG) stats.current.helped = true;
      }
    });

    if (anyEmpty) stats.current.emptyChecks += 1;
    if (anyTypedWrong) {
      stats.current.typedErrors += 1;
      onTypedError();
    }

    setStatus(nextStatus);
    setWrongCount(nextWrong);

    if (nextStatus.every((s) => s === "correct")) {
      finish(nextWrong);
    } else {
      const first = nextStatus.findIndex((s) => s !== "correct");
      setTimeout(() => focusGap(first), 0);
    }
  };

  const onChange = (i: number, value: string) => {
    typedRef.current = true;
    const clean = value.replace(/\s/g, "");
    setInputs((prev) => prev.map((v, k) => (k === i ? clean : v)));
    if (status[i] === "wrong" && !diffMode(i)) {
      setStatus((prev) => prev.map((s, k) => (k === i ? "idle" : s)));
    }
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!e.repeat) check();
    } else if (e.key === " ") {
      e.preventDefault();
      if (inputs[i]) {
        const n = nextOpen(i, 1);
        if (n >= 0) focusGap(n);
      }
    } else if (e.key === "Backspace" && !inputs[i]) {
      const p = nextOpen(i, -1);
      if (p >= 0) {
        e.preventDefault();
        focusGap(p);
      }
    }
  };

  const showText = cfg.showText && !hidden;
  const anyWrong = cfg.gaps ? status.some((s) => s === "wrong") : marks !== null && (marks.length === 0 || marks.includes("wrong"));
  const anyDiff = freeDiff || words.some((_, i) => diffMode(i));
  const freeTokens = free.trim().split(/\s+/).filter(Boolean);

  return (
    <div className="exercise">
      {anyDiff && <WordCards words={words} />}
      {showText ? <h1 className="target">{sentenceOf(exercise)}</h1> : <h1 className="target target-hidden">Listen and type</h1>}
      <p className="instruction">Copy the complete English accurately</p>

      {!cfg.gaps && (
        <div className="free">
          <input
            ref={freeRef}
            value={free}
            onChange={(e) => {
              typedRef.current = true;
              setFree(e.target.value);
              setMarks(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!e.repeat) check();
              }
            }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Type what you heard"
            aria-label="Type the sentence you heard"
          />
          {freeDiff ? (
            <div className="marks" aria-hidden>
              {words.map((w, i) => (
                <span key={i} className="mark">
                  {diffWord(freeTokens[i] ?? "", w.text).map((op, k) => (
                    <span key={k} className={`d-${op.t}`}>
                      {op.c}
                    </span>
                  ))}
                </span>
              ))}
              {freeTokens.slice(words.length).map((t, i) => (
                <span key={`extra-${i}`} className="mark d-del">
                  {t}
                </span>
              ))}
            </div>
          ) : marks && marks.length > 0 && (
            <div className="marks">
              {free
                .trim()
                .split(/\s+/)
                .map((t, i) => (
                  <span key={i} className={`mark ${marks[i]}`}>
                    {t}
                  </span>
                ))}
            </div>
          )}
        </div>
      )}

      <div className="gaps" hidden={!cfg.gaps}>
        {words.map((word, i) => {
          const showDiff = diffMode(i);
          const ops = showDiff ? diffWord(inputs[i], word.text) : [];
          const len = showDiff ? ops.length : Math.max(inputs[i].length, word.text.length);
          return (
            <div key={i} className={`gap ${status[i]} ${showDiff ? "diff-on" : ""}`} style={{ width: `${Math.max(len, 3) + 1.5}ch` }}>
              <input
                ref={(el) => {
                  refs.current[i] = el;
                }}
                value={inputs[i]}
                readOnly={status[i] === "correct"}
                tabIndex={status[i] === "correct" ? -1 : 0}
                onChange={(e) => onChange(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onFocus={() => {
                  if (status[i] === "correct") {
                    const n = nextOpen(i, 1);
                    if (n >= 0) focusGap(n);
                  }
                }}
                placeholder={cfg.firstLetter ? word.text[0] + "·".repeat(Math.max(0, word.text.length - 1)) : undefined}
                maxLength={word.text.length + 8}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label={`Word ${i + 1} of ${words.length}`}
              />
              {showDiff && (
                <div className="diff" aria-hidden>
                  {ops.map((op, k) => (
                    <span key={k} className={`d-${op.t}`}>
                      {op.c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className={`feedback ${anyWrong ? "show" : ""}`} role="status">
        {anyDiff
          ? "Remove struck-out letters and add green letters. Edit the words yourself."
          : !cfg.gaps && anyWrong
            ? "Not quite. Edit the marked words. The rest is kept."
            : anyWrong
            ? "Correct the marked words. The rest is kept."
            : " "}
      </p>

      <div className="footer">
        <div className="footer-left">
          {cfg.replay && (
            <button type="button" className="link icon-text" onClick={onReplay}>
              <Refresh /> Replay exercise
            </button>
          )}
          {cfg.showText && (
            <button type="button" className="link" onClick={onToggleHidden}>
              {hidden ? "Show answer" : "Hide answer"}
            </button>
          )}

        </div>
        <button type="button" className="check" onClick={check}>
          Check <ArrowRight />
        </button>
      </div>
    </div>
  );
}
