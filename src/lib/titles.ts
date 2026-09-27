// Kept free of imports so scripts can load it directly.

export type Title = { name: string; pt: string; feminine?: boolean; from: number; to: number; vibe: string };

/** The Space track. `to` is inclusive; the last title has no ceiling. */
export const TITLES: Title[] = [
  { name: "Stardust", pt: "Poeira Estelar", feminine: true, from: 0, to: 10, vibe: "Stardust, where everything begins" },
  { name: "Comet", pt: "Cometa", from: 11, to: 20, vibe: "Direction and speed" },
  { name: "Cadet", pt: "Cadete", from: 21, to: 30, vibe: "Joining the space academy" },
  { name: "Astronaut", pt: "Astronauta", from: 31, to: 45, vibe: "Your first real mission" },
  { name: "Pilot", pt: "Piloto", from: 46, to: 60, vibe: "Flying solo" },
  { name: "Navigator", pt: "Navegador", from: 61, to: 75, vibe: "Charting routes" },
  { name: "Commander", pt: "Comandante", from: 76, to: 90, vibe: "Leading the crew" },
  { name: "Captain", pt: "Capitão", from: 91, to: 105, vibe: "Confident command" },
  { name: "Admiral", pt: "Almirante", from: 106, to: 120, vibe: "Commanding whole fleets" },
  { name: "Star Forger", pt: "Forjador de Estrelas", from: 121, to: 135, vibe: "Creating stars" },
  { name: "Galaxy Guardian", pt: "Guardião da Galáxia", from: 136, to: 150, vibe: "Protector of the galaxy" },
  { name: "Cosmic Legend", pt: "Lenda Cósmica", feminine: true, from: 151, to: Infinity, vibe: "No ceiling" },
];

/** "Houston, we have a new Pilot!" and its translation: a promotion that teaches English too. */
export const promotionPhrase = (t: Title) => `Houston, we have a new ${t.name}!`;
export const promotionTranslation = (t: Title) => `Houston, temos ${t.feminine ? "uma nova" : "um novo"} ${t.pt}!`;
