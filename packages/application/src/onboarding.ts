import type { LearnerInterest, LearnerProfile } from "@gofluent/core";
import { createId } from "@gofluent/shared";
import { SqliteLearnerInterestRepository, SqliteLearnerProfileRepository, type DatabaseSync } from "@gofluent/db";

/** PRD §9.1-9.5 onboarding: native language, goals (daily minutes), interests. */
export interface CompleteOnboardingInput {
  userId: string;
  nativeLanguage: string;
  targetLanguage: string;
  dailyMinutes: number;
  interests: string[];
  now?: Date;
}
export interface CompleteOnboardingResult { profile: LearnerProfile; interests: LearnerInterest[]; }

export function completeOnboarding(db: DatabaseSync, input: CompleteOnboardingInput): CompleteOnboardingResult {
  const now = (input.now ?? new Date()).toISOString();
  const profiles = new SqliteLearnerProfileRepository(db);
  const interestsRepo = new SqliteLearnerInterestRepository(db);
  let result: CompleteOnboardingResult | undefined;
  db.exec("BEGIN");
  try {
    db.prepare("INSERT OR IGNORE INTO users (id,created_at,updated_at) VALUES (?,?,?)").run(input.userId, now, now);
    const existing = profiles.getByUserId(input.userId);
    const profile: LearnerProfile = {
      id: existing?.id ?? createId(),
      userId: input.userId,
      nativeLanguage: input.nativeLanguage,
      targetLanguage: input.targetLanguage,
      estimatedCefr: existing?.estimatedCefr,
      estimatedReceptiveVocabulary: existing?.estimatedReceptiveVocabulary,
      estimatedProductiveVocabulary: existing?.estimatedProductiveVocabulary,
      dailyMinutes: input.dailyMinutes,
      onboardingCompleted: false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    profiles.upsert(profile);
    const interests: LearnerInterest[] = input.interests
      .map((interest) => interest.trim())
      .filter((interest) => interest.length > 0)
      .map((interest, index) => ({ id: createId(), userId: input.userId, interest, weight: 1 - index * 0.05, createdAt: now }));
    interestsRepo.replaceAll(input.userId, interests);
    db.exec("COMMIT");
    result = { profile, interests };
  } catch (cause) {
    db.exec("ROLLBACK");
    throw cause;
  }
  return result;
}
