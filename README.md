# GoFluent

GoFluent is an AI-based English acquisition system, delivered as a cross-platform TUI for Linux
and Windows, built on Node.js 24 + TypeScript + React/Ink.

See `ROADMAP.md` for the phased plan, `PRD.md` for product requirements, and `docs/ARCHITECTURE.md`
for the technical architecture. `docs/RESEARCH.md` is the pedagogical source of truth.

## Requirements

- Node.js 24+
- pnpm 11+

## Getting started

```sh
pnpm install
cp .env.example .env   # fill in NVIDIA_API_KEY if you want live AI generation
pnpm dev
```

## Scripts

| Command               | Description                                   |
| ---------------------- | ---------------------------------------------- |
| `pnpm dev`              | Run the TUI in development mode                |
| `pnpm build`            | Type-compile all packages and the TUI          |
| `pnpm typecheck`        | Type-check all packages without emitting       |
| `pnpm lint`             | Lint the whole workspace                       |
| `pnpm test`             | Run the unit/integration test suite            |
| `pnpm test:ai:live`     | Run opt-in live NVIDIA NIM tests (needs a key) |

## Monorepo layout

```text
apps/tui               React + Ink terminal client
packages/core           Domain entities, enums, error taxonomy
packages/application    Use cases (Phase 1+)
packages/learning-engine Mastery updates, review scheduling (Phase 1+)
packages/lexical-engine  Tokenization, coverage, learning value (Phase 1+)
packages/content-engine  Generated-content validation (Phase 2+)
packages/ai              LLMProvider contract, FakeProvider, NVIDIA NIM adapter
packages/speech           ASR/TTS provider boundaries (Phase 3+)
packages/db                SQLite connection, migrations
packages/config             Layered runtime configuration
packages/shared               Generic utilities (IDs, dates, Result type)
```

Local data (SQLite database, cache, audio, logs) lives under a platform-specific application data
directory (`~/.local/share/gofluent` on Linux, `%APPDATA%\GoFluent` on Windows) and is never
committed to the repository.
