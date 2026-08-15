import { describe, expect, it } from "vitest";
import { initialNavigationState, navigationReducer } from "./state.js";

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
});
