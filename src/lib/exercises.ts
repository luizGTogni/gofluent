export type Pos =
  | "noun"
  | "verb"
  | "numeral"
  | "pronoun"
  | "adjective"
  | "adverb"
  | "article"
  | "preposition";

export type Word = { text: string; ipa: string; pos: Pos };
export type Exercise = { words: Word[]; translation: string };

const w = (text: string, ipa: string, pos: Pos): Word => ({ text, ipa, pos });

const have = w("have", "/hæv/", "verb");
const a = w("a", "/ə/", "article");
const the = w("the", "/ðə/", "article");
const we = w("we", "/wiː/", "pronoun");

export const EXERCISES: Exercise[] = [
  { words: [w("two", "/tuː/", "numeral"), w("bags", "/bægz/", "noun")], translation: "duas bolsas" },
  { words: [have, w("two", "/tuː/", "numeral"), w("bags", "/bægz/", "noun")], translation: "ter duas bolsas" },
  { words: [a, w("red", "/rɛd/", "adjective"), w("car", "/kɑːr/", "noun")], translation: "um carro vermelho" },
  { words: [we, have, a, w("dream", "/driːm/", "noun")], translation: "nós temos um sonho" },
  {
    words: [w("she", "/ʃiː/", "pronoun"), w("reads", "/riːdz/", "verb"), w("every", "/ˈɛvri/", "adjective"), w("day", "/deɪ/", "noun")],
    translation: "ela lê todos os dias",
  },
  {
    words: [w("I", "/aɪ/", "pronoun"), w("like", "/laɪk/", "verb"), w("black", "/blæk/", "adjective"), w("coffee", "/ˈkɔːfi/", "noun")],
    translation: "eu gosto de café puro",
  },
  {
    words: [the, w("cat", "/kæt/", "noun"), w("is", "/ɪz/", "verb"), w("on", "/ɑːn/", "preposition"), the, w("table", "/ˈteɪbəl/", "noun")],
    translation: "o gato está na mesa",
  },
  {
    words: [w("they", "/ðeɪ/", "pronoun"), w("walk", "/wɔːk/", "verb"), w("to", "/tuː/", "preposition"), w("school", "/skuːl/", "noun")],
    translation: "eles caminham para a escola",
  },
  {
    words: [we, w("are", "/ɑːr/", "verb"), w("very", "/ˈvɛri/", "adverb"), w("happy", "/ˈhæpi/", "adjective"), w("today", "/təˈdeɪ/", "adverb")],
    translation: "estamos muito felizes hoje",
  },
  {
    words: [w("please", "/pliːz/", "adverb"), w("open", "/ˈoʊpən/", "verb"), the, w("window", "/ˈwɪndoʊ/", "noun")],
    translation: "por favor, abra a janela",
  },
];

export const sentenceOf = (e: Exercise) => e.words.map((x) => x.text).join(" ");
