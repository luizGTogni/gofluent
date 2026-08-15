import { describe, expect, it } from "vitest";
import { initialNavigationState, navigationReducer, type NavigationState } from "./state.js";

describe("navigationReducer", () => {
  it("walks SPLASH → ONBOARDING → PLACEMENT → HOME", () => {
    let state = initialNavigationState;
    expect(state.route).toBe("SPLASH");

    state = navigationReducer(state, { type: "SPLASH_DONE" });
    expect(state.route).toBe("ONBOARDING");

    state = navigationReducer(state, { type: "ONBOARDING_DONE" });
    expect(state.route).toBe("PLACEMENT");

    state = navigationReducer(state, { type: "PLACEMENT_DONE" });
    expect(state.route).toBe("HOME");
  });

  it("navigates from HOME into Journey/Story/Review/Progress/Settings and back", () => {
    let state: NavigationState = { route: "HOME" };
    state = navigationReducer(state, { type: "NAVIGATE", route: "JOURNEY" });
    expect(state.route).toBe("JOURNEY");

    state = navigationReducer(state, { type: "NAVIGATE", route: "STORY" });
    expect(state.route).toBe("STORY");

    state = navigationReducer(state, { type: "NAVIGATE", route: "REVIEW" });
    expect(state.route).toBe("REVIEW");

    state = navigationReducer(state, { type: "NAVIGATE", route: "PROGRESS" });
    expect(state.route).toBe("PROGRESS");

    state = navigationReducer(state, { type: "NAVIGATE", route: "SETTINGS" });
    expect(state.route).toBe("SETTINGS");

    state = navigationReducer(state, { type: "GO_HOME" });
    expect(state.route).toBe("HOME");
  });

  it("moves to ERROR with a message and clears it via GO_HOME", () => {
    let state: NavigationState = { route: "HOME" };
    state = navigationReducer(state, { type: "ERROR_OCCURRED", message: "boom" });
    expect(state.route).toBe("ERROR");
    expect(state.errorMessage).toBe("boom");

    state = navigationReducer(state, { type: "GO_HOME" });
    expect(state.route).toBe("HOME");
  });
});
