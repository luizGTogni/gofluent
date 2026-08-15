/**
 * In-memory navigation state machine (ARCHITECTURE.md §21).
 * SPLASH → ONBOARDING → PLACEMENT → HOME, with HOME branching into
 * Journey/Story/Review/Vocabulary Detail/Progress/Settings (PRD §64), plus a
 * dedicated ERROR route for unrecoverable failures (PRD §36).
 */
export type Route =
  | "SPLASH"
  | "ONBOARDING"
  | "PLACEMENT"
  | "HOME"
  | "JOURNEY"
  | "STORY"
  | "REVIEW"
  | "SPEAK"
  | "VOCAB_DETAIL"
  | "PROGRESS"
  | "SETTINGS"
  | "ERROR";

export interface NavigationState {
  route: Route;
  errorMessage?: string | undefined;
}

export type NavigationAction =
  | { type: "SPLASH_DONE" }
  | { type: "ONBOARDING_DONE" }
  | { type: "PLACEMENT_DONE" }
  | { type: "NAVIGATE"; route: Exclude<Route, "SPLASH" | "ONBOARDING" | "PLACEMENT" | "ERROR"> }
  | { type: "GO_HOME" }
  | { type: "ERROR_OCCURRED"; message: string };

export const initialNavigationState: NavigationState = { route: "SPLASH" };

export function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
  switch (action.type) {
    case "SPLASH_DONE":
      return { route: "ONBOARDING" };
    case "ONBOARDING_DONE":
      return { route: "PLACEMENT" };
    case "PLACEMENT_DONE":
      return { route: "HOME" };
    case "NAVIGATE":
      return { route: action.route };
    case "GO_HOME":
      return { route: "HOME" };
    case "ERROR_OCCURRED":
      return { route: "ERROR", errorMessage: action.message };
    default:
      return state;
  }
}
