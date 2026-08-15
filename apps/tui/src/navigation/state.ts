/**
 * In-memory navigation state machine (ARCHITECTURE.md §21).
 * SPLASH → ONBOARDING → PLACEMENT → HOME, with HOME branching into
 * sub-screens added in later phases (Journey, Review, Story, Progress, Settings).
 */
export type Route = "SPLASH" | "ONBOARDING" | "PLACEMENT" | "HOME";

export interface NavigationState {
  route: Route;
}

export type NavigationAction =
  | { type: "SPLASH_DONE" }
  | { type: "ONBOARDING_DONE" }
  | { type: "PLACEMENT_DONE" };

export const initialNavigationState: NavigationState = { route: "SPLASH" };

export function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
  switch (action.type) {
    case "SPLASH_DONE":
      return { route: "ONBOARDING" };
    case "ONBOARDING_DONE":
      return { route: "PLACEMENT" };
    case "PLACEMENT_DONE":
      return { route: "HOME" };
    default:
      return state;
  }
}
