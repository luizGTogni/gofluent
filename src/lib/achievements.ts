// Kept dependency-free so scripts can load it directly.
import type { Rarity } from "./badges";
import type { IconName } from "./icons";

// Achievements: long-term goals, each unlocked once when a metric reaches its target. The server
// decides (track_achievements, migration 0028): it derives most metrics from what it already
// stores and keeps counters for the signals only the client sees (a perfect run, the mode, the
// hour). Mirrored by public.achievement_defs; keep them in step.

export type AchievementCategory = "routine" | "volume" | "journey" | "level" | "review" | "precision" | "modes" | "economy";

/**
 * Metrics the server derives from its own tables. `rank` is the title index, `cefr` the estimated
 * level as 1 (A1) to 6 (C2), `planet_<id>` is 1 once that planet's stop is finished.
 */
export type DerivedMetric =
  | "phrases"
  | "best_streak"
  | "weekend"
  | "full_week"
  | "five_day_week"
  | "month_days"
  | "day_seconds"
  | "day_xp"
  | "away_return"
  | "level"
  | "rank"
  | "rank_level"
  | "planets_visited"
  | "planets_done"
  | "planet_venus"
  | "planet_mars"
  | "planet_saturn"
  | "planet_zenith"
  | "cefr"
  | "words"
  | "saved"
  | "no_hint"
  | "shields_used"
  | "daily_quests"
  | "all_dailies_streak"
  | "all_weeklies"
  | "coins"
  | "interest"
  | "oxygen_used"
  | "freezes"
  | "cosmetics";

/** Signals only the client sees, sent with each phrase or session (see achievementOps). */
export type SignalMetric =
  | "perfect"
  | "perfect_row"
  | "comebacks"
  | "fast_row"
  | "long_first_try"
  | "reviews"
  | "reviews_day"
  | "tricky_cleared"
  | "tricky_removed"
  | "reconquest"
  | "sessions"
  | "sessions_day"
  | "clean_sessions"
  | "before_8"
  | "before_6"
  | "small_hours"
  | "lunch"
  | "night_days"
  | "shifts_day"
  | "modes_day"
  | "difficulties"
  | "time_attack_best"
  | "time_attack_half"
  | "survival_best"
  | "survival_flawless"
  | "storm_wins"
  | "storm_eclipse_perfect"
  | "blind_phrases"
  | "eclipse_phrases"
  | "eclipse_perfect_row";

export type Metric = DerivedMetric | SignalMetric;

export type AchievementDef = {
  id: string;
  name: string;
  /** The Portuguese name, shown under the English one. */
  pt: string;
  description: string;
  icon: IconName;
  rarity: Rarity;
  category: AchievementCategory;
  metric: Metric;
  target: number;
  /** Bit masks (all modes in a day, every difficulty…) are all-or-nothing: no progress bar. */
  mask?: boolean;
};

/** Paid once, on unlock. Mirrored in achievement_defs. */
export const ACHIEVEMENT_REWARD: Record<Rarity, { coins: number; crystals: number }> = {
  common: { coins: 20, crystals: 0 },
  rare: { coins: 60, crystals: 0 },
  epic: { coins: 150, crystals: 3 },
  legendary: { coins: 500, crystals: 10 },
};

export const CATEGORY_NAME: Record<AchievementCategory, string> = {
  routine: "Routine",
  volume: "Volume",
  journey: "Titles & journey",
  level: "English level",
  review: "Review & words",
  precision: "Precision",
  modes: "Modes & difficulty",
  economy: "Missions & economy",
};

const a = (
  id: string,
  name: string,
  pt: string,
  description: string,
  icon: IconName,
  rarity: Rarity,
  category: AchievementCategory,
  metric: Metric,
  target: number,
  mask = false,
): AchievementDef => ({ id, name, pt, description, icon, rarity, category, metric, target, ...(mask ? { mask } : {}) });

export const ACHIEVEMENTS: AchievementDef[] = [
  // ---- routine ----
  a("ignition", "Ignition", "Ignição", "Finish your first phrase.", "rocket", "common", "routine", "phrases", 1),
  a("liftoff", "Liftoff", "Decolagem", "Finish your first full session.", "rocket", "common", "routine", "sessions", 1),
  a("orbit_3", "Short Orbit", "Órbita Curta", "Study 3 days in a row.", "orbit", "common", "routine", "best_streak", 3),
  a("orbit_7", "A Week in Orbit", "Semana em Órbita", "Study 7 days in a row.", "orbit", "rare", "routine", "best_streak", 7),
  a("orbit_14", "Stellar Fortnight", "Quinzena Estelar", "Study 14 days in a row.", "orbit", "rare", "routine", "best_streak", 14),
  a("orbit_30", "Titanium Habit", "Hábito de Titânio", "Study 30 days in a row.", "orbit", "epic", "routine", "best_streak", 30),
  a("orbit_60", "Steady Course", "Rota Estável", "Study 60 days in a row.", "orbit", "epic", "routine", "best_streak", 60),
  a("orbit_100", "Cosmic Centennial", "Centenário Cósmico", "Study 100 days in a row.", "orbit", "legendary", "routine", "best_streak", 100),
  a("orbit_365", "Light-Year", "Ano-Luz", "Study 365 days in a row.", "orbit", "legendary", "routine", "best_streak", 365),
  a("lunar_weekend", "Lunar Weekend", "Fim de Semana Lunar", "Study on Saturday and Sunday of the same week.", "moon", "common", "routine", "weekend", 1),
  a("full_week", "Full Week", "Semana Cheia", "Study every day from Monday to Sunday.", "check", "rare", "routine", "full_week", 1),
  a("five_moons", "Five Moons", "Cinco Luas", "Study 5 days in the same week.", "moon", "common", "routine", "five_day_week", 1),
  a("monthly_mission", "Monthly Mission", "Missão Mensal", "Study 20 days in the same month.", "target", "epic", "routine", "month_days", 20),
  a("first_light", "First Light", "Primeira Luz", "Study before 8am.", "sunrise", "common", "routine", "before_8", 1),
  a("solar_dawn", "Solar Dawn", "Alvorada Solar", "Study before 6am.", "sunrise", "rare", "routine", "before_6", 1),
  a("graveyard_shift", "Graveyard Shift", "Turno da Madrugada", "Study between midnight and 4am.", "moon", "rare", "routine", "small_hours", 1),
  a("owl_on_duty", "Owl on Duty", "Coruja de Plantão", "Study after 10pm on 5 different days.", "moon", "rare", "routine", "night_days", 5),
  a("hangar_break", "Hangar Break", "Pausa no Hangar", "Study between noon and 2pm.", "timer", "common", "routine", "lunch", 1),
  a("three_shifts", "Three Shifts", "Três Turnos", "Study in the morning, afternoon and evening of the same day.", "sparkles", "epic", "routine", "shifts_day", 7, true),
  a("shield_up", "Shield Up", "Escudo Ativado", "Let a Streak Shield save your streak.", "shield", "common", "routine", "shields_used", 1),
  a("back_in_orbit", "Back in Orbit", "Retorno à Órbita", "Come back to study after 7 days or more away.", "comeback", "rare", "routine", "away_return", 7),
  a("reconquest", "Reconquest", "Reconquista", "Win back a title star you lost while away.", "star-filled", "rare", "routine", "reconquest", 1),

  // ---- volume ----
  a("words_50", "Breaking the Lunar Ice", "Quebrando o Gelo Lunar", "Practise 50 different words.", "bookmark", "common", "volume", "words", 50),
  a("words_100", "Ship's Vocabulary", "Vocabulário de Bordo", "Practise 100 different words.", "bookmark", "common", "volume", "words", 100),
  a("words_250", "Word Belt", "Cinturão de Palavras", "Practise 250 different words.", "bookmark", "rare", "volume", "words", 250),
  a("words_500", "Galactic Encyclopedia", "Enciclopédia Galáctica", "Practise 500 different words.", "bookmark", "epic", "volume", "words", 500),
  a("words_1000", "Milky Way of Words", "Via Láctea de Palavras", "Practise 1,000 different words.", "bookmark", "epic", "volume", "words", 1000),
  a("words_2000", "Stellar Library", "Biblioteca Estelar", "Practise 2,000 different words.", "bookmark", "legendary", "volume", "words", 2000),
  a("phrases_100", "A Hundred Transmissions", "Cem Transmissões", "Finish 100 phrases.", "volume", "common", "volume", "phrases", 100),
  a("phrases_500", "Five Hundred Transmissions", "Quinhentas Transmissões", "Finish 500 phrases.", "volume", "rare", "volume", "phrases", 500),
  a("phrases_1000", "A Thousand Transmissions", "Mil Transmissões", "Finish 1,000 phrases.", "volume", "epic", "volume", "phrases", 1000),
  a("phrases_5000", "Interstellar Network", "Rede Interestelar", "Finish 5,000 phrases.", "volume", "legendary", "volume", "phrases", 5000),
  a("orbital_marathon", "Orbital Marathon", "Maratona Orbital", "Finish 5 sessions in one day.", "rocket", "rare", "volume", "sessions_day", 5),
  a("orbital_ultra", "Orbital Ultramarathon", "Ultramaratona Orbital", "Finish 10 sessions in one day.", "rocket", "epic", "volume", "sessions_day", 10),
  a("flight_hour", "Flight Time", "Hora de Voo", "Study for 30 minutes in one day.", "timer", "common", "volume", "day_seconds", 1800),
  a("long_haul", "Long-Haul Flight", "Voo de Longa Distância", "Study for 60 minutes in one day.", "timer", "rare", "volume", "day_seconds", 3600),
  a("max_thrust", "Maximum Thrust", "Propulsão Máxima", "Earn 1,000 XP in one day.", "combo", "rare", "volume", "day_xp", 1000),
  a("level_10", "Level 10", "Nível 10", "Reach level 10.", "star", "common", "volume", "level", 10),
  a("level_25", "Level 25", "Nível 25", "Reach level 25.", "star", "rare", "volume", "level", 25),
  a("level_50", "Level 50", "Nível 50", "Reach level 50.", "star-filled", "epic", "volume", "level", 50),
  a("level_100", "Level 100", "Nível 100", "Reach level 100.", "star-filled", "legendary", "volume", "level", 100),

  // ---- titles & journey ----
  a("title_comet", "Comet Trail", "Rastro de Cometa", "Earn the Comet title.", "sparkles", "common", "journey", "rank", 1),
  a("title_cadet", "Academy Cadet", "Cadete da Academia", "Earn the Cadet title.", "astronaut", "common", "journey", "rank", 2),
  a("title_astronaut", "First Real Mission", "Primeira Missão Real", "Earn the Astronaut title.", "astronaut", "rare", "journey", "rank", 3),
  a("title_pilot", "Flying Solo", "Voo Solo", "Earn the Pilot title.", "rocket", "rare", "journey", "rank", 4),
  a("title_navigator", "Star Chart", "Mapa Estelar", "Earn the Navigator title.", "compass", "rare", "journey", "rank", 5),
  a("title_commander", "Crew Command", "Comando da Tripulação", "Earn the Commander title.", "astronaut", "epic", "journey", "rank", 6),
  a("title_admiral", "Fleet Admiral", "Almirante da Frota", "Earn the Admiral title.", "star-filled", "epic", "journey", "rank", 8),
  a("title_legend", "Cosmic Legend", "Lenda Cósmica", "Earn the Cosmic Legend title.", "star-filled", "legendary", "journey", "rank", 11),
  a("three_stars", "Three Stars", "Três Estrelas", "Reach 3 stars in a title.", "star-filled", "rare", "journey", "rank_level", 8),
  a("venus_landing", "Landing on Venus", "Pouso em Vênus", "Finish the Venus stop.", "orbit", "common", "journey", "planet_venus", 1),
  a("red_planet", "Red Planet", "Planeta Vermelho", "Finish the Mars stop.", "orbit", "rare", "journey", "planet_mars", 1),
  a("lord_of_rings", "Lord of the Rings", "Senhor dos Anéis", "Finish the Saturn stop.", "orbit", "epic", "journey", "planet_saturn", 1),
  a("zenith", "Zenith", "Zênite", "Finish the Zenith stop.", "orbit", "legendary", "journey", "planet_zenith", 1),
  a("explorer", "Explorer", "Explorador", "Visit 3 planets.", "compass", "common", "journey", "planets_visited", 3),
  a("grand_tour", "Grand Tour", "Grand Tour", "Finish every planet's stop.", "compass", "legendary", "journey", "planets_done", 10),

  // ---- estimated English level ----
  a("cefr_a2", "Signal Found", "Sinal Captado", "Reach an estimated A2.", "volume", "common", "level", "cefr", 2),
  a("cefr_b1", "Clear Frequency", "Frequência Clara", "Reach an estimated B1.", "volume", "rare", "level", "cefr", 3),
  a("cefr_b2", "Steady Link", "Comunicação Estável", "Reach an estimated B2.", "volume", "epic", "level", "cefr", 4),
  a("cefr_c1", "Crisp Transmission", "Transmissão Nítida", "Reach an estimated C1.", "volume", "epic", "level", "cefr", 5),
  a("cefr_c2", "Stellar Fluency", "Fluência Estelar", "Reach an estimated C2.", "volume", "legendary", "level", "cefr", 6),

  // ---- review & words ----
  a("mission_control", "Mission Control", "Controle da Missão", "Review 100 phrases.", "refresh", "rare", "review", "reviews", 100),
  a("command_center", "Command Center", "Central de Comando", "Review 500 phrases.", "refresh", "epic", "review", "reviews", 500),
  a("flight_checklist", "Flight Checklist", "Checklist de Voo", "Review 25 phrases in one day.", "refresh", "common", "review", "reviews_day", 25),
  a("asteroid_dodged", "Asteroid Dodged", "Asteroide Desviado", "Clear your tricky words list.", "alert", "rare", "review", "tricky_cleared", 1),
  a("debris_cleared", "Debris Cleared", "Detrito Removido", "Take 10 words off your tricky list.", "alert", "common", "review", "tricky_removed", 10),
  a("logbook", "Logbook", "Diário de Bordo", "Save 25 words or chunks.", "bookmark", "common", "review", "saved", 25),
  a("black_box", "Black Box", "Caixa-Preta", "Save 100 words or chunks.", "bookmark", "rare", "review", "saved", 100),

  // ---- precision ----
  a("laser_aim", "Laser Aim", "Mira Laser", "Finish 10 phrases with a perfect score.", "target", "common", "precision", "perfect", 10),
  a("orbital_precision", "Orbital Precision", "Precisão Orbital", "Finish 100 phrases with a perfect score.", "target", "rare", "precision", "perfect", 100),
  a("planetary_alignment", "Planetary Alignment", "Alinhamento Planetário", "Finish 3 perfect phrases in a row.", "sparkles", "rare", "precision", "perfect_row", 3),
  a("perfect_constellation", "Perfect Constellation", "Constelação Perfeita", "Finish 5 perfect phrases in a row.", "sparkles", "epic", "precision", "perfect_row", 5),
  a("supernova", "Supernova", "Supernova", "Finish 10 perfect phrases in a row.", "sparkles", "legendary", "precision", "perfect_row", 10),
  a("clean_flight", "Clean Flight", "Voo Limpo", "Finish a whole session without a single mistake.", "check", "rare", "precision", "clean_sessions", 1),
  a("gravity_bounce", "Gravity Bounce", "Ricochete Gravitacional", "Get right on the first try a phrase you missed before.", "comeback", "common", "precision", "comebacks", 1),
  a("gravity_slingshot", "Gravity Slingshot", "Estilingue Gravitacional", "Make 25 comebacks like that.", "comeback", "epic", "precision", "comebacks", 25),
  a("instinct_navigation", "Navigating by Instinct", "Navegação por Instinto", "Finish 500 phrases without a hint.", "bulb-off", "legendary", "precision", "no_hint", 500),
  a("escape_velocity", "Escape Velocity", "Velocidade de Escape", "Earn the speed bonus on 10 phrases in a row.", "combo", "rare", "precision", "fast_row", 10),
  a("long_transmission", "Long Transmission", "Transmissão Longa", "Get a phrase of 15 words or more right on the first try.", "volume", "rare", "precision", "long_first_try", 1),

  // ---- modes & difficulty ----
  a("space_fold", "Space Fold", "Dobra Espacial", "Solve 10 phrases in one Time Attack run.", "timer", "common", "modes", "time_attack_best", 10),
  a("hyperdrive", "Hyperdrive", "Hiperpropulsão", "Solve 15 phrases in one Time Attack run.", "timer", "epic", "modes", "time_attack_best", 15),
  a("countdown", "Countdown", "Contagem Regressiva", "In Time Attack, finish a phrase in under half the expected time.", "timer", "rare", "modes", "time_attack_half", 1),
  a("survivor", "Survivor", "Sobrevivente", "Solve 10 phrases in one Survival run.", "heart", "common", "modes", "survival_best", 10),
  a("last_air", "Last Breath of Air", "Última Reserva de Ar", "Solve 25 phrases in one Survival run.", "oxygen", "epic", "modes", "survival_best", 25),
  a("intact_hull", "Intact Hull", "Casco Intacto", "Solve 20 phrases in Survival without losing a life.", "heart", "epic", "modes", "survival_flawless", 20),
  a("storm_chaser", "Storm Chaser", "Caçador de Tempestades", "Beat a Solar Storm.", "storm", "common", "modes", "storm_wins", 1),
  a("eye_of_storm", "Eye of the Storm", "Olho do Furacão", "Beat 10 Solar Storms.", "storm", "epic", "modes", "storm_wins", 10),
  a("perfect_storm", "Perfect Storm", "Tempestade Perfeita", "Beat a Solar Storm on Eclipse without a mistake.", "storm", "legendary", "modes", "storm_eclipse_perfect", 1),
  a("keen_ears", "Keen Ears", "Ouvidos Atentos", "Solve 10 phrases in Blind Dictation.", "eye-off", "common", "modes", "blind_phrases", 10),
  a("perfect_pitch", "Perfect Pitch", "Ouvido Absoluto", "Solve 100 phrases in Blind Dictation.", "eye-off", "epic", "modes", "blind_phrases", 100),
  a("single_listen", "A Single Listen", "Uma Escuta Só", "Finish 10 perfect phrases in a row on Eclipse.", "moon", "epic", "modes", "eclipse_perfect_row", 10),
  a("eclipse_lord", "Lord of the Eclipse", "Senhor do Eclipse", "Finish 100 phrases on Eclipse.", "moon", "legendary", "modes", "eclipse_phrases", 100),
  a("full_fleet", "Full Fleet", "Frota Completa", "Play every mode on the same day.", "rocket", "rare", "modes", "modes_day", 31, true),
  a("the_climb", "The Climb", "Escalada", "Finish a phrase on every difficulty.", "star", "rare", "modes", "difficulties", 15, true),

  // ---- missions & economy ----
  a("orders_of_the_day", "Orders of the Day", "Ordem do Dia", "Claim your first daily mission.", "target", "common", "economy", "daily_quests", 1),
  a("tour_of_duty", "Tour of Duty", "Semana de Serviço", "Complete every daily mission 7 days in a row.", "target", "epic", "economy", "all_dailies_streak", 7),
  a("weekly_report", "Weekly Report", "Relatório Semanal", "Complete every weekly mission in the same week.", "gift", "rare", "economy", "all_weeklies", 1),
  a("lunar_vault", "Lunar Vault", "Cofre Lunar", "Hold 1,000 Lunar Coins.", "coin", "rare", "economy", "coins", 1000),
  a("orbital_yield", "Orbital Yield", "Rendimento Orbital", "Receive study interest for the first time.", "coin", "rare", "economy", "interest", 1),
  a("reserve_tank", "Reserve Tank", "Tanque Reserva", "Use an Oxygen Extra to keep a run going.", "oxygen", "common", "economy", "oxygen_used", 1),
  a("emergency_stock", "Emergency Stock", "Estoque de Emergência", "Hold 3 Streak Shields at once.", "shield", "rare", "economy", "freezes", 3),
  a("space_style", "Space Style", "Estilo Espacial", "Buy your first cosmetic.", "crystal", "common", "economy", "cosmetics", 1),
];

export const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((d) => [d.id, d]));

export const ACHIEVEMENT_CATEGORIES = Object.keys(CATEGORY_NAME) as AchievementCategory[];

/** Progress toward `def` from its metric's value: 0..1, and whether it's reached. */
export function achievementProgress(def: AchievementDef, value: number | undefined): { value: number; pct: number; done: boolean } {
  const v = Number(value ?? 0);
  const done = def.mask ? (v & def.target) === def.target : v >= def.target;
  const pct = done ? 100 : def.mask ? 0 : Math.min(99, Math.floor((v / def.target) * 100));
  return { value: v, pct, done };
}

// ---- the client's signals ----

export type Signal = { metric: SignalMetric; n: number };

const MODE_BIT: Record<string, number> = { classic: 1, timeAttack: 2, survival: 4, boss: 8, blind: 16 };
const DIFFICULTY_BIT: Record<string, number> = { easy: 1, medium: 2, hard: 4, extreme: 8 };

/** What one finished phrase tells the server. Rows are the runs so far, this phrase included. */
export type PhraseFacts = {
  mode: string;
  difficulty: string;
  /** The learner's local hour, 0–23. */
  hour: number;
  perfect: boolean;
  firstTry: boolean;
  cameBack: boolean;
  review: boolean;
  words: number;
  /** Finished in under half the expected time. */
  halfTime: boolean;
  /** Phrases solved in this run, this one included. */
  runLength: number;
  /** Survival only: no life lost so far this run. */
  flawless: boolean;
  perfectRow: number;
  fastRow: number;
  eclipsePerfectRow: number;
  trickyRemoved: number;
  trickyCleared: boolean;
  /** A star or title won back while rank points were faded. */
  reconquest: boolean;
};

export function phraseSignals(f: PhraseFacts): Signal[] {
  const s: Signal[] = [];
  const add = (metric: SignalMetric, n: number | boolean) => {
    const v = Number(n);
    if (v > 0) s.push({ metric, n: v });
  };
  add("perfect", f.perfect);
  add("perfect_row", f.perfectRow);
  add("fast_row", f.fastRow);
  add("comebacks", f.cameBack);
  add("long_first_try", f.firstTry && f.words >= 15);
  add("reviews", f.review);
  add("reviews_day", f.review);
  add("tricky_removed", f.trickyRemoved);
  add("tricky_cleared", f.trickyCleared);
  add("reconquest", f.reconquest);
  add("before_8", f.hour < 8);
  add("before_6", f.hour < 6);
  add("small_hours", f.hour < 4);
  add("lunch", f.hour >= 12 && f.hour < 14);
  add("night_days", f.hour >= 22);
  add("shifts_day", f.hour >= 5 && f.hour < 12 ? 1 : f.hour >= 12 && f.hour < 18 ? 2 : f.hour >= 18 ? 4 : 0);
  add("modes_day", MODE_BIT[f.mode] ?? 0);
  add("difficulties", DIFFICULTY_BIT[f.difficulty] ?? 0);
  if (f.mode === "timeAttack") {
    add("time_attack_best", f.runLength);
    add("time_attack_half", f.halfTime);
  }
  if (f.mode === "survival") {
    add("survival_best", f.runLength);
    if (f.flawless) add("survival_flawless", f.runLength);
  }
  if (f.mode === "boss") {
    add("storm_wins", 1);
    add("storm_eclipse_perfect", f.perfect && f.difficulty === "extreme");
  }
  if (f.mode === "blind") add("blind_phrases", 1);
  if (f.difficulty === "extreme") {
    add("eclipse_phrases", 1);
    add("eclipse_perfect_row", f.eclipsePerfectRow);
  }
  return s;
}

/** What a finished session tells the server: `clean` when no phrase had a mistake or help. */
export function sessionSignals(clean: boolean): Signal[] {
  return [{ metric: "sessions", n: 1 }, { metric: "sessions_day", n: 1 }, ...(clean ? [{ metric: "clean_sessions" as const, n: 1 }] : [])];
}
