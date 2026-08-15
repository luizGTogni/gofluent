import { buildImmersionFeed, type ImmersionFeedItem } from "@gofluent/content-engine";
import {
  SqliteLearnerInterestRepository, SqliteLearnerLexemeStateRepository, SqliteLexemeRepository,
  SqliteReviewRepository, SqliteWorldRepository, type DatabaseSync,
} from "@gofluent/db";

/**
 * Content recommendation engine (ROADMAP Phase 7, RESEARCH.md §30 "Immersion
 * Feed"). Gathers real lexical-state counts and hands them to the pure
 * `buildImmersionFeed` (content-engine) — this module is the only place that
 * touches the database.
 */
export function getImmersionFeed(db: DatabaseSync, learnerId: string, language: string, now: Date = new Date(), maxItems?: number): ImmersionFeedItem[] {
  const interests = new SqliteLearnerInterestRepository(db).listByUser(learnerId);
  const worldTopics = new SqliteWorldRepository(db).listAll(language).map((world) => world.name);
  const dueReviewCount = new SqliteReviewRepository(db).listDue(learnerId, now.toISOString(), 1000).length;

  const lexemes = new SqliteLexemeRepository(db);
  const lexemeStates = new SqliteLearnerLexemeStateRepository(db);
  const candidateNewLexemeCount = lexemes.listAll(language).filter((lexeme) => lexemeStates.get(learnerId, lexeme.id) === null).length;

  return buildImmersionFeed({ interests, worldTopics, dueReviewCount, candidateNewLexemeCount, ...(maxItems !== undefined ? { maxItems } : {}) });
}
