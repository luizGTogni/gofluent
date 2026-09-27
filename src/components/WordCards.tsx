import type { Word } from "@/lib/exercises";

type Props = {
  words: Word[];
  /** Words the learner paused on: highlighted. */
  stumbled?: ReadonlySet<string>;
  /** Makes each card a button that plays its word (slowly). */
  onHear?: (word: string) => void;
};

export function WordCards({ words, stumbled, onHear }: Props) {
  return (
    <div className="cards">
      {words.map((word, i) => {
        const paused = stumbled?.has(word.text) ?? false;
        const body = (
          <>
            <span className="chip">{word.pos}</span>
            <span className="ipa">{word.ipa}</span>
            <span className="word">{word.text}</span>
          </>
        );
        const className = `card pos-${word.pos} ${paused ? "stumbled" : ""}`;
        return onHear ? (
          <button
            key={i}
            type="button"
            className={className}
            onClick={() => onHear(word.text)}
            aria-label={`${word.text}, ${word.pos}${paused ? ", you paused here" : ""}: hear it slowly`}
          >
            {body}
          </button>
        ) : (
          <div key={i} className={className}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
