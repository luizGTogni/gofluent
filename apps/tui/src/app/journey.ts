import { planDailyJourney, startDailyJourneySession, type DailyJourneyPlan } from "@gofluent/application";
import type { LearningSession, SessionActivity } from "@gofluent/core";
import type { AppServices } from "./bootstrap.js";

/** Gathers the deterministic inputs `planDailyJourney` needs from persisted state (PRD §10.1). */
export function buildDailyJourneyPlan(services: AppServices): DailyJourneyPlan {
  const { repos, userId, config } = services;
  const profile = repos.profiles.getByUserId(userId);
  const dueReviewItems = repos.reviews.listDue(userId, new Date().toISOString(), 50);
  const candidateNewLexemes = repos.lexemes.listAll("en").filter((lexeme) => repos.lexemeStates.get(userId, lexeme.id) === null);
  const recentlySeenItemIds = repos.encounters.listRecent(userId, 50).map((e) => e.itemId);
  const interests = repos.interests.listByUser(userId);

  return planDailyJourney({
    dueReviewItems,
    candidateNewLexemes,
    recentlySeenItemIds,
    interests,
    dailyMinutes: profile?.dailyMinutes ?? config.learning.dailyMinutes,
    newItemBudget: config.learning.newItemsPerSession,
  });
}

export function startNewDailyJourneySession(services: AppServices): { session: LearningSession; activities: SessionActivity[] } {
  const plan = buildDailyJourneyPlan(services);
  const profile = services.repos.profiles.getByUserId(services.userId);
  return startDailyJourneySession(services.db, services.userId, plan, profile?.dailyMinutes ?? services.config.learning.dailyMinutes);
}
