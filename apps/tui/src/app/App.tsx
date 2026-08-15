import React, { useReducer } from "react";
import { initialNavigationState, navigationReducer } from "../navigation/state.js";
import { SplashScreen } from "../screens/SplashScreen.js";
import { OnboardingScreen } from "../screens/OnboardingScreen.js";
import { PlacementScreen } from "../screens/PlacementScreen.js";
import { HomeScreen } from "../screens/HomeScreen.js";

export function App(): React.JSX.Element {
  const [state, dispatch] = useReducer(navigationReducer, initialNavigationState);

  switch (state.route) {
    case "SPLASH":
      return <SplashScreen onDone={() => dispatch({ type: "SPLASH_DONE" })} />;
    case "ONBOARDING":
      return <OnboardingScreen onDone={() => dispatch({ type: "ONBOARDING_DONE" })} />;
    case "PLACEMENT":
      return <PlacementScreen onDone={() => dispatch({ type: "PLACEMENT_DONE" })} />;
    case "HOME":
      return <HomeScreen />;
  }
}
