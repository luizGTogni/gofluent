import { describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { UpdateAvailableScreen } from "./UpdateAvailableScreen.js";
import type { UpdateInfo } from "@gofluent/updater";

const updateInfo: UpdateInfo = { currentVersion: "0.1.0", latestVersion: "0.2.0", tag: "v0.2.0", releaseNotes: "New Speak Mode!" };

describe("UpdateAvailableScreen", () => {
  it("shows current/latest version and an install instruction", async () => {
    const { lastFrame, unmount } = render(<UpdateAvailableScreen updateInfo={updateInfo} onNotNow={() => {}} />);

    await vi.waitFor(() => expect(lastFrame()).toContain("GoFluent 0.2.0 is available"), { timeout: 2000 });
    expect(lastFrame()).toContain("You're using 0.1.0.");
    expect(lastFrame()).toContain("New Speak Mode!");
    expect(lastFrame()).toMatch(/install --global|add -g/);

    unmount();
  });

  it("calls onNotNow on Enter, never forcing installation", async () => {
    const onNotNow = vi.fn();
    const { lastFrame, stdin, unmount } = render(<UpdateAvailableScreen updateInfo={updateInfo} onNotNow={onNotNow} />);
    await vi.waitFor(() => expect(lastFrame()).toContain("GoFluent 0.2.0"), { timeout: 2000 });

    // Throwaway keystroke first absorbs the same-tick useInput resubscription race (see SpeakScreen.test.tsx).
    stdin.write(" ");
    await new Promise((resolve) => setTimeout(resolve, 20));
    stdin.write("\r");
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(onNotNow).toHaveBeenCalled();
    unmount();
  });
});
