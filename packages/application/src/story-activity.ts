import type { LLMProvider } from "@gofluent/ai";
import { generateStory, type StoryGenerationRequest } from "@gofluent/content-engine";
import type { CefrLevel, Content, ContentTargetItem, SessionActivity } from "@gofluent/core";
import { createId } from "@gofluent/shared";
import { SqliteContentRepository, SqliteSessionActivityRepository, type DatabaseSync } from "@gofluent/db";

/** PRD §18/19 — generate an adaptive story and persist it as session content. */
export interface TargetLexeme { id: string; lemma: string; role: "NEW" | "REVIEW"; }

export interface GenerateStoryActivityInput {
  learnerId: string;
  activity: SessionActivity;
  language: string;
  topic: string;
  cefr: CefrLevel;
  knownLemmas: string[];
  targetLexemes: TargetLexeme[];
  now?: Date;
}
export interface GenerateStoryActivityResult { content: Content; activity: SessionActivity; }

export async function generateStoryActivity(
  db: DatabaseSync,
  provider: LLMProvider,
  model: string,
  input: GenerateStoryActivityInput,
): Promise<GenerateStoryActivityResult> {
  const request: StoryGenerationRequest = {
    language: input.language,
    topic: input.topic,
    cefr: input.cefr,
    knownLemmas: input.knownLemmas,
    newTargetLemmas: input.targetLexemes.filter((t) => t.role === "NEW").map((t) => t.lemma),
    reviewTargetLemmas: input.targetLexemes.filter((t) => t.role === "REVIEW").map((t) => t.lemma),
  };
  const generated = await generateStory(provider, model, request);
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();

  const content: Content = {
    id: createId(), learnerId: input.learnerId, contentType: "STORY",
    title: generated.story.title, bodyText: generated.story.text,
    language: input.language, topic: input.topic,
    estimatedDifficulty: undefined,
    knownRatio: generated.coverage.knownRatio, reviewRatio: generated.coverage.reviewRatio, unknownRatio: generated.coverage.unknownRatio,
    sourceType: "AI_GENERATED", sourceReference: undefined,
    provider: provider.id, model, promptVersion: generated.promptVersion, status: "VALID",
    metadata: { comprehensionQuestions: generated.story.comprehensionQuestions, targetItems: generated.story.targetItems, attempts: generated.attempts },
    createdAt: nowIso, updatedAt: nowIso,
  };
  const targetItems: ContentTargetItem[] = input.targetLexemes.map((t) => ({ id: createId(), contentId: content.id, itemType: "LEXEME", itemId: t.id, role: t.role }));
  const activity: SessionActivity = { ...input.activity, contentId: content.id, status: "PLANNED", updatedAt: nowIso };

  db.exec("BEGIN");
  try {
    const contents = new SqliteContentRepository(db);
    const activities = new SqliteSessionActivityRepository(db);
    contents.upsert(content);
    contents.replaceTargetItems(content.id, targetItems);
    activities.upsert(activity);
    db.exec("COMMIT");
  } catch (cause) {
    db.exec("ROLLBACK");
    throw cause;
  }
  return { content, activity };
}
