import { describe, expect, it } from "vitest";
import { openDatabase, runMigrations } from "@gofluent/db";
import { completeOnboarding } from "./onboarding.js";
import { createLocalProfile, getActiveUserId, listLocalProfiles, setActiveUserId } from "./profile-activity.js";

const now = "2026-01-01T00:00:00.000Z";

function seededDb() {
  const db = openDatabase(":memory:");
  runMigrations(db);
  return db;
}

describe("getActiveUserId", () => {
  it("falls back to the given default when nothing is set", () => {
    const db = seededDb();
    expect(getActiveUserId(db, "local-user")).toBe("local-user");
  });

  it("returns the stored active profile once set", () => {
    const db = seededDb();
    db.prepare("INSERT INTO users (id,created_at,updated_at) VALUES (?,?,?)").run("u2", now, now);
    setActiveUserId(db, "u2", new Date(now));
    expect(getActiveUserId(db, "local-user")).toBe("u2");
  });

  it("falls back when the stored profile no longer exists", () => {
    const db = seededDb();
    setActiveUserId(db, "ghost-user", new Date(now));
    expect(getActiveUserId(db, "local-user")).toBe("local-user");
  });
});

describe("createLocalProfile", () => {
  it("creates a bare user row and switches the active profile to it, without a fake LearnerProfile", () => {
    const db = seededDb();
    const { userId } = createLocalProfile(db, new Date(now));

    expect(getActiveUserId(db, "fallback")).toBe(userId);
    const userRow = db.prepare("SELECT * FROM users WHERE id=?").get(userId);
    expect(userRow).toBeDefined();
    const profileRow = db.prepare("SELECT * FROM learner_profiles WHERE user_id=?").get(userId);
    expect(profileRow).toBeUndefined();
  });
});

describe("listLocalProfiles", () => {
  it("lists every local profile, pairing bare users with a null profile", () => {
    const db = seededDb();
    completeOnboarding(db, { userId: "u1", nativeLanguage: "Portuguese", targetLanguage: "en", dailyMinutes: 20, interests: ["travel"], now: new Date(now) });
    createLocalProfile(db, new Date("2026-01-02T00:00:00.000Z"));

    const profiles = listLocalProfiles(db);
    expect(profiles).toHaveLength(2);
    expect(profiles[0]?.userId).toBe("u1");
    expect(profiles[0]?.profile?.nativeLanguage).toBe("Portuguese");
    expect(profiles[1]?.profile).toBeNull();
  });
});
