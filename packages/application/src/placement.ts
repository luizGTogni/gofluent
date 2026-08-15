import { CEFR_LEVELS, type CefrLevel, type Encounter } from "@gofluent/core";
import { learningValue } from "@gofluent/lexical-engine";
import { createId } from "@gofluent/shared";
import { SqliteLearnerProfileRepository, SqliteLexemeRepository, type DatabaseSync } from "@gofluent/db";
import { lexemeEncounterRepos, registerLexemeEncounterInTransaction } from "./register-encounter.js";

/**
 * Adaptive placement assessment (PRD §9.6, ARCHITECTURE.md §45). A simple
 * deterministic scoring over a fixed multiple-choice question set is
 * sufficient for MVP — it still bootstraps real LearnerLexemeState rows and
 * LearnerProfile estimate fields, which is what downstream planning depends on.
 */
export interface PlacementQuestion {
  id: string;
  lexemeId: string;
  lemma: string;
  cefr: CefrLevel;
  frequencyRank: number;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
}

export const PLACEMENT_QUESTIONS: readonly PlacementQuestion[] = [
  { id: "p_a1_1", lexemeId: "lex_placement_dog", lemma: "dog", cefr: "A1", frequencyRank: 300, prompt: 'What does "dog" mean?', options: ["an animal", "a color", "a number"], correctOptionIndex: 0 },
  { id: "p_a1_2", lexemeId: "lex_placement_eat", lemma: "eat", cefr: "A1", frequencyRank: 150, prompt: 'Choose the correct meaning of "eat".', options: ["to sleep", "to consume food", "to run"], correctOptionIndex: 1 },
  { id: "p_a2_1", lexemeId: "lex_placement_although", lemma: "although", cefr: "A2", frequencyRank: 900, prompt: 'What does "although" introduce?', options: ["a contrast", "a location", "a number"], correctOptionIndex: 0 },
  { id: "p_a2_2", lexemeId: "lex_placement_borrow", lemma: "borrow", cefr: "A2", frequencyRank: 1400, prompt: 'What does "borrow" mean?', options: ["to give away permanently", "to take something temporarily", "to buy"], correctOptionIndex: 1 },
  { id: "p_b1_1", lexemeId: "lex_placement_figure_out", lemma: "figure out", cefr: "B1", frequencyRank: 2200, prompt: 'What does "figure out" mean?', options: ["to solve or understand", "to decorate", "to travel"], correctOptionIndex: 0 },
  { id: "p_b1_2", lexemeId: "lex_placement_reluctant", lemma: "reluctant", cefr: "B1", frequencyRank: 3100, prompt: 'Someone "reluctant" is...', options: ["eager", "unwilling", "confused"], correctOptionIndex: 1 },
  { id: "p_b2_1", lexemeId: "lex_placement_ambiguous", lemma: "ambiguous", cefr: "B2", frequencyRank: 4500, prompt: 'Something "ambiguous" is...', options: ["open to more than one meaning", "very clear", "extremely large"], correctOptionIndex: 0 },
  { id: "p_b2_2", lexemeId: "lex_placement_undermine", lemma: "undermine", cefr: "B2", frequencyRank: 5200, prompt: 'To "undermine" something means to...', options: ["strengthen it", "weaken it gradually", "repair it"], correctOptionIndex: 1 },
  { id: "p_c1_1", lexemeId: "lex_placement_ostensibly", lemma: "ostensibly", cefr: "C1", frequencyRank: 7000, prompt: '"Ostensibly" means...', options: ["apparently, though maybe not really", "definitely", "rarely"], correctOptionIndex: 0 },
  { id: "p_c1_2", lexemeId: "lex_placement_vindicate", lemma: "vindicate", cefr: "C1", frequencyRank: 7600, prompt: 'To "vindicate" someone is to...', options: ["blame them", "clear them of blame", "ignore them"], correctOptionIndex: 1 },
  { id: "p_c2_1", lexemeId: "lex_placement_perspicacious", lemma: "perspicacious", cefr: "C2", frequencyRank: 9200, prompt: 'A "perspicacious" person is...', options: ["having keen insight", "very tired", "extremely shy"], correctOptionIndex: 0 },
  { id: "p_c2_2", lexemeId: "lex_placement_ephemeral", lemma: "ephemeral", cefr: "C2", frequencyRank: 9600, prompt: 'Something "ephemeral" is...', options: ["permanent", "short-lived", "enormous"], correctOptionIndex: 1 },
] as const;

export interface PlacementAnswer { questionId: string; selectedOptionIndex: number; }
export interface RunPlacementInput { userId: string; answers: PlacementAnswer[]; now?: Date; }
export interface PlacementScore {
  estimatedCefr: CefrLevel;
  estimatedReceptiveVocabulary: number;
  estimatedProductiveVocabulary: number;
  correctCount: number;
  totalCount: number;
}

/** Pure scoring, independent of persistence — the algorithm PRD §9.6 calls out as MVP-acceptable. */
export function scorePlacement(answers: PlacementAnswer[]): PlacementScore {
  const byLevel = new Map<CefrLevel, { correct: number; total: number }>();
  for (const level of CEFR_LEVELS) byLevel.set(level, { correct: 0, total: 0 });

  let correctCount = 0;
  for (const question of PLACEMENT_QUESTIONS) {
    const answer = answers.find((a) => a.questionId === question.id);
    const bucket = byLevel.get(question.cefr);
    if (!bucket) continue;
    bucket.total += 1;
    if (answer && answer.selectedOptionIndex === question.correctOptionIndex) {
      bucket.correct += 1;
      correctCount += 1;
    }
  }

  let estimatedCefr: CefrLevel = "A1";
  for (const level of CEFR_LEVELS) {
    const bucket = byLevel.get(level);
    if (bucket && bucket.total > 0 && bucket.correct / bucket.total >= 0.5) estimatedCefr = level;
    else break;
  }

  const totalCount = PLACEMENT_QUESTIONS.length;
  const estimatedReceptiveVocabulary = Math.round((correctCount / totalCount) * 5000);
  const estimatedProductiveVocabulary = Math.round(estimatedReceptiveVocabulary * 0.6);
  return { estimatedCefr, estimatedReceptiveVocabulary, estimatedProductiveVocabulary, correctCount, totalCount };
}

export interface RunPlacementResult { score: PlacementScore; }

export function runPlacementAssessment(db: DatabaseSync, input: RunPlacementInput): RunPlacementResult {
  const score = scorePlacement(input.answers);
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const lexemes = new SqliteLexemeRepository(db);
  const profiles = new SqliteLearnerProfileRepository(db);
  const encounterRepos = lexemeEncounterRepos(db);

  db.exec("BEGIN");
  try {
    for (const question of PLACEMENT_QUESTIONS) {
      lexemes.upsert({ id: question.lexemeId, language: "en", lemma: question.lemma, frequencyRank: question.frequencyRank, cefr: question.cefr, forms: [question.lemma], createdAt: nowIso, updatedAt: nowIso });
      const answer = input.answers.find((a) => a.questionId === question.id);
      const result: Encounter["result"] = answer === undefined ? "SKIPPED" : answer.selectedOptionIndex === question.correctOptionIndex ? "SUCCESS" : "FAIL";
      const encounter: Encounter = {
        id: createId(), learnerId: input.userId, itemType: "LEXEME", itemId: question.lexemeId,
        modality: "READING", activity: "PLACEMENT", result, assistanceUsed: false, createdAt: nowIso,
      };
      const value = learningValue({ frequencyRank: question.frequencyRank, contextualUsefulness: 0.5, interestRelevance: 0.5, upcomingRelevance: 0.5, memoryNeed: 0.5 });
      registerLexemeEncounterInTransaction(encounterRepos, encounter, value, now);
    }

    const existing = profiles.getByUserId(input.userId);
    if (existing) {
      profiles.upsert({
        ...existing,
        estimatedCefr: score.estimatedCefr,
        estimatedReceptiveVocabulary: score.estimatedReceptiveVocabulary,
        estimatedProductiveVocabulary: score.estimatedProductiveVocabulary,
        onboardingCompleted: true,
        updatedAt: nowIso,
      });
    }
    db.exec("COMMIT");
  } catch (cause) {
    db.exec("ROLLBACK");
    throw cause;
  }
  return { score };
}
