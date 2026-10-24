# Nova Refactoring Progress & Honesty Log

## Starting Point (v0.0.1 Audit)
- **Status**: The repository contained multiple inflated, ungrounded features (fake multi-agent thoughts via `generateMockThoughts`, mock MLOps and Data Science metrics, voice player, uncalibrated proctor scorecard, and noise commits from `self-improve.ts`).
- **Goal**: Transform Nova into a small, honest, working open-source research assistant. A developer can bring an API key (Gemini, Claude, OpenAI) or run Ollama locally to perform deep, cited web research rendered as interactive visual cards with 0% mock output.

## Phase 1 — Scope Creep Removal
- [ ] Remove self-improve workflows, hypergraph memory, EVOLUTION.md
- [ ] Remove MLOps pipeline & Analytics route
- [ ] Remove Data Science workbench & Proctor scorecard
- [ ] Remove Voice Briefing engine and components
- [ ] Clean up UI and types to only reflect honest research studio capabilities

## Phase 2 — Real Multi-Provider Support
- [ ] Define clean `LLMProvider` interface in `src/lib/ai-gateway.ts`
- [ ] Implement Gemini provider with valid models
- [ ] Implement Anthropic Claude provider via SDK
- [ ] Implement OpenAI-compatible provider (OpenAI, OpenRouter, Groq)
- [ ] Implement Ollama local provider (`/api/tags`)
- [ ] Show onboarding screen if no provider is configured

## Phase 3 — Real Research Pipeline
- [ ] Grounded web search with citations
- [ ] Page text extraction
- [ ] Zod schema-validated JSON outputs
- [ ] Real interactive cards (Report, Matrix, Plan, Chart) rendered only from real LLM/grounded data

## Phase 4 — Developer Experience & Honest Documentation
- [ ] Clean `.env.example`
- [ ] Truthful README rewrite (0 buzzwords, accurate architecture)
- [ ] Docker & Docker Compose setup

## Phase 5 — Meaningful Tests & Verification
- [ ] Provider unit tests with HTTP mocks
- [ ] Zero fake data / Math.random verification
- [ ] CI validation (`bun test`, `bun run lint`, `bun run build`)
