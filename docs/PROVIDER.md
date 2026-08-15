# PROVIDER.md — GoFluent Provider Architecture

> **Project:** GoFluent  
> **Status:** Initial technical specification  
> **Target:** v0.1.0  
> **Scope:** Model provider abstraction and provider integration contract  
> **Primary Provider:** NVIDIA NIM  
> **Language:** TypeScript  
> **Source adaptation:** Reuses architectural patterns from the GoCode Provider specification, adapted to GoFluent.

---

# 1. Purpose

This document defines the provider layer used by GoFluent.

A provider is an adapter between the GoFluent application/domain layers and an external or local AI inference service.

For v0.1.0:

```text
NVIDIA NIM
```

is the only required LLM implementation.

The architecture must allow future implementations such as:

```text
OpenAI
Anthropic
Google Gemini
OpenRouter
Ollama
self-hosted OpenAI-compatible endpoints
```

Provider-specific API details must not leak into:

```text
TUI
learning-engine
lexical-engine
content-engine
database
session planning
learner state
```

---

# 2. Core Principle

GoFluent reasons in terms of:

```text
normalized models
normalized capabilities
normalized generation requests
normalized generation events
normalized provider errors
```

It must not reason throughout the codebase in terms of:

```text
NVIDIA reasoning_effort
NVIDIA-specific request fields
provider-specific SSE chunks
vendor-specific tool schemas
vendor-specific error objects
```

Conceptually:

```text
GoFluent Core
    ↓
Provider Contract
    ↓
Provider Adapter
    ↓
External API
```

---

# 3. Why This Layer Matters

GoFluent is intended to be a learning system, not an NVIDIA API wrapper.

NVIDIA NIM is the first provider because it is the primary MVP platform.

It is not the architecture.

Provider APIs and available models will change over time.

The adapter layer absorbs those changes while preserving stable product behavior.

---

# 4. Goals

The provider layer should support:

- credential validation;
- model discovery;
- normalized model metadata;
- capability resolution;
- text generation;
- optional streaming;
- structured generation;
- reasoning configuration when supported;
- usage reporting;
- cancellation;
- provider-specific request mapping;
- provider-specific response parsing;
- normalized errors;
- future multiple providers.

---

# 5. Non-Goals for v0.1.0

The provider layer does not require:

- provider marketplaces;
- third-party plugin adapters;
- provider load balancing;
- automatic provider fallback;
- cost-based routing;
- provider arbitrage;
- model benchmarking infrastructure;
- user-written JavaScript provider plugins.

Keep the provider architecture small.

---

# 6. Package Layout

Recommended:

```text
packages/
├── ai/
│   └── src/
│       ├── provider/
│       │   ├── provider.ts
│       │   ├── registry.ts
│       │   ├── model.ts
│       │   ├── capabilities.ts
│       │   ├── request.ts
│       │   ├── response.ts
│       │   ├── stream.ts
│       │   ├── credentials.ts
│       │   └── errors.ts
│       │
│       ├── providers/
│       │   └── nvidia/
│       │
│       └── index.ts
```

A future split into separate packages is acceptable if complexity warrants it.

For v0.1.0, one `@gofluent/ai` package with clean internal boundaries is preferred.

---

# 7. Dependency Direction

The dependency direction must remain:

```text
@gofluent/core
      ↑
@gofluent/ai provider contracts
      ↑
NVIDIA adapter
```

The generic contracts must never depend on NVIDIA-specific types.

---

# 8. Provider ID

Provider IDs are stable machine-readable identifiers.

```ts
export type ProviderId = string;
```

Examples:

```text
nvidia
openai
anthropic
gemini
ollama
```

Do not use display names as persistent identifiers.

---

# 9. Provider Interface

Conceptual TypeScript contract:

```ts
export interface LLMProvider {
  readonly id: ProviderId;
  readonly displayName: string;

  validateCredentials(
    signal?: AbortSignal,
  ): Promise<CredentialStatus>;

  listModels(
    signal?: AbortSignal,
  ): Promise<Model[]>;

  generate<T>(
    request: GenerationRequest<T>,
    signal?: AbortSignal,
  ): Promise<GenerationResult<T>>;

  stream?(
    request: StreamingGenerationRequest,
    signal?: AbortSignal,
  ): AsyncIterable<GenerationStreamEvent>;
}
```

The exact signature may evolve during `0.x`.

Responsibilities should remain separated.

---

# 10. Credential Status

Normalized representation:

```ts
export type CredentialStatus =
  | { status: 'valid' }
  | { status: 'missing' }
  | { status: 'invalid'; reason?: string }
  | { status: 'unreachable'; reason?: string };
```

Important:

```text
network timeout
≠
invalid API key
```

Never delete or invalidate credentials merely because the network is unavailable.

---

# 11. Credential Resolution

Recommended priority:

```text
environment variable
        ↓
OS credential store when available
        ↓
interactive onboarding
```

The provider receives the resolved secret.

It should not need to know where the secret came from.

---

# 12. Secret Handling

Secrets must not be:

- committed to source control;
- written into normal config files;
- included in logs;
- exposed by `toString`;
- included in error serialization.

For NVIDIA:

```text
NVIDIA_API_KEY
```

is the preferred environment variable.

---

# 13. Provider Registry

Conceptual:

```ts
export class ProviderRegistry {
  private readonly providers = new Map<ProviderId, LLMProvider>();

  register(provider: LLMProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: ProviderId): LLMProvider | undefined {
    return this.providers.get(id);
  }
}
```

Responsibilities:

- register available providers;
- resolve by stable ID;
- provide metadata;
- support fake providers in tests.

The TUI never instantiates providers directly.

---

# 14. Provider Construction

Construct providers in the composition root.

```text
Config
+
CredentialResolver
+
HTTP client
      ↓
Provider Factory
      ↓
Provider Registry
```

Avoid a heavyweight dependency-injection framework.

---

# 15. Model Representation

Normalized:

```ts
export interface Model {
  id: string;
  provider: ProviderId;
  displayName: string;
  capabilities: ModelCapabilities;
  metadata: ModelMetadata;
}
```

Preserve the provider's canonical model ID where practical.

---

# 16. Model Metadata

```ts
export interface ModelMetadata {
  description?: string;
  contextWindow?: number;
  inputModalities?: Array<'text' | 'image' | 'audio'>;
  outputModalities?: Array<'text' | 'audio'>;
}
```

Do not fabricate metadata.

Unknown values should remain unknown.

---

# 17. Model Capabilities

GoFluent's needs differ from GoCode.

The normalized model capability shape should focus on language-learning workloads:

```ts
export interface ModelCapabilities {
  streaming: boolean;
  structuredOutput: StructuredOutputCapability;
  reasoning: ReasoningCapability;
  tools: ToolCapability;
  vision: boolean;
  contextWindow?: number;
  sampling: SamplingCapability;
}
```

Tool calling is retained as an optional capability for future workflows, but it is not a core v0.1.0 learning requirement.

---

# 18. Structured Output Capability

GoFluent relies heavily on validated structured output.

```ts
export type StructuredOutputCapability =
  | { type: 'unsupported' }
  | { type: 'json' }
  | { type: 'json-schema' };
```

Even if a provider supports structured generation, runtime validation remains mandatory.

Provider guarantees do not replace Zod/domain validation.

---

# 19. Reasoning Capability

Model reasoning controls vary.

Do not assume one global enum.

Conceptual:

```ts
export type ReasoningCapability =
  | { type: 'unsupported' }
  | { type: 'toggle'; defaultEnabled?: boolean }
  | {
      type: 'effort';
      levels: string[];
      defaultLevel?: string;
    }
  | {
      type: 'budget';
      minTokens?: number;
      maxTokens?: number;
      defaultTokens?: number;
    };
```

Use strings for effort levels because providers/models can expose different allowed values.

---

# 20. Reasoning Settings

```ts
export type ReasoningMode =
  | { type: 'auto' }
  | { type: 'off' }
  | { type: 'on' }
  | { type: 'effort'; level: string }
  | { type: 'budget'; tokens: number };
```

The provider adapter validates and maps the selected setting.

---

# 21. Sampling Capabilities

```ts
export interface SamplingCapability {
  temperature: boolean;
  topP: boolean;
  maxOutputTokens: boolean;
}
```

Do not send parameters solely because another provider supports them.

---

# 22. Model Discovery

Flow:

```text
Provider API
    ↓
raw models
    ↓
provider mapper
    ↓
normalized Model
    ↓
Model Registry
```

Model discovery and capability discovery are separate concepts.

A model-list endpoint may not expose all capabilities GoFluent needs.

---

# 23. Capability Resolution

Capability resolution may combine:

```text
dynamic API metadata
+
provider-maintained metadata
+
known model overrides
+
cache
```

This is expected.

Centralize special cases.

Do not scatter:

```ts
if (model.includes('nemotron')) { ... }
```

across the application.

---

# 24. Capability Provenance

Optional debugging metadata may record:

```ts
export type CapabilitySource =
  | 'api'
  | 'provider-metadata'
  | 'built-in'
  | 'cache';
```

This can help diagnose why a model is treated a certain way.

Not required in the public UI.

---

# 25. Generation Request

Normalized request:

```ts
export interface GenerationRequest<T> {
  model: string;
  messages: Message[];
  reasoning?: ReasoningMode;
  sampling?: SamplingSettings;
  output: OutputContract<T>;
}
```

---

# 26. Message Model

GoFluent should use normalized roles:

```ts
export type Message =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string };
```

Tool messages can be added when a learning workflow actually needs them.

---

# 27. Output Contract

```ts
export interface OutputContract<T> {
  schemaName: string;
  parse(value: unknown): T;
}
```

Zod adapter example:

```ts
const storySchema = z.object({
  title: z.string(),
  text: z.string(),
  targetItems: z.array(z.string()),
});
```

---

# 28. Generation Result

```ts
export interface GenerationResult<T> {
  value: T;
  usage?: Usage;
  requestId?: string;
  model: string;
  provider: ProviderId;
}
```

---

# 29. Usage

```ts
export interface Usage {
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
}
```

Keep fields optional.

Do not bake pricing assumptions into this type.

---

# 30. Streaming Events

Normalized event model:

```ts
export type GenerationStreamEvent =
  | { type: 'text-delta'; text: string }
  | { type: 'usage'; usage: Usage }
  | { type: 'finished'; reason: FinishReason };
```

Future:

```text
structured-delta
tool-call
audio
```

only when needed.

---

# 31. Finish Reason

```ts
export type FinishReason =
  | 'stop'
  | 'length'
  | 'cancelled'
  | 'content-filter'
  | 'tool-calls'
  | 'other';
```

Provider-specific finish reasons should be normalized.

---

# 32. Streaming Retry Rule

Do not blindly restart a request after meaningful streamed output has already been consumed.

It may duplicate content or side effects.

For MVP:

```text
fail clearly
```

rather than pretending continuation is safe.

---

# 33. Cancellation

Use the platform-standard:

```ts
AbortController
AbortSignal
```

Every remote provider operation should support cancellation where practical.

Cancellation should stop:

- HTTP requests;
- streaming parsing;
- retries;
- unnecessary downstream work.

---

# 34. Generic Provider Errors

```ts
export type ProviderErrorCode =
  | 'MISSING_CREDENTIAL'
  | 'INVALID_CREDENTIAL'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'MODEL_NOT_FOUND'
  | 'UNSUPPORTED_CAPABILITY'
  | 'INVALID_REQUEST'
  | 'INVALID_RESPONSE'
  | 'SERVER'
  | 'CANCELLED';
```

Provider adapters map external errors into these stable categories.

---

# 35. User-Facing Errors

The provider layer does not own final wording.

Flow:

```text
ProviderError
     ↓
Application Error
     ↓
TUI Error View
```

Example:

```text
Provider:
RATE_LIMITED

TUI:
NVIDIA is temporarily limiting requests.
Try again shortly.
```

---

# 36. Retry Policy

Retries must be limited and explicit.

Possible baseline:

```text
connection failure → limited retry
timeout            → limited retry
429                → use retry hint when reasonable
5xx                → limited retry
401/403            → no blind retry
invalid request    → no blind retry
```

Never retry indefinitely.

---

# 37. HTTP Client

Node's standard `fetch`/Undici stack is preferred unless a concrete requirement justifies another HTTP library.

Configure:

- timeout through AbortSignal;
- user agent where supported;
- redacted logging;
- shared request helpers;
- proxy behavior deliberately.

Do not wrap every request in a new heavyweight client abstraction.

---

# 38. User Agent

Recommended:

```text
gofluent/<version>
```

This can help external provider diagnostics.

---

# 39. Provider Cache

Provider/model metadata may be cached under the GoFluent cache directory.

Possible contents:

- model list;
- capability metadata;
- last successful refresh.

Cache is an optimization.

It is not authority.

---

# 40. Model Refresh

Preferred:

```text
load cache
    ↓
start TUI
    ↓
refresh models asynchronously
    ↓
merge current metadata
    ↓
notify settings/model UI
```

Do not block startup unnecessarily.

---

# 41. Missing Saved Model

If a configured model disappears:

```text
saved model
    ↓
not found
    ↓
mark unavailable
    ↓
select fallback/recommended model or ask user
```

Do not crash application startup.

---

# 42. Capability-Driven UI

The TUI queries normalized capabilities.

Examples:

```text
structured output unsupported
→ do not use model for core story-generation workflow
```

```text
reasoning unsupported
→ hide reasoning configuration
```

```text
streaming unsupported
→ use non-streaming generation
```

The TUI should not contain:

```ts
if (provider === 'nvidia') { ... }
```

for capability behavior.

---

# 43. GoFluent Model Suitability

For core MVP generation, model suitability should consider:

```text
text generation required
structured output strongly preferred
reliable instruction following required
reasonable context window
streaming useful
reasoning optional
```

Tool calling is not mandatory for GoFluent v0.1.0.

Avoid a complex automatic ranking engine initially.

---

# 44. Fake Provider

Implement a deterministic fake provider.

It should support:

- fixed model list;
- predictable structured outputs;
- configurable delays;
- injected errors;
- cancellation tests.

Most learning-engine integration tests should not require a live NVIDIA endpoint.

---

# 45. Provider Contract Tests

Reusable contract tests should verify:

```text
list models
structured generation
stream text when supported
cancellation
normalized errors
invalid output handling
```

Provider adapters should pass the same high-level contract.

---

# 46. Observability

Useful structured fields:

```text
provider
model
requestId
durationMs
status
inputTokens
outputTokens
reasoningTokens
```

Never include:

- API keys;
- authorization headers;
- raw credentials.

Raw prompts and learner content should not be logged by default.

---

# 47. Privacy

Provider requests should contain the minimum learner data necessary for the current task.

Do not send the entire learner database.

Prefer:

```text
target vocabulary
review vocabulary
short learner summary
level estimate
interests relevant to current content
pedagogical constraints
```

---

# 48. MVP Definition of Done

Provider architecture is ready for GoFluent v0.1.0 when:

- [ ] NVIDIA implements the generic provider contract.
- [ ] TUI contains no NVIDIA-specific request logic.
- [ ] learning-engine contains no NVIDIA-specific request logic.
- [ ] models are normalized.
- [ ] model capabilities are normalized.
- [ ] structured generation is validated.
- [ ] cancellation works.
- [ ] credential errors are distinguishable from network failures.
- [ ] retries are bounded.
- [ ] provider errors map into stable generic errors.
- [ ] FakeProvider can run core integration tests.
- [ ] model metadata can refresh without blocking startup.

---

# 49. Final Rule

Provider APIs will change.

Model capabilities will vary.

GoFluent should absorb that complexity inside provider adapters.

> **The GoFluent core should understand what a model can do, not how a specific vendor exposes that capability over HTTP.**
