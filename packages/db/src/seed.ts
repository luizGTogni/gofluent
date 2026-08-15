import type { BossChallengeRepository, LexemeRepository, WorldRepository } from "@gofluent/core";

const INITIAL_LEXEMES = [
  ["lex_be", "be", "verb", 1, "A1"], ["lex_have", "have", "verb", 2, "A1"],
  ["lex_actually", "actually", "adverb", 487, "A2"], ["lex_figure_out", "figure out", "verb", 1200, "B1"],
] as const;
export function seedInitialLexemes(repository: LexemeRepository, now: string): void {
  for (const [id, lemma, partOfSpeech, frequencyRank, cefr] of INITIAL_LEXEMES) repository.upsert({ id, language: "en", lemma, partOfSpeech, frequencyRank, cefr, forms: [lemma], createdAt: now, updatedAt: now });
}

/** PRD §29 — first three MVP worlds, each with a curated target-vocabulary subset for mastery scoring. */
const INITIAL_WORLDS = [
  { id: "world_everyday_life", key: "everyday-life", name: "Everyday Life", ordering: 0, targetLexemeIds: ["lex_be", "lex_have"] },
  { id: "world_travel", key: "travel", name: "Travel", ordering: 1, targetLexemeIds: ["lex_actually"] },
  { id: "world_technology", key: "technology", name: "Technology", ordering: 2, targetLexemeIds: ["lex_figure_out"] },
] as const;

export function seedWorlds(repository: WorldRepository, now: string): void {
  for (const world of INITIAL_WORLDS) {
    repository.upsert({
      id: world.id, language: "en", key: world.key, name: world.name, description: undefined,
      ordering: world.ordering, targetLexemeIds: [...world.targetLexemeIds], createdAt: now, updatedAt: now,
    });
  }
}

/** PRD §30 — one boss challenge per initial world; target phrases are conversation-prompt context, not a hard requirement. */
const INITIAL_BOSS_CHALLENGES = [
  {
    id: "boss_coffee_shop", worldId: "world_everyday_life", key: "coffee-shop-order", title: "Coffee Shop Order",
    scenario: "You walk into a busy coffee shop and need to order a drink, answer follow-up questions, and pay.",
    targetPhrases: ["I'd like...", "Can I get...", "How much is it?"],
  },
  {
    id: "boss_airport_checkin", worldId: "world_travel", key: "airport-check-in", title: "Airport Check-In",
    scenario: "You are checking in for an international flight and need to answer the agent's questions and hand over your documents.",
    targetPhrases: ["Here is my passport", "I'd like a window seat", "How many bags can I check?"],
  },
  {
    id: "boss_tech_support", worldId: "world_technology", key: "tech-support-call", title: "Tech Support Call",
    scenario: "Your internet stopped working and you call tech support to explain the problem and follow their instructions.",
    targetPhrases: ["It's not working", "I already tried that", "Can you walk me through it?"],
  },
] as const;

export function seedBossChallenges(repository: BossChallengeRepository, now: string): void {
  for (const challenge of INITIAL_BOSS_CHALLENGES) {
    repository.upsert({
      id: challenge.id, worldId: challenge.worldId, language: "en", key: challenge.key, title: challenge.title,
      scenario: challenge.scenario, targetPhrases: [...challenge.targetPhrases], createdAt: now, updatedAt: now,
    });
  }
}
