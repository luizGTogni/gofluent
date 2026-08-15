import type { LLMProvider } from "@gofluent/ai";
import { analyzeImportedText, generateImportedLesson, type VocabularyCandidate } from "@gofluent/content-engine";
import type { Content, ContentTargetItem, ImportedContent } from "@gofluent/core";
import { createId } from "@gofluent/shared";
import {
  SqliteContentRepository, SqliteImportedContentRepository, SqliteLearnerLexemeStateRepository, SqliteLexemeRepository,
  type DatabaseSync,
} from "@gofluent/db";
import { lexemeEncounterRepos, registerLexemeEncounterInTransaction } from "./register-encounter.js";

/**
 * "Learn From Anything" orchestration (ROADMAP Phase 5, ARCHITECTURE.md
 * §93): user content → parse/lexical analysis → difficulty estimate →
 * high-value vocabulary extraction (deterministic, `@gofluent/content-engine`
 * `analyzeImportedText`) → lesson generation (the only generative edge,
 * `generateImportedLesson`) → review integration. Vocabulary mined here that
 * isn't already in the lexical dataset becomes new `Lexeme` rows, reusing
 * the same mastery/scheduler pipeline every other activity uses — no
 * parallel learning system (ARCHITECTURE.md §93).
 */
const DEFAULT_MAX_NEW_VOCABULARY = 8;

export interface ImportContentInput {
  learnerId: string;
  language: string;
  title?: string | undefined;
  rawText: string;
  maxNewVocabulary?: number;
  now?: Date;
}

export interface ImportContentResult {
  importedContent: ImportedContent;
  content: Content;
  candidates: VocabularyCandidate[];
}

export async function importContent(
  db: DatabaseSync,
  provider: LLMProvider,
  model: string,
  input: ImportContentInput,
): Promise<ImportContentResult> {
  const lexemes = new SqliteLexemeRepository(db);
  const lexemeStates = new SqliteLearnerLexemeStateRepository(db);
  const allLexemes = lexemes.listAll(input.language);
  const knownLemmas = allLexemes
    .filter((lexeme) => lexemeStates.get(input.learnerId, lexeme.id) !== null)
    .map((lexeme) => lexeme.lemma);
  const existingLexemes = new Map(allLexemes.map((lexeme) => [lexeme.lemma.toLowerCase(), { id: lexeme.id, frequencyRank: lexeme.frequencyRank }]));

  const analysis = analyzeImportedText({
    text: input.rawText,
    knownLemmas,
    existingLexemes,
    maxCandidates: input.maxNewVocabulary ?? DEFAULT_MAX_NEW_VOCABULARY,
  });

  const generated = await generateImportedLesson(provider, model, {
    language: input.language,
    sourceText: input.rawText,
    targetLemmas: analysis.candidates.map((c) => c.lemma),
  });

  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const contentId = createId();

  db.exec("BEGIN");
  try {
    const encounterRepos = lexemeEncounterRepos(db);
    const targetItems: ContentTargetItem[] = [];

    for (const candidate of analysis.candidates) {
      const lexemeId = candidate.existingLexemeId ?? createId();
      if (!candidate.existingLexemeId) {
        lexemes.upsert({ id: lexemeId, language: input.language, lemma: candidate.lemma, forms: [candidate.lemma], createdAt: nowIso, updatedAt: nowIso });
      }
      targetItems.push({ id: createId(), contentId, itemType: "LEXEME", itemId: lexemeId, role: "NEW" });
      registerLexemeEncounterInTransaction(
        encounterRepos,
        {
          id: createId(), learnerId: input.learnerId, itemType: "LEXEME", itemId: lexemeId,
          modality: "READING", activity: "IMPORTED_CONTENT", result: "SUCCESS", assistanceUsed: false,
          contentId, createdAt: nowIso,
        },
        candidate.learningValue,
        now,
      );
    }

    const content: Content = {
      id: contentId, learnerId: input.learnerId, contentType: "IMPORTED_TEXT",
      title: input.title, bodyText: input.rawText, language: input.language, topic: undefined,
      estimatedDifficulty: analysis.estimatedDifficulty, knownRatio: analysis.coverage.knownRatio, reviewRatio: 0, unknownRatio: analysis.coverage.unknownRatio,
      sourceType: "IMPORTED", sourceReference: undefined,
      provider: provider.id, model, promptVersion: generated.promptVersion, status: "VALID",
      metadata: { comprehensionQuestions: generated.lesson.comprehensionQuestions, vocabularyNotes: generated.lesson.vocabularyNotes, attempts: generated.attempts },
      createdAt: nowIso, updatedAt: nowIso,
    };
    const contents = new SqliteContentRepository(db);
    contents.upsert(content);
    contents.replaceTargetItems(contentId, targetItems);

    const importedContent: ImportedContent = {
      id: createId(), learnerId: input.learnerId, contentId, title: input.title, rawText: input.rawText, language: input.language,
      estimatedDifficulty: analysis.estimatedDifficulty, knownRatio: analysis.coverage.knownRatio, unknownRatio: analysis.coverage.unknownRatio,
      metadata: { tokenCount: analysis.tokenCount, candidateCount: analysis.candidates.length },
      createdAt: nowIso, updatedAt: nowIso,
    };
    new SqliteImportedContentRepository(db).upsert(importedContent);

    db.exec("COMMIT");
    return { importedContent, content, candidates: analysis.candidates };
  } catch (cause) {
    db.exec("ROLLBACK");
    throw cause;
  }
}
