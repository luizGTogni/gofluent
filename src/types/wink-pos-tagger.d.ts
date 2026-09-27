// The part of wink-pos-tagger (MIT) that src/lib/posGuess.ts uses; the package ships no types.
declare module "wink-pos-tagger" {
  type Token = { value: string; tag: "word" | "punctuation" | string; pos: string; normal?: string; lemma?: string };
  const posTagger: () => { tagSentence: (sentence: string) => Token[] };
  export default posTagger;
}
