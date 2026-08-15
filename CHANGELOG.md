# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Phase 0 project skeleton: pnpm workspaces monorepo (`apps/tui`, `packages/core`, `application`,
  `learning-engine`, `lexical-engine`, `content-engine`, `ai`, `speech`, `db`, `config`, `shared`).
- Strict TypeScript base config (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- Minimal Ink TUI shell with state-machine navigation (`SPLASH → ONBOARDING → PLACEMENT → HOME`).
- SQLite persistence via Node's built-in `node:sqlite`, with `PRAGMA foreign_keys=ON` and WAL mode,
  and cross-platform data directory resolution.
- Initial migration (`0001_initial.sql`) covering the vertical-slice schema.
- `packages/config` with layered configuration (defaults → config file → env vars) and Zod validation.
- `packages/ai` generic `LLMProvider` contract, provider registry, deterministic `FakeProvider`, and an
  initial `NvidiaNimProvider` adapter (`/v1/chat/completions`, credential validation, error normalization).
- Vitest test suite; CI on Ubuntu and Windows with Node 24.

## [0.1.0] - Unreleased

Initial MVP release target (P0). See `ROADMAP.md`.
