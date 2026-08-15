import { describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { ProfilesScreen } from "./ProfilesScreen.js";
import { createInMemoryServices, LOCAL_USER_ID } from "../app/bootstrap.js";

async function tick(ms = 20): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe("ProfilesScreen", () => {
  it("shows the active profile and creates a new one, switching to it", async () => {
    const services = createInMemoryServices();
    const { lastFrame, stdin, unmount } = render(<ProfilesScreen services={services} onBack={() => {}} />);

    await vi.waitFor(() => expect(lastFrame()).toContain("Profiles"), { timeout: 2000 });
    expect(lastFrame()).toContain(LOCAL_USER_ID);
    expect(lastFrame()).toContain("+ New profile");

    // Move selection down to "+ New profile" (only one existing profile row above it).
    stdin.write("j"); // throwaway keystroke absorbs the resubscription race (see SpeakScreen.test.tsx)
    await tick(20);
    stdin.write("\x1B[B");
    await tick(20);
    stdin.write("\r");

    await vi.waitFor(() => expect(lastFrame()).toContain("Created a new profile"), { timeout: 2000 });

    const activeSetting = services.db.prepare("SELECT value_json FROM settings WHERE key='active_user_id'").get() as { value_json: string } | undefined;
    expect(activeSetting?.value_json).not.toBe(JSON.stringify(LOCAL_USER_ID));

    const userCount = (services.db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number }).count;
    expect(userCount).toBe(2);

    unmount();
  });

  it("calls onBack when Esc is pressed on the list", async () => {
    const services = createInMemoryServices();
    const onBack = vi.fn();
    const { lastFrame, stdin, unmount } = render(<ProfilesScreen services={services} onBack={onBack} />);
    await vi.waitFor(() => expect(lastFrame()).toContain("Profiles"), { timeout: 2000 });

    stdin.write("j");
    await tick(20);
    stdin.write("\x1B");
    await tick(20);

    expect(onBack).toHaveBeenCalled();
    unmount();
  });
});
