// Kept dependency-free so scripts can load it directly.
import type { PlanetId } from "./planets";

export type CelestialBody = {
  id: string;
  name: string;
  pt: string;
  /** The trivia line from the solar-system ordering — shown as this stop's tooltip. */
  fame: string;
  /** Orb sphere shading, [highlight, shadow] — only set for the stops that already have a design.
   * The rest render as plain waypoints for now, exactly as asked ("o resto pode deixar sem"). */
  color?: [string, string];
  ring?: boolean;
  /** Set only when this stop is one of the playable course planets — everything else is a
   * scenery waypoint along the path with no content behind it yet. */
  planetId?: PlanetId;
};

/**
 * The full journey, ordered by real distance from the Sun (plus our three invented planets tacked
 * on at the end, same as before). Only the first 16 stops have a rendered orb design; the rest are
 * plain placeholders until they get one — see `color`.
 */
export const CELESTIAL_PATH: CelestialBody[] = [
  { id: "mercury", name: "Mercury", pt: "Mercúrio", fame: "Planeta mais próximo do Sol", color: ["#d9cfc2", "#6b6255"] },
  { id: "venus", name: "Venus", pt: "Vênus", fame: "O mais quente, \"gêmeo\" da Terra", color: ["#ffd9a0", "#8a5a1e"], planetId: "venus" },
  { id: "earth", name: "Earth", pt: "Terra", fame: "Nosso lar", color: ["#7ec8ff", "#123a66"], planetId: "earth" },
  { id: "moon", name: "Moon", pt: "Lua", fame: "Único satélite natural da Terra", color: ["#e6e6e6", "#6b6b6b"] },
  { id: "mars", name: "Mars", pt: "Marte", fame: "O \"planeta vermelho\", alvo de missões", color: ["#ff9d70", "#7a2410"], planetId: "mars" },
  { id: "phobos", name: "Phobos", pt: "Fobos", fame: "Maior lua de Marte — orbita tão perto que um dia vai se despedaçar", color: ["#b9a99a", "#4a3f35"] },
  { id: "deimos", name: "Deimos", pt: "Deimos", fame: "Segunda lua de Marte, a menor das duas", color: ["#c7bbae", "#5c5044"] },
  { id: "ceres", name: "Ceres", pt: "Ceres", fame: "Maior objeto do cinturão de asteroides", color: ["#cfc9bd", "#6d6759"] },
  { id: "vesta", name: "Vesta", pt: "Vesta", fame: "Um dos asteroides mais brilhantes visíveis a olho nu", color: ["#d9cdb0", "#7a6a45"] },
  { id: "pallas", name: "Pallas", pt: "Palas", fame: "Terceiro maior asteroide conhecido", color: ["#b8b2a6", "#4f483c"] },
  { id: "jupiter", name: "Jupiter", pt: "Júpiter", fame: "Maior planeta do sistema solar", color: ["#f0c98f", "#7a4f22"], planetId: "jupiter" },
  { id: "io", name: "Io", pt: "Io", fame: "Lua mais vulcânica conhecida no sistema solar", color: ["#fff2a0", "#a67c1e"] },
  { id: "europa", name: "Europa", pt: "Europa", fame: "Oceano de água líquida sob o gelo — forte candidata a vida", color: ["#f2ede0", "#9a9382"] },
  { id: "ganymede", name: "Ganymede", pt: "Ganimedes", fame: "Maior lua do sistema solar, maior que Mercúrio", color: ["#c9beae", "#6b5f4d"] },
  { id: "callisto", name: "Callisto", pt: "Calisto", fame: "Superfície mais cheia de crateras já registrada", color: ["#a99f92", "#4a4238"] },
  { id: "saturn", name: "Saturn", pt: "Saturno", fame: "Famoso pelos anéis", color: ["#f6e2b3", "#8a6a2a"], ring: true, planetId: "saturn" },

  { id: "titan", name: "Titan", pt: "Titã", fame: "Única lua com atmosfera densa e lagos de metano líquido" },
  { id: "enceladus", name: "Enceladus", pt: "Encélado", fame: "Jatos de água gelada — um dos lugares mais promissores para vida" },
  { id: "mimas", name: "Mimas", pt: "Mimas", fame: "Ficou famosa por parecer a \"Estrela da Morte\" de Star Wars" },
  { id: "rhea", name: "Rhea", pt: "Reia", fame: "Segunda maior lua de Saturno" },
  { id: "iapetus", name: "Iapetus", pt: "Jápeto", fame: "Lua \"bicolor\", metade clara e metade escura" },
  { id: "uranus", name: "Uranus", pt: "Urano", fame: "Gira \"deitado\" de lado", planetId: "uranus" },
  { id: "titania", name: "Titania", pt: "Titânia", fame: "Maior lua de Urano" },
  { id: "oberon", name: "Oberon", pt: "Oberon", fame: "Segunda maior lua de Urano" },
  { id: "miranda", name: "Miranda", pt: "Miranda", fame: "Superfície mais bizarra e fraturada do sistema solar" },
  { id: "umbriel", name: "Umbriel", pt: "Umbriel", fame: "A lua mais escura de Urano" },
  { id: "neptune", name: "Neptune", pt: "Netuno", fame: "Ventos mais fortes do sistema solar", planetId: "neptune" },
  { id: "triton", name: "Triton", pt: "Tritão", fame: "Orbita ao contrário do giro do próprio planeta — único caso assim" },
  { id: "pluto", name: "Pluto", pt: "Plutão", fame: "Ex-planeta, símbolo de debate científico" },
  { id: "charon", name: "Charon", pt: "Caronte", fame: "Tão grande perto de Plutão que os dois quase formam um \"planeta duplo\"" },
  { id: "eris", name: "Eris", pt: "Éris", fame: "Descoberta que levou ao \"rebaixamento\" de Plutão" },
  { id: "haumea", name: "Haumea", pt: "Haumea", fame: "Formato oval, gira rapidíssimo" },
  { id: "makemake", name: "Makemake", pt: "Makemake", fame: "Terceiro maior planeta anão conhecido" },
  { id: "sedna", name: "Sedna", pt: "Sedna", fame: "Um dos objetos mais distantes e enigmáticos do sistema solar" },

  // Invented planets — not real, kept at the very end of the journey, same as before.
  { id: "aurelia", name: "Aurelia", pt: "Aurélia", fame: "Greetings and introductions", color: ["#ffe08a", "#a8720a"], planetId: "aurelia" },
  { id: "virelia", name: "Virelia", pt: "Virélia", fame: "Idioms and expressions", color: ["#d9a6ff", "#5b1f8a"], planetId: "virelia" },
  { id: "zenith", name: "Zenith", pt: "Zênite", fame: "Series, films and fast conversation", color: ["#f5f5f5", "#8a8a8a"], planetId: "zenith" },
];
