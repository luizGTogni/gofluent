export type Pos =
  | "noun"
  | "verb"
  | "numeral"
  | "pronoun"
  | "adjective"
  | "adverb"
  | "article"
  | "determiner"
  | "preposition";

export type Word = { text: string; ipa: string; pos: Pos };
export type Exercise = { words: Word[]; translation: string };

// One entry per word: "text | American IPA | part of speech". A word has a single class here.
const DICTIONARY = `
two|/tuː/|numeral
one|/wʌn/|numeral
bags|/bægz/|noun
have|/hæv/|verb
has|/hæz/|verb
a|/ə/|article
an|/æn/|article
the|/ðə/|article
red|/rɛd/|adjective
car|/kɑːr/|noun
we|/wiː/|pronoun
dream|/driːm/|noun
she|/ʃiː/|pronoun
he|/hiː/|pronoun
they|/ðeɪ/|pronoun
I|/aɪ/|pronoun
you|/juː/|pronoun
me|/miː/|pronoun
what|/wʌt/|pronoun
it|/ɪt/|pronoun
reads|/riːdz/|verb
read|/riːd/|verb
reading|/ˈriːdɪŋ/|verb
every|/ˈɛvri/|adjective
day|/deɪ/|noun
like|/laɪk/|verb
likes|/laɪks/|verb
black|/blæk/|adjective
coffee|/ˈkɔːfi/|noun
cat|/kæt/|noun
is|/ɪz/|verb
are|/ɑːr/|verb
on|/ɑːn/|preposition
in|/ɪn/|preposition
at|/æt/|preposition
near|/nɪr/|preposition
of|/əv/|preposition
to|/tuː/|preposition
table|/ˈteɪbəl/|noun
walk|/wɔːk/|verb
walks|/wɔːks/|verb
school|/skuːl/|noun
very|/ˈvɛri/|adverb
happy|/ˈhæpi/|adjective
today|/təˈdeɪ/|adverb
please|/pliːz/|adverb
open|/ˈoʊpən/|verb
window|/ˈwɪndoʊ/|noun
water|/ˈwɔːtər/|noun
house|/haʊs/|noun
friend|/frɛnd/|noun
book|/bʊk/|noun
morning|/ˈmɔːrnɪŋ/|noun
music|/ˈmjuːzɪk/|noun
good|/ɡʊd/|adjective
thank|/θæŋk/|verb
my|/maɪ/|determiner
her|/hɜːr/|determiner
your|/jɔːr/|determiner
this|/ðɪs/|determiner
some|/sʌm/|determiner
more|/mɔːr/|determiner
cold|/koʊld/|adjective
hot|/hɑːt/|adjective
big|/bɪɡ/|adjective
small|/smɔːl/|adjective
old|/oʊld/|adjective
new|/nuː/|adjective
nice|/naɪs/|adjective
apples|/ˈæpəlz/|noun
time|/taɪm/|noun
night|/naɪt/|noun
phone|/foʊn/|noun
job|/dʒɑːb/|noun
lunch|/lʌntʃ/|noun
dinner|/ˈdɪnər/|noun
city|/ˈsɪti/|noun
sun|/sʌn/|noun
brother|/ˈbrʌðər/|noun
mother|/ˈmʌðər/|noun
drink|/drɪŋk/|noun
beach|/biːtʃ/|noun
door|/dɔːr/|noun
tea|/tiː/|noun
train|/treɪn/|noun
noon|/nuːn/|noun
English|/ˈɪŋɡlɪʃ/|noun
children|/ˈtʃɪldrən/|noun
park|/pɑːrk/|noun
market|/ˈmɑːrkɪt/|noun
Brazil|/brəˈzɪl/|noun
weather|/ˈwɛðər/|noun
work|/wɜːrk/|noun
steps|/stɛps/|noun
part|/pɑːrt/|noun
see|/siː/|verb
sit|/sɪt/|verb
need|/niːd/|verb
want|/wɑːnt/|verb
eat|/iːt/|verb
drives|/draɪvz/|verb
love|/lʌv/|verb
plays|/pleɪz/|verb
play|/pleɪ/|verb
can|/kæn/|verb
would|/wʊd/|verb
help|/hɛlp/|verb
works|/wɜːrks/|verb
live|/lɪv/|verb
lives|/lɪvz/|verb
close|/kloʊz/|verb
cooks|/kʊks/|verb
arrives|/əˈraɪvz/|verb
learning|/ˈlɜːrnɪŋ/|verb
going|/ˈɡoʊɪŋ/|verb
take|/teɪk/|verb
make|/meɪk/|verb
soon|/suːn/|adverb
down|/daʊn/|adverb
together|/təˈɡɛðər/|adverb
slowly|/ˈsloʊli/|adverb
always|/ˈɔːlweɪz/|adverb
early|/ˈɜːrli/|adverb
far|/fɑːr/|adverb
`;

const dict = new Map<string, Word>();
for (const line of DICTIONARY.trim().split("\n")) {
  const [text, ipa, pos] = line.split("|");
  dict.set(text.toLowerCase(), { text, ipa, pos: pos as Pos });
}

const ex = (sentence: string, translation: string): Exercise => ({
  translation,
  words: sentence.split(" ").map((token) => {
    const word = dict.get(token.toLowerCase());
    if (!word) throw new Error(`exercises.ts: "${token}" (in "${sentence}") is missing from DICTIONARY`);
    return word;
  }),
});

// Grouped by length: single words, short phrases (2-3 words), sentences (4-6 words).
export const EXERCISES: Exercise[] = [
  // words
  ex("coffee", "café"),
  ex("water", "água"),
  ex("house", "casa"),
  ex("friend", "amigo"),
  ex("book", "livro"),
  ex("morning", "manhã"),
  ex("happy", "feliz"),
  ex("window", "janela"),
  ex("dream", "sonho"),
  ex("music", "música"),
  // phrases
  ex("two bags", "duas bolsas"),
  ex("have two bags", "ter duas bolsas"),
  ex("a red car", "um carro vermelho"),
  ex("good morning", "bom dia"),
  ex("good night", "boa noite"),
  ex("thank you", "obrigado"),
  ex("my friend", "meu amigo"),
  ex("a cold day", "um dia frio"),
  ex("red apples", "maçãs vermelhas"),
  ex("very good", "muito bom"),
  ex("a big house", "uma casa grande"),
  ex("one more time", "mais uma vez"),
  ex("an old book", "um livro velho"),
  ex("my new phone", "meu celular novo"),
  ex("every morning", "toda manhã"),
  ex("see you soon", "até logo"),
  ex("please sit down", "por favor, sente-se"),
  // four words
  ex("we have a dream", "nós temos um sonho"),
  ex("she reads every day", "ela lê todos os dias"),
  ex("I like black coffee", "eu gosto de café puro"),
  ex("they walk to school", "eles caminham para a escola"),
  ex("please open the window", "por favor, abra a janela"),
  ex("I need some water", "eu preciso de água"),
  ex("she likes her job", "ela gosta do trabalho dela"),
  ex("we eat lunch together", "nós almoçamos juntos"),
  ex("he drives a car", "ele dirige um carro"),
  ex("they love this city", "eles amam esta cidade"),
  ex("the sun is hot", "o sol está quente"),
  ex("my brother plays music", "meu irmão toca música"),
  ex("I read every night", "eu leio toda noite"),
  ex("can you help me", "você pode me ajudar"),
  ex("what time is it", "que horas são"),
  // five words
  ex("we are very happy today", "estamos muito felizes hoje"),
  ex("I want a cold drink", "eu quero uma bebida gelada"),
  ex("she works at a school", "ela trabalha em uma escola"),
  ex("we live near the beach", "nós moramos perto da praia"),
  ex("please close the door slowly", "por favor, feche a porta devagar"),
  ex("he has a new phone", "ele tem um celular novo"),
  ex("my mother cooks dinner today", "minha mãe cozinha o jantar hoje"),
  ex("I always have hot tea", "eu sempre tomo chá quente"),
  ex("the train arrives at noon", "o trem chega ao meio-dia"),
  ex("they are learning English together", "eles estão aprendendo inglês juntos"),
  ex("my friend lives in Brazil", "meu amigo mora no Brasil"),
  ex("we have a big dream", "nós temos um grande sonho"),
  ex("small steps take you far", "pequenos passos levam você longe"),
  // six words
  ex("the cat is on the table", "o gato está na mesa"),
  ex("the children play in the park", "as crianças brincam no parque"),
  ex("I would like some more water", "eu gostaria de mais água"),
  ex("we are going to the market", "nós vamos ao mercado"),
  ex("she is reading a good book", "ela está lendo um bom livro"),
  ex("can I have some more coffee", "posso tomar mais café"),
  ex("the weather is very nice today", "o tempo está muito bom hoje"),
  ex("he always walks to work early", "ele sempre caminha para o trabalho cedo"),
  ex("make English part of your day", "faça do inglês parte do seu dia"),
];

export const sentenceOf = (e: Exercise) => e.words.map((x) => x.text).join(" ");
