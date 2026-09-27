import type { Word } from "@/lib/exercises";

export function WordCards({ words }: { words: Word[] }) {
  return (
    <div className="cards">
      {words.map((word, i) => (
        <div key={i} className={`card pos-${word.pos}`}>
          <span className="chip">{word.pos}</span>
          <span className="ipa">{word.ipa}</span>
          <span className="word">{word.text}</span>
        </div>
      ))}
    </div>
  );
}
