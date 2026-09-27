// ARPAbet (CMUdict) to American IPA in the dictionary's style: /ˈlɔːŋɡər/, long vowels marked,
// stress only on words of more than one syllable. Dependency-free so scripts can load it directly.

const VOWELS: Record<string, [unstressed: string, stressed: string]> = {
  AA: ["ɑː", "ɑː"],
  AE: ["æ", "æ"],
  AH: ["ə", "ʌ"],
  AO: ["ɔː", "ɔː"],
  AW: ["aʊ", "aʊ"],
  AY: ["aɪ", "aɪ"],
  EH: ["ɛ", "ɛ"],
  ER: ["ər", "ɜːr"],
  EY: ["eɪ", "eɪ"],
  IH: ["ɪ", "ɪ"],
  IY: ["i", "iː"],
  OW: ["oʊ", "oʊ"],
  OY: ["ɔɪ", "ɔɪ"],
  UH: ["ʊ", "ʊ"],
  UW: ["uː", "uː"],
};

const CONSONANTS: Record<string, string> = {
  B: "b", CH: "tʃ", D: "d", DH: "ð", F: "f", G: "ɡ", HH: "h", JH: "dʒ", K: "k", L: "l", M: "m", N: "n",
  NG: "ŋ", P: "p", R: "r", S: "s", SH: "ʃ", T: "t", TH: "θ", V: "v", W: "w", Y: "j", Z: "z", ZH: "ʒ",
};

// Consonant clusters that can start an English syllable: the stress mark goes before the longest one.
const ONSETS = new Set([
  "pl", "pr", "bl", "br", "tr", "dr", "kl", "kr", "ɡl", "ɡr", "fl", "fr", "θr", "ʃr", "sp", "st", "sk", "sm", "sn",
  "sl", "sw", "tw", "dw", "kw", "ɡw", "θw", "pj", "bj", "fj", "vj", "mj", "kj", "hj", "nj", "spl", "spr", "str", "skr", "skw", "skj",
]);

type Seg = { ipa: string; vowel: boolean; stress: 0 | 1 | 2 };

/** "L AO1 NG G ER0" → "/ˈlɔːŋɡər/". */
export function arpabetToIpa(arpabet: string): string {
  // An unstressed ER right before a vowel is "ə" + the next syllable's "r": ER0 AY1 V → /əˈraɪv/.
  const phones = arpabet.trim().split(/\s+/).flatMap((ph, i, all) => (ph === "ER0" && /\d$/.test(all[i + 1] ?? "") ? ["AH0", "R"] : [ph]));
  const segs: Seg[] = phones.map((ph) => {
    const m = /^([A-Z]+)([012])?$/.exec(ph);
    if (!m) throw new Error(`bad phoneme "${ph}"`);
    const [, base, s] = m;
    if (VOWELS[base]) {
      const stress = Number(s ?? 0) as 0 | 1 | 2;
      return { ipa: VOWELS[base][stress === 0 ? 0 : 1], vowel: true, stress };
    }
    if (!CONSONANTS[base]) throw new Error(`bad phoneme "${ph}"`);
    return { ipa: CONSONANTS[base], vowel: false, stress: 0 };
  });

  const syllables = segs.filter((s) => s.vowel).length;
  const marks = new Map<number, string>();
  if (syllables > 1) {
    const primary = segs.findIndex((s) => s.stress === 1);
    segs.forEach((s, i) => {
      // Secondary stress is marked only before the primary one (/ˌɡʊdˈbaɪ/), not after (/ˈwiːkɛnd/).
      if (!s.vowel || s.stress === 0 || (s.stress === 2 && i > primary)) return;
      // Walk back over the consonants before this vowel, keeping the longest valid onset.
      let start = i;
      while (start > 0 && !segs[start - 1].vowel) start--;
      let at = i;
      for (let k = start; k < i; k++) {
        const cluster = segs.slice(k, i).map((x) => x.ipa).join("");
        if (k === start && start === 0) {
          at = 0;
          break;
        }
        if (i - k === 1 || ONSETS.has(cluster)) {
          at = k;
          break;
        }
      }
      marks.set(at, s.stress === 1 ? "ˈ" : "ˌ");
    });
  }

  return `/${segs.map((s, i) => (marks.get(i) ?? "") + s.ipa).join("")}/`;
}
