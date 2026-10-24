# Nova Startup Engineering Plan (Sprint 0–4)

## Core Mission

Transform Nova into a local-first, honest, open-source research assistant where queries trigger real web searches and any selected LLM (Gemini, Claude, OpenAI, Ollama) synthesizes cited answers rendered as interactive visual cards with 0% mock output.

## Sprint Roadmap

- **Sprint 0: Architecture, Team Setup & Contracts** [CEO / Lead Agent]
  - Create `docs/team/` (`PLAN.md`, `STANDUP.md`, `REQUESTS.md`, `CONTRACTS.md`)
  - Formalize shared contracts across all teams.

- **Sprint 1: Scope Creep Purge** [Cleanup Engineer (`team/cleanup`)]
  - Delete Startup Center, MLOps, Data Science workbench, Voice engine, Proctor scorecard, and self-improve noise scripts.
  - Fix all dangling imports and verify clean build on `team/cleanup`.
  - Merge into `release/v0.1`.

- **Sprint 2: Parallel Implementation** [Sprint 2 Team]
  - **Providers Engineer (`team/providers`)**: Implement Gemini, Anthropic Claude, OpenAI, Ollama providers with real latency/tokens.
  - **Research Pipeline Engineer (`team/research`)**: Pluggable search (Tavily/Brave/DDG), page fetcher, and Zod artifact validation with retry.
  - **Frontend Engineer (`team/frontend`)**: Clean onboarding screen, provider picker, real `TraceStep[]` HUD, real citation cards.
  - **DevOps Engineer (`team/devops`)**: Standalone Dockerfile, docker-compose with local Ollama profile, package.json scripts.
  - **DevRel / Docs (`team/docs`)**: Honest README, .env.example, CONTRIBUTING.md, ARCHITECTURE.md.
  - **QA Engineer (`team/qa`)**: Unit tests for providers, search, pipeline, no-key path, and zero-mock invariant test.

- **Sprint 3: Sequential Integration** [CEO / Lead Agent]
  - Merge into `release/v0.1` in strict order:
    1. `team/providers`
    2. `team/research`
    3. `team/frontend`
    4. `team/devops`
    5. `team/docs`
    6. `team/qa`
  - Run `bun test`, `bun run lint`, `bun run build` after each integration step.

- **Sprint 4: Release Verification & DoD Audit** [CEO + QA Engineer]
  - Execute 9-point Definition of Done checklist.
  - Produce `docs/team/QA-REPORT.md`.
  - Open release PR `release/v0.1` -> `main`.
