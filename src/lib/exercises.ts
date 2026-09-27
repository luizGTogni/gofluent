import type { PlanetId } from "./planets";

export type Pos =
  | "noun"
  | "verb"
  | "numeral"
  | "pronoun"
  | "adjective"
  | "adverb"
  | "article"
  | "determiner"
  | "preposition"
  | "conjunction"
  | "interjection";

export type Word = { text: string; ipa: string; pos: Pos };
export type Exercise = { words: Word[]; translation: string; planet: PlanetId };

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
hello|/həˈloʊ/|interjection
goodbye|/ɡʊdˈbaɪ/|interjection
welcome|/ˈwɛlkʌm/|interjection
sorry|/ˈsɑːri/|interjection
afternoon|/ˌæftərˈnuːn/|noun
evening|/ˈiːvnɪŋ/|noun
how|/haʊ/|adverb
am|/æm/|verb
fine|/faɪn/|adjective
tomorrow|/təˈmɑːroʊ/|adverb
meet|/miːt/|verb
name|/neɪm/|noun
Lucas|/ˈluːkəz/|noun
where|/wɛr/|adverb
from|/frʌm/|preposition
twenty|/ˈtwɛnti/|numeral
years|/jɪrz/|noun
again|/əˈɡɛn/|adverb
say|/seɪ/|verb
do|/duː/|verb
not|/nɑːt/|adverb
understand|/ˌʌndərˈstænd/|verb
speak|/spiːk/|verb
family|/ˈfæmɪli/|noun
bread|/brɛd/|noun
juice|/dʒuːs/|noun
breakfast|/ˈbrɛkfəst/|noun
fresh|/frɛʃ/|adjective
orange|/ˈɔːrɪndʒ/|adjective
for|/fɔːr/|preposition
bill|/bɪl/|noun
usually|/ˈjuːʒuːəli/|adverb
wake|/weɪk/|verb
up|/ʌp/|adverb
seven|/ˈsɛvən/|numeral
eight|/eɪt/|numeral
much|/mʌtʃ/|adverb
shirt|/ʃɜːrt/|noun
too|/tuː/|adverb
expensive|/ɛkˈspɛnsɪv/|adjective
pay|/peɪ/|verb
by|/baɪ/|preposition
card|/kɑːrd/|noun
smaller|/ˈsmɔːlər/|adjective
size|/saɪz/|noun
buy|/baɪ/|verb
cook|/kʊk/|verb
rice|/raɪs/|noun
and|/ænd/|conjunction
beans|/biːnz/|noun
drinks|/drɪŋks/|verb
store|/stɔːr/|noun
opens|/ˈoʊpənz/|verb
nine|/naɪn/|numeral
go|/ɡoʊ/|verb
shopping|/ˈʃɑːpɪŋ/|noun
miss|/mɪs/|verb
best|/bɛst/|adjective
friends|/frɛndz/|noun
feel|/fiːl/|verb
tired|/taɪərd/|adjective
worry|/ˈwʌri/|verb
kind|/kaɪnd/|adjective
looks|/lʊks/|verb
little|/ˈlɪtəl/|adjective
sad|/sæd/|adjective
got|/ɡɑːt/|verb
married|/ˈmærid/|verb
last|/læst/|adjective
year|/jɪr/|noun
proud|/praʊd/|adjective
be|/biː/|verb
afraid|/əˈfreɪd/|adjective
makes|/meɪks/|verb
laugh|/læf/|verb
trust|/trʌst/|verb
him|/hɪm/|pronoun
completely|/kəmˈpliːtli/|adverb
talk|/tɔːk/|verb
worried|/ˈwʌrid/|adjective
about|/əˈbaʊt/|preposition
never|/ˈnɛvər/|adverb
gives|/ɡɪvz/|verb
seat|/siːt/|noun
next|/nɛkst/|adjective
station|/ˈsteɪʃən/|noun
does|/dʌz/|verb
flight|/flaɪt/|noun
leave|/liːv/|verb
bus|/bʌs/|noun
late|/leɪt/|adjective
reach|/riːtʃ/|verb
airport|/ˈɛrpɔːrt/|noun
stay|/steɪ/|verb
hotel|/hoʊˈtɛl/|noun
tickets|/ˈtɪkɪts/|noun
bag|/bæɡ/|noun
turn|/tɜːrn/|verb
left|/lɛft/|adverb
corner|/ˈkɔːrnər/|noun
lost|/lɔːst/|verb
passport|/ˈpæspɔːrt/|noun
yesterday|/ˈjɛstərˌdeɪ/|adverb
taken|/ˈteɪkən/|verb
arrive|/əˈraɪv/|verb
Monday|/ˈmʌndeɪ/|noun
trip|/trɪp/|noun
was|/wʌz/|verb
longer|/ˈlɔːŋɡər/|adjective
than|/ðən/|conjunction
expected|/ɛkˈspɛktɪd/|verb
`;

const dict = new Map<string, Word>();
for (const line of DICTIONARY.trim().split("\n")) {
  const [text, ipa, pos] = line.split("|");
  dict.set(text.toLowerCase(), { text, ipa, pos: pos as Pos });
}

/** Every word in the dictionary, for things that need each word on its own (audio, lookups). */
export const DICTIONARY_WORDS: Word[] = [...dict.values()];

const ex = (sentence: string, translation: string, planet: PlanetId): Exercise => ({
  translation,
  planet,
  words: sentence.split(" ").map((token) => {
    const word = dict.get(token.toLowerCase());
    if (!word) throw new Error(`exercises.ts: "${token}" (in "${sentence}") is missing from DICTIONARY`);
    return word;
  }),
});

// Grouped by planet, then by length. Saturn, Uranus, Neptune, Nebula and Galaxy are still to come.
export const EXERCISES: Exercise[] = [
  // Earth (A1): everyday basics
  ex("coffee", "café", "earth"),
  ex("water", "água", "earth"),
  ex("house", "casa", "earth"),
  ex("friend", "amigo", "earth"),
  ex("book", "livro", "earth"),
  ex("morning", "manhã", "earth"),
  ex("happy", "feliz", "earth"),
  ex("window", "janela", "earth"),
  ex("dream", "sonho", "earth"),
  ex("music", "música", "earth"),
  ex("two bags", "duas bolsas", "earth"),
  ex("my friend", "meu amigo", "earth"),
  ex("very good", "muito bom", "earth"),
  ex("every morning", "toda manhã", "earth"),
  ex("have two bags", "ter duas bolsas", "earth"),
  ex("a red car", "um carro vermelho", "earth"),
  ex("a cold day", "um dia frio", "earth"),
  ex("a big house", "uma casa grande", "earth"),
  ex("one more time", "mais uma vez", "earth"),
  ex("an old book", "um livro velho", "earth"),
  ex("my new phone", "meu celular novo", "earth"),
  ex("we have a dream", "nós temos um sonho", "earth"),
  ex("she reads every day", "ela lê todos os dias", "earth"),
  ex("they walk to school", "eles caminham para a escola", "earth"),
  ex("please open the window", "por favor, abra a janela", "earth"),
  ex("she likes her job", "ela gosta do trabalho dela", "earth"),
  ex("he drives a car", "ele dirige um carro", "earth"),
  ex("they love this city", "eles amam esta cidade", "earth"),
  ex("the sun is hot", "o sol está quente", "earth"),
  ex("my brother plays music", "meu irmão toca música", "earth"),
  ex("I read every night", "eu leio toda noite", "earth"),
  ex("she works at a school", "ela trabalha em uma escola", "earth"),
  ex("we live near the beach", "nós moramos perto da praia", "earth"),
  ex("please close the door slowly", "por favor, feche a porta devagar", "earth"),
  ex("he has a new phone", "ele tem um celular novo", "earth"),
  ex("they are learning English together", "eles estão aprendendo inglês juntos", "earth"),
  ex("my friend lives in Brazil", "meu amigo mora no Brasil", "earth"),
  ex("we have a big dream", "nós temos um grande sonho", "earth"),
  ex("small steps take you far", "pequenos passos levam você longe", "earth"),
  ex("the cat is on the table", "o gato está na mesa", "earth"),
  ex("the children play in the park", "as crianças brincam no parque", "earth"),
  ex("she is reading a good book", "ela está lendo um bom livro", "earth"),
  ex("the weather is very nice today", "o tempo está muito bom hoje", "earth"),
  ex("make English part of your day", "faça do inglês parte do seu dia", "earth"),
  // Moon (A1): greetings and introductions
  ex("hello", "olá", "moon"),
  ex("goodbye", "tchau", "moon"),
  ex("welcome", "bem-vindo", "moon"),
  ex("sorry", "desculpe", "moon"),
  ex("good morning", "bom dia", "moon"),
  ex("good night", "boa noite", "moon"),
  ex("thank you", "obrigado", "moon"),
  ex("good afternoon", "boa tarde", "moon"),
  ex("good evening", "boa noite (ao chegar)", "moon"),
  ex("see you soon", "até logo", "moon"),
  ex("please sit down", "por favor, sente-se", "moon"),
  ex("how are you", "como vai você", "moon"),
  ex("I am fine", "eu estou bem", "moon"),
  ex("see you tomorrow", "até amanhã", "moon"),
  ex("can you help me", "você pode me ajudar", "moon"),
  ex("what time is it", "que horas são", "moon"),
  ex("nice to meet you", "prazer em conhecer você", "moon"),
  ex("my name is Lucas", "meu nome é Lucas", "moon"),
  ex("where are you from", "de onde você é", "moon"),
  ex("I am from Brazil", "eu sou do Brasil", "moon"),
  ex("how old are you", "quantos anos você tem", "moon"),
  ex("this is my friend", "este é meu amigo", "moon"),
  ex("have a nice day", "tenha um bom dia", "moon"),
  ex("please say it again", "por favor, diga de novo", "moon"),
  ex("I do not understand", "eu não entendo", "moon"),
  ex("can you speak slowly", "você pode falar devagar", "moon"),
  ex("how is your family", "como está a sua família", "moon"),
  ex("I am twenty years old", "eu tenho vinte anos", "moon"),
  ex("nice to see you again", "bom ver você de novo", "moon"),
  // Mars (A2): food, shopping and routine
  ex("bread", "pão", "mars"),
  ex("juice", "suco", "mars"),
  ex("breakfast", "café da manhã", "mars"),
  ex("red apples", "maçãs vermelhas", "mars"),
  ex("fresh bread", "pão fresco", "mars"),
  ex("orange juice", "suco de laranja", "mars"),
  ex("the bill please", "a conta, por favor", "mars"),
  ex("I like black coffee", "eu gosto de café puro", "mars"),
  ex("I need some water", "eu preciso de água", "mars"),
  ex("we eat lunch together", "nós almoçamos juntos", "mars"),
  ex("a table for two", "uma mesa para dois", "mars"),
  ex("it is too expensive", "é caro demais", "mars"),
  ex("I want a cold drink", "eu quero uma bebida gelada", "mars"),
  ex("my mother cooks dinner today", "minha mãe cozinha o jantar hoje", "mars"),
  ex("I always have hot tea", "eu sempre tomo chá quente", "mars"),
  ex("we have breakfast at eight", "tomamos café da manhã às oito", "mars"),
  ex("how much is this shirt", "quanto custa esta camisa", "mars"),
  ex("can I pay by card", "posso pagar com cartão", "mars"),
  ex("we cook rice and beans", "nós cozinhamos arroz e feijão", "mars"),
  ex("the store opens at nine", "a loja abre às nove", "mars"),
  ex("I need to go shopping", "eu preciso ir às compras", "mars"),
  ex("I would like some more water", "eu gostaria de mais água", "mars"),
  ex("we are going to the market", "nós vamos ao mercado", "mars"),
  ex("can I have some more coffee", "posso tomar mais café", "mars"),
  ex("he always walks to work early", "ele sempre caminha para o trabalho cedo", "mars"),
  ex("I usually wake up at seven", "eu costumo acordar às sete", "mars"),
  ex("do you have a smaller size", "você tem um tamanho menor", "mars"),
  ex("I buy fresh bread every day", "eu compro pão fresco todo dia", "mars"),
  ex("she drinks orange juice every morning", "ela toma suco de laranja toda manhã", "mars"),
  // Venus (A2): relationships and emotions
  ex("best friends", "melhores amigos", "venus"),
  ex("I miss you", "sinto sua falta", "venus"),
  ex("I feel tired", "eu me sinto cansado", "venus"),
  ex("do not worry", "não se preocupe", "venus"),
  ex("I miss my family", "sinto falta da minha família", "venus"),
  ex("we are best friends", "nós somos melhores amigos", "venus"),
  ex("do not be afraid", "não tenha medo", "venus"),
  ex("she makes me laugh", "ela me faz rir", "venus"),
  ex("I trust him completely", "eu confio nele completamente", "venus"),
  ex("we talk every night", "nós conversamos toda noite", "venus"),
  ex("he never gives up", "ele nunca desiste", "venus"),
  ex("I feel happy today", "eu me sinto feliz hoje", "venus"),
  ex("we are very happy today", "estamos muito felizes hoje", "venus"),
  ex("he looks a little sad", "ele parece um pouco triste", "venus"),
  ex("they got married last year", "eles se casaram no ano passado", "venus"),
  ex("I am proud of you", "tenho orgulho de você", "venus"),
  ex("I am worried about him", "estou preocupado com ele", "venus"),
  ex("she is very kind to me", "ela é muito gentil comigo", "venus"),
  // Jupiter (B1): travel and transport
  ex("a window seat", "um assento na janela", "jupiter"),
  ex("the next station", "a próxima estação", "jupiter"),
  ex("my bus is late", "meu ônibus está atrasado", "jupiter"),
  ex("is this seat taken", "este assento está ocupado", "jupiter"),
  ex("we arrive next Monday", "nós chegamos na próxima segunda", "jupiter"),
  ex("the train arrives at noon", "o trem chega ao meio-dia", "jupiter"),
  ex("where is the train station", "onde fica a estação de trem", "jupiter"),
  ex("I lost my passport yesterday", "eu perdi meu passaporte ontem", "jupiter"),
  ex("I would like a window seat", "eu gostaria de um assento na janela", "jupiter"),
  ex("what time does the flight leave", "que horas o voo sai", "jupiter"),
  ex("how do I reach the airport", "como chego ao aeroporto", "jupiter"),
  ex("we stay at a small hotel", "nós ficamos em um hotel pequeno", "jupiter"),
  ex("the tickets are in my bag", "as passagens estão na minha bolsa", "jupiter"),
  ex("please turn left at the corner", "por favor, vire à esquerda na esquina", "jupiter"),
  ex("the trip was longer than expected", "a viagem foi mais longa que o esperado", "jupiter"),
];

export const sentenceOf = (e: Exercise) => e.words.map((x) => x.text).join(" ");
