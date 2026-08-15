import type { LLMProvider } from "../../provider/provider.js";
import type { CredentialStatus } from "../../provider/credentials.js";
import type { Model } from "../../provider/model.js";
import type { GenerationRequest } from "../../provider/request.js";
import type { GenerationResult } from "../../provider/response.js";
import { ProviderError } from "../../provider/errors.js";

export interface FakeProviderOptions {
  /** Queues of raw (unvalidated) responses, keyed by `output.schemaName`. */
  responses?: Record<string, unknown[]>;
  credentialStatus?: CredentialStatus;
  models?: Model[];
}

/**
 * PROVIDER.md §13 "support fake providers in tests" — a deterministic
 * `LLMProvider` with no network access, so `learning-engine`/`content-engine`
 * can be developed and tested against the generic contract before the
 * NVIDIA adapter exists (ROADMAP "Immediate next steps" §4).
 */
export class FakeProvider implements LLMProvider {
  readonly id = "fake";
  readonly displayName = "Fake Provider (deterministic, for tests)";

  private readonly queues: Map<string, unknown[]>;
  private readonly credentialStatus: CredentialStatus;
  private readonly models: Model[];

  constructor(options: FakeProviderOptions = {}) {
    this.queues = new Map(Object.entries(options.responses ?? {}).map(([key, value]) => [key, [...value]]));
    this.credentialStatus = options.credentialStatus ?? { status: "valid" };
    this.models = options.models ?? [];
  }

  /** Add another canned response for a given output schema, in FIFO order. */
  enqueue(schemaName: string, rawResponse: unknown): void {
    const queue = this.queues.get(schemaName) ?? [];
    queue.push(rawResponse);
    this.queues.set(schemaName, queue);
  }

  async validateCredentials(): Promise<CredentialStatus> {
    return this.credentialStatus;
  }

  async listModels(): Promise<Model[]> {
    return this.models;
  }

  async generate<T>(request: GenerationRequest<T>): Promise<GenerationResult<T>> {
    const queue = this.queues.get(request.output.schemaName);
    if (!queue || queue.length === 0) {
      throw new ProviderError(
        "INVALID_REQUEST",
        this.id,
        `No fake response queued for schema "${request.output.schemaName}"`,
      );
    }

    const raw = queue.shift();
    const value = request.output.parse(raw);

    return {
      value,
      model: request.model,
      provider: this.id,
    };
  }
}
