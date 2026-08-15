# NVIDIA_NIM.md — GoFluent NVIDIA NIM Provider

> **Project:** GoFluent  
> **Status:** Initial technical specification  
> **Target:** v0.1.0  
> **Provider ID:** `nvidia`  
> **Scope:** NVIDIA NIM LLM integration and NVIDIA Speech NIM boundaries  
> **Language:** TypeScript  
> **Verified against current NVIDIA documentation:** August 2026  
> **Source adaptation:** Reuses architectural patterns from the GoCode NVIDIA NIM provider document, adapted to GoFluent.

---

# 1. Purpose

This document defines NVIDIA NIM integration for GoFluent.

NVIDIA NIM is the primary AI platform for developing and validating GoFluent v0.1.0.

The implementation should support:

- NVIDIA API key authentication for hosted inference;
- configurable endpoint for future self-hosted NIM;
- model discovery;
- OpenAI-compatible text generation;
- streaming when useful;
- structured generation;
- normalized capabilities;
- normalized errors;
- cancellation;
- separate ASR and TTS provider adapters.

NVIDIA-specific behavior must remain inside provider adapters.

---

# 2. Current NVIDIA API Surface

Current NVIDIA NIM for LLMs exposes an OpenAI-compatible inference API.

Important endpoints currently include:

```text
POST /v1/chat/completions
POST /v1/responses
GET  /v1/models
```

`/v1/chat/completions` supports multi-turn chat and supports streaming and tool calling at the API level.

GoFluent v0.1.0 may use either an appropriate OpenAI-compatible surface supported by the selected deployment, but provider logic must remain centralized.

Do not expose endpoint choices to learning-engine code.

Official reference:

https://docs.nvidia.com/nim/large-language-models/latest/api-reference.html

---

# 3. Preferred MVP Integration

For the first implementation, prefer:

```text
/v1/chat/completions
```

when it provides the selected model features required by GoFluent.

Reasons:

- mature OpenAI-compatible shape;
- multi-turn messages;
- streaming;
- broad SDK/client compatibility;
- straightforward normalization.

The provider architecture must remain capable of adopting `/v1/responses` later without rewriting the learning domain.

---

# 4. Hosted Base URL

The NVIDIA hosted API catalog has historically used:

```text
https://integrate.api.nvidia.com
```

Do not hardcode the hosted URL throughout the application.

Keep it inside NVIDIA configuration.

Conceptual config:

```text
NVIDIA_NIM_BASE_URL
```

Default may point to NVIDIA hosted inference.

Future self-hosted deployments may use:

```text
http://localhost:8000
```

or another configured endpoint.

---

# 5. Authentication

Hosted NVIDIA inference uses bearer-token authentication.

Conceptually:

```http
Authorization: Bearer <NVIDIA_API_KEY>
```

User-facing environment variable:

```text
NVIDIA_API_KEY
```

Never log the authorization header.

---

# 6. Credential Storage

Do not write the API key into normal GoFluent configuration.

Preferred resolution:

```text
NVIDIA_API_KEY
      ↓
OS credential store if implemented
      ↓
interactive onboarding
```

The first MVP may support environment-variable credentials first if secure keychain support would add unstable native dependencies.

---

# 7. NVIDIA Provider Layout

Recommended:

```text
packages/ai/src/providers/nvidia/
├── client.ts
├── auth.ts
├── models.ts
├── capabilities.ts
├── chat.ts
├── request.ts
├── streaming.ts
├── reasoning.ts
├── structured-output.ts
├── errors.ts
└── index.ts
```

Avoid a giant `nvidia.ts` file.

---

# 8. Provider Type

Conceptual:

```ts
export class NvidiaNimProvider implements LLMProvider {
  constructor(
    private readonly config: NvidiaConfig,
    private readonly credentials: CredentialResolver,
    private readonly capabilities: NvidiaCapabilityResolver,
  ) {}
}
```

Avoid unnecessary mutable provider state.

---

# 9. Credential Validation

Distinguish:

```text
missing credential
invalid credential
network failure
server failure
```

Do not treat a timeout as an invalid API key.

A lightweight authenticated model-list request is reasonable when supported.

---

# 10. Chat Completion Mapping

Generic GoFluent request:

```text
GenerationRequest
```

maps into NVIDIA's OpenAI-compatible request.

Conceptual payload:

```json
{
  "model": "...",
  "messages": [
    {
      "role": "system",
      "content": "..."
    },
    {
      "role": "user",
      "content": "..."
    }
  ],
  "stream": false
}
```

Optional model-specific fields are added by the NVIDIA adapter only.

---

# 11. Streaming

When streaming is used:

```text
NVIDIA HTTP stream
      ↓
SSE parser
      ↓
NVIDIA wire chunk
      ↓
NvidiaStreamMapper
      ↓
GenerationStreamEvent
      ↓
GoFluent application/TUI
```

The TUI must never parse NVIDIA wire chunks.

---

# 12. Failed Streams

If the connection fails after content has already streamed:

- stop the generation step;
- preserve displayed text as incomplete if appropriate;
- surface a normalized error;
- do not blindly replay if that could duplicate output or state transitions.

For learning content that must be structurally validated, incomplete streamed output must never be persisted as valid content.

---

# 13. Model Discovery

NIM deployments expose model listing through:

```text
GET /v1/models
```

However, the model-list endpoint may not expose every capability GoFluent needs.

Therefore separate:

```text
model discovery
```

from:

```text
capability discovery
```

---

# 14. Model Discovery Pipeline

```text
NVIDIA /v1/models
      ↓
raw model IDs
      ↓
NvidiaModelMapper
      ↓
normalized Model
      ↓
ModelRegistry
```

---

# 15. Capability Resolution

Capability resolution may combine:

```text
API model metadata
+
official model documentation
+
built-in capability mappings
+
local cache
```

into:

```text
ModelCapabilities
```

Do not guess unsupported capabilities.

---

# 16. Capability Resolver

Conceptual:

```ts
export class NvidiaCapabilityResolver {
  resolve(modelId: string): ModelCapabilities {
    // centralized NVIDIA-specific capability mapping
  }
}
```

All model special cases belong here.

---

# 17. No Scattered Model Checks

Avoid:

```ts
if (modelId.includes('nemotron')) {
  ...
}
```

inside:

- TUI;
- story generator;
- session planner;
- learning-engine;
- content-engine.

Use the capability resolver.

---

# 18. Reasoning

NVIDIA-hosted models can expose different reasoning controls.

There is no universal NVIDIA reasoning configuration.

A model may expose:

```text
reasoning_effort
```

with model-dependent accepted values.

Other models may expose different reasoning controls or budgets.

Therefore GoFluent uses capability-driven mapping.

---

# 19. Reasoning Auto Mode

Default:

```text
auto
```

When `auto` is selected, the NVIDIA adapter should normally preserve the model's documented default.

That may mean omitting explicit reasoning parameters.

---

# 20. Unsupported Reasoning

If:

```text
ReasoningCapability = unsupported
```

then GoFluent must not send reasoning-specific fields.

---

# 21. Invalid Reasoning Setting

If the selected model exposes only:

```text
none
high
max
```

and a caller requests:

```text
medium
```

reject locally as:

```text
UNSUPPORTED_CAPABILITY
```

before the HTTP request.

The UI should normally prevent invalid selection.

---

# 22. Raw Reasoning Traces

GoFluent must not depend on displaying raw internal reasoning traces.

The product needs:

```text
final content
structured output
usage metadata
status
```

not hidden chain-of-thought text.

---

# 23. Structured Generation

GoFluent heavily depends on structured content.

Examples:

- adaptive stories;
- comprehension questions;
- placement items;
- evaluation metadata;
- tutor feedback categories.

Provider flow:

```text
prompt
   ↓
NIM
   ↓
structured output
   ↓
Zod validation
   ↓
domain validation
```

Never trust provider-side structure guarantees alone.

---

# 24. Example Story Response Contract

```ts
const StoryOutputSchema = z.object({
  title: z.string().min(1),
  text: z.string().min(1),
  targetItems: z.array(z.string()),
  comprehensionQuestions: z.array(
    z.object({
      question: z.string(),
      expectedConcepts: z.array(z.string()),
    }),
  ),
});
```

After schema validation, content-engine still verifies lexical difficulty.

---

# 25. Provider vs Pedagogical Validation

NVIDIA provider validates:

```text
wire response
JSON shape
provider protocol
```

Content engine validates:

```text
known vocabulary coverage
unknown ratio
target lexical items
difficulty
pedagogical constraints
```

Do not mix these layers.

---

# 26. Sampling

Generic settings may include:

```text
temperature
top_p
max output tokens
```

Only send parameters supported by the selected model/API.

Generation settings should be conservative for structured learning content.

Reliability is more valuable than creativity when producing validated exercises.

---

# 27. Error Mapping

Important examples:

```text
missing local key
→ MISSING_CREDENTIAL
```

```text
401 / 403
→ INVALID_CREDENTIAL
```

```text
404 model
→ MODEL_NOT_FOUND
```

```text
429
→ RATE_LIMITED
```

```text
5xx
→ SERVER
```

```text
timeout
→ TIMEOUT
```

---

# 28. Rate Limits

Do not assume fixed NVIDIA rate limits.

When available:

- inspect retry hints;
- use bounded retry;
- provide friendly errors.

Never implement infinite retries.

---

# 29. Request IDs

If NVIDIA provides a correlation/request ID, record it in structured diagnostic metadata.

Useful for:

- debugging;
- provider support;
- tracing.

Do not clutter the normal learner UI with request IDs.

---

# 30. Cancellation

Use:

```ts
AbortSignal
```

Cancellation should stop:

```text
HTTP request
stream reading
retry loop
generation workflow
```

Do not continue expensive provider work after the learner has left an activity.

---

# 31. Model Cache

Model/capability metadata may be cached under:

```text
<GoFluent cache>/nvidia-models.json
```

Conceptual:

```json
{
  "schemaVersion": 1,
  "updatedAt": "...",
  "models": []
}
```

Exact filename is internal.

---

# 32. Cache Refresh

Preferred:

```text
load cached metadata
      ↓
start TUI
      ↓
refresh NVIDIA metadata asynchronously
      ↓
merge
      ↓
update settings/model state
```

Provider metadata refresh must not block startup unnecessarily.

---

# 33. Unknown Models

If a model is returned but capabilities are unknown, use conservative behavior.

Suggested:

```text
basic text generation = attempt if endpoint supports it
structured output = unknown unless verified
reasoning = hidden/unsupported
tools = hidden/unsupported
vision = unknown
```

Do not infer advanced capabilities from a model name.

---

# 34. Default Model Strategy

Do not permanently hardcode one NVIDIA model as "the GoFluent model."

Selection should consider:

```text
instruction following
structured generation reliability
English generation quality
context size
latency
availability
```

A recommended default can exist as configuration.

Capability data remains authoritative.

---

# 35. Learning Workload Profiles

GoFluent may eventually use different model profiles for different tasks.

Examples:

```text
story generation
learner response evaluation
conversation
placement
short explanations
```

Do not implement complex model routing for v0.1.0.

One configured model is enough for the first vertical slice.

---

# 36. Self-Hosted NIM

Preserve support for custom base URLs.

Future:

```text
NVIDIA provider
+
custom NIM endpoint
```

Authentication may differ:

- no auth;
- bearer token;
- gateway auth.

Hosted authentication assumptions must remain inside NVIDIA endpoint configuration.

---

# 37. Speech Architecture

Speech is a separate provider boundary.

Do not make `NvidiaNimProvider` simultaneously own all LLM, ASR, and TTS responsibilities.

Use:

```text
LLMProvider
SpeechToTextProvider
TextToSpeechProvider
```

with NVIDIA implementations.

---

# 38. NVIDIA ASR NIM

Current NVIDIA Speech NIM documentation exposes ASR through:

- HTTP REST for simple offline transcription;
- gRPC for batch/streaming;
- WebSocket for low-latency realtime recognition.

For GoFluent MVP, prefer the simplest interface that meets the activity.

Possible strategy:

```text
short learner recording
      ↓
HTTP REST ASR
      ↓
transcript
```

Realtime WebSocket ASR can come later.

Official reference:

https://docs.nvidia.com/nim/speech/latest/reference/api-references/asr/

---

# 39. ASR Provider Contract

```ts
export interface SpeechToTextProvider {
  transcribe(
    input: AudioInput,
    signal?: AbortSignal,
  ): Promise<TranscriptResult>;
}
```

NVIDIA adapter maps this into the selected ASR NIM interface.

---

# 40. NVIDIA TTS NIM

NVIDIA TTS NIM provides speech synthesis and supports offline and streaming modes depending on interface/deployment.

GoFluent can start with:

```text
text
 ↓
TTS request
 ↓
complete audio
 ↓
cache
 ↓
play
```

Streaming synthesis can be added when latency becomes important.

Official reference:

https://docs.nvidia.com/nim/speech/latest/tts/

---

# 41. TTS Provider Contract

```ts
export interface TextToSpeechProvider {
  synthesize(
    input: TTSRequest,
    signal?: AbortSignal,
  ): Promise<TTSResult>;
}
```

Potential input:

```ts
export interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
  language: string;
}
```

---

# 42. Voice Discovery

If the selected NVIDIA TTS deployment exposes voice discovery, the speech adapter may load supported voices dynamically.

The domain should receive normalized voice metadata.

Do not hardcode provider-specific voice names throughout the UI.

---

# 43. Speech Failure Behavior

Speech service failure must not necessarily block text learning.

Example:

```text
TTS unavailable
→ allow reading activity
→ offer retry
```

ASR unavailable:

```text
→ allow typed response when pedagogically acceptable
```

The learning session should degrade gracefully.

---

# 44. NVIDIA Configuration

Conceptual environment/config:

```text
NVIDIA_API_KEY
NVIDIA_NIM_BASE_URL
NVIDIA_NIM_MODEL

NVIDIA_ASR_BASE_URL
NVIDIA_TTS_BASE_URL
```

Not every value must be required.

Hosted and self-hosted profiles may differ.

---

# 45. Testing

NVIDIA adapter tests should cover:

```text
credential missing
credential rejected
model list
chat generation
structured response
stream parsing
timeout
rate limit
server error
cancellation
unknown model
unsupported capability
```

Speech adapters should cover:

```text
ASR success/error
TTS success/error
cancellation
invalid audio
voice metadata
```

Use mocked HTTP servers for normal test suites.

---

# 46. Live Provider Tests

Live tests must be opt-in.

Example:

```text
pnpm test:ai:live
```

Requirements:

```text
NVIDIA_API_KEY
```

possibly speech endpoint configuration.

Do not make normal CI dependent on an external NVIDIA service.

---

# 47. Provider Health UX

Examples:

Invalid key:

```text
Your NVIDIA API key was rejected.

[ Update key ]
```

Network failure:

```text
Could not reach NVIDIA.

[ Retry ]
```

Rate limit:

```text
NVIDIA is temporarily limiting requests.

Try again shortly.
```

Exact wording belongs to the TUI.

---

# 48. Security

Never log:

```text
Authorization
API key
raw credentials
```

Do not send more learner data than necessary.

Do not persist raw speech by default.

Do not execute model-generated content as code.

---

# 49. Current Facts Verified for This Specification

As of August 2026, current official NVIDIA documentation supports the following architectural assumptions:

1. NIM LLM exposes an OpenAI-compatible inference API.
2. `/v1/chat/completions` is available.
3. `/v1/responses` is also available in current NIM LLM API documentation.
4. Chat completions support streaming.
5. Tool calling exists at the API level but is model/deployment dependent.
6. `/v1/models` is available for model discovery.
7. NVIDIA Speech NIM provides ASR.
8. ASR currently exposes REST, gRPC, and WebSocket interface options.
9. NVIDIA Speech NIM provides TTS.
10. TTS supports offline and streaming-oriented workflows depending on the deployment/interface.

These facts justify provider- and capability-driven integration.

---

# 50. MVP Definition of Done

NVIDIA integration is ready for GoFluent v0.1.0 when:

- [ ] API key can be resolved.
- [ ] credential errors are correctly distinguished.
- [ ] available LLM models can be loaded.
- [ ] a model can be selected/persisted.
- [ ] GoFluent can generate validated structured learning content.
- [ ] text generation can be cancelled.
- [ ] errors are normalized.
- [ ] no NVIDIA-specific request behavior leaks into learning-engine or TUI.
- [ ] model capability logic is centralized.
- [ ] story generation works through the generic provider interface.
- [ ] FakeProvider can replace NVIDIA in automated tests.
- [ ] TTS integration can be enabled behind `TextToSpeechProvider` when included in the release.
- [ ] ASR integration can be enabled behind `SpeechToTextProvider` without architecture changes.

---

# 51. Final Rule

NVIDIA NIM is GoFluent's first AI platform, not GoFluent's architecture.

> **Use NVIDIA's capabilities aggressively inside the adapter while keeping the learner model, pedagogy, and product domain provider-independent.**
