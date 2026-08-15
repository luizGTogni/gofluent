import { describe, expect, it } from "vitest";
import { loadConfig } from "./load.js";
import { ConfigurationError } from "@gofluent/core";

describe("loadConfig", () => {
  it("applies defaults when no env vars are set", () => {
    const config = loadConfig({ env: { GOFLUENT_DATA_DIR: "/tmp/gofluent-test" } });

    expect(config.ai.provider).toBe("nvidia");
    expect(config.ai.baseUrl).toBe("https://integrate.api.nvidia.com");
    expect(config.speech.enabled).toBe(false);
    expect(config.learning.dailyMinutes).toBe(20);
    expect(config.learning.newItemsPerSession).toBe(8);
    expect(config.dataDir).toBe("/tmp/gofluent-test");
  });

  it("env vars override defaults", () => {
    const config = loadConfig({
      env: {
        GOFLUENT_DATA_DIR: "/tmp/gofluent-test",
        NVIDIA_API_KEY: "secret-key",
        NVIDIA_NIM_MODEL: "some-model",
        GOFLUENT_DAILY_MINUTES: "45",
      },
    });

    expect(config.ai.apiKey).toBe("secret-key");
    expect(config.ai.model).toBe("some-model");
    expect(config.learning.dailyMinutes).toBe(45);
  });

  it("throws ConfigurationError on invalid values", () => {
    expect(() =>
      loadConfig({
        env: { GOFLUENT_DATA_DIR: "/tmp/gofluent-test", NVIDIA_NIM_BASE_URL: "not-a-url" },
      }),
    ).toThrow(ConfigurationError);
  });

  it("does not require an API key (missing credential is a valid state)", () => {
    const config = loadConfig({ env: { GOFLUENT_DATA_DIR: "/tmp/gofluent-test" } });
    expect(config.ai.apiKey).toBeUndefined();
  });
});
