import { describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { FakeProvider } from "@gofluent/ai";
import { BossChallengeScreen } from "./BossChallengeScreen.js";
import { createInMemoryServices, LOCAL_USER_ID } from "../app/bootstrap.js";

async function tick(ms = 20): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function type(stdin: { write: (input: string) => void }, text: string): Promise<void> {
  stdin.write(" ");
  await tick(20);
  for (const char of text) {
    stdin.write(char);
    await tick(5);
  }
}

function bossChallengeAndWorld(services: ReturnType<typeof createInMemoryServices>) {
  const world = services.repos.worlds.getByKey("en", "travel")!;
  const bossChallenge = services.repos.bossChallenges.listByWorld(world.id)[0]!;
  return { world, bossChallenge };
}

describe("BossChallengeScreen", () => {
  it("requires a minimum number of exchanges before allowing /end, then evaluates the attempt", async () => {
    const services = createInMemoryServices();
    const { world, bossChallenge } = bossChallengeAndWorld(services);
    const provider = services.provider as FakeProvider;

    for (let i = 0; i < 2; i += 1) {
      provider.enqueue("conversation_turn", {
        tutorReply: `Tutor reply ${i + 1}`,
        feedback: { good: [], corrections: [] },
        detectedErrors: [],
        usedLemmas: [],
      });
    }
    provider.enqueue("boss_challenge_evaluation", {
      taskCompletion: 0.9, comprehension: 0.85, targetPhraseUsage: 0.8, abilityToContinue: 0.9,
      result: "SUCCESS", feedback: "Great work at the check-in desk!",
    });

    const { lastFrame, stdin, unmount } = render(
      <BossChallengeScreen services={services} world={world} bossChallenge={bossChallenge} onDone={() => {}} onError={() => {}} />,
    );
    await vi.waitFor(() => expect(lastFrame()).toContain("Boss Challenge — Airport Check-In"), { timeout: 2000 });

    // First exchange.
    await type(stdin, "Here is my passport.");
    stdin.write("\r");
    await vi.waitFor(() => expect(lastFrame()).toContain("Tutor reply 1"), { timeout: 2000 });

    // Too early: /end shouldn't be accepted yet (still under MIN_TURNS_BEFORE_END).
    await type(stdin, "/end");
    stdin.write("\r");
    await tick();
    expect(lastFrame()).not.toContain("Evaluating");

    // Clear the stray "/end" text and send a second real exchange.
    for (let i = 0; i < 5; i += 1) { stdin.write("\x7F"); await tick(5); }
    await type(stdin, "One window seat please.");
    stdin.write("\r");
    await vi.waitFor(() => expect(lastFrame()).toContain("Tutor reply 2"), { timeout: 2000 });

    await type(stdin, "/end");
    stdin.write("\r");

    await vi.waitFor(() => expect(lastFrame()).toContain("Boss Challenge result"), { timeout: 2000 });
    expect(lastFrame()).toContain("Outcome: SUCCESS");
    expect(lastFrame()).toContain("Great work at the check-in desk!");

    const attemptRow = services.db.prepare("SELECT * FROM boss_challenge_attempts WHERE learner_id=?").get(LOCAL_USER_ID) as Record<string, unknown>;
    expect(attemptRow.result).toBe("SUCCESS");
    const progressRow = services.db.prepare("SELECT * FROM world_progress WHERE learner_id=? AND world_id=?").get(LOCAL_USER_ID, world.id) as Record<string, unknown>;
    expect(progressRow.boss_challenge_completed).toBe(1);

    unmount();
  });
});
