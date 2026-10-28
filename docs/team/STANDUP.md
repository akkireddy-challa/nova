# Nova Daily Standup & Activity Log

Format: `[role] [done|in-progress|blocked] what changed, files touched, what is still fake/missing.`

## Sprint 0

- [ceo] [done] Initialized docs/team/ with PLAN.md, CONTRACTS.md, REQUESTS.md, STANDUP.md. Defined system contracts and schedule.

## Sprint 1 — Cleanup review (owner)

- [cleanup] [done] Out-of-scope features and self-improve loop removed (commit a984c04). Local `.git/hooks/post-commit` self-improve hook renamed to `post-commit.disabled`.
- [security] [done] Removed server-side `execute_code` MCP tool: it ran request-supplied JS via `new Function` and could read `process.env` (commit 1cab440). Do NOT reintroduce server-side code execution.
- [cleanup] [done] Removed SwarmHUD (scripted agents + Math.random confidence). Frontend: build the real TraceStep panel in its place.
- [qa] [done] Reverted the eslint rule relaxations; fixed all lint errors properly; CI now runs `bun run lint` (commit 7d9b027). Lint: 0 errors, 103 unused-var warnings.
- STILL FAKE / OPEN:
  - src/lib/ai-gateway.ts still calls generateMockThoughts and generateMock* fallbacks → Providers + Research.
  - src/lib/mcp-registry.ts: web_search and inspect_github_repo return hardcoded fake results when live calls fail; custom plugins return `mock_custom_executed` → Research.
  - Only Gemini is implemented; Claude/OpenAI/Ollama are not → Providers.

## Sprint 2 — Real providers, pipeline, honest UI (Claude subagents)

- [providers] [done] Gemini, Anthropic, OpenAI-compatible and Ollama providers in src/lib/providers/; keys sent in headers only; errors redact keys/URLs. /api/v1/models lists only callable models; /api/v1/chat/completions is a real proxy with streaming.
- [research] [done] /api/agent runs resolve model -> search -> fetch pages (SSRF-guarded) -> LLM -> zod validation (one retry) -> artifact. mock-generators.ts deleted; thoughts record only real events; citations map to real sources.
- [frontend] [done] Model picker from /api/v1/models, onboarding when no provider is configured, honest error bubbles, real step list; fake UI and buzzword copy removed; API keys no longer stored in localStorage.
- [docs/devops] [done] Honest README/ARCHITECTURE/CONTRIBUTING/SECURITY, .env.example, LICENSE (MIT), Dockerfile (standalone via NEXT_OUTPUT=standalone) and docker-compose with optional Ollama.
- Verified against real APIs: Anthropic (research with live sources, plan); Gemini reached the API but the test key is over quota (429, handled as PROVIDER_ERROR).
- STILL OPEN:
  - DuckDuckGo keyless search is intermittently blocked by a bot check; now reported as an error. Tavily/Brave recommended.
  - Docker image build not verified (Docker daemon was not running).
  - Custom MCP plugin endpoints have no SSRF guard; no route exposes plugin registration today — any future route must validate endpoints.
  - /api/v1/embeddings and /api/intelligence were not refactored (embeddings fallback is a word hash; usage is estimated).

## Sprint 3 — Browser test, honest memory search, lint (Claude subagents)

- [qa] [done] Drove the app in headless Chrome against real Anthropic: model picker, research answer with citations, card, and step list all work; no console errors. Fixed: Quick mode's 2048-token cap truncated research JSON (caps now 4096/8192/16384); "Deterministic Recommendation" and "emerging confidence" labels.
- [memory] [done] Deleted the fake "cognitive stack" (intelligence-layers.ts) and word-hash embeddings. Providers gained embed() for Gemini, OpenAI-compatible and Ollama; /api/v1/embeddings is a real proxy (503 without an embeddings provider). Memory search uses real embeddings or BM25 keyword search and reports which. Verified with real Gemini embeddings (gemini-embedding-001, 3072 dims).
- [providers] [done] Gemini model list excludes non-chat models (TTS, image, music, robotics...).
- [lint] [done] 0 errors, 0 warnings.
- RESOLVED from Sprint 2: embeddings/intelligence fake data.
- STILL OPEN: DuckDuckGo intermittently blocked (Tavily/Brave recommended); Docker image build unverified; custom MCP endpoints unguarded (no route exposes registration).

## Sprint 3 Completion & Enhancements

- [frontend] [done] Connected SSE streaming to chat UI with live TraceSteps and cancellation Stop button.
- [frontend] [done] Passed multi-turn conversation history (`buildHistory`) to `/api/agent` for context-aware follow-up research.
- [backend] [done] Added custom MCP plugin registration (`POST /api/v1/tools`) with SSRF guard blocking private/loopback endpoints.
- [devops] [done] Adopted Bun v1.4.4 with `bun fmt` Prettier-compatible formatting and `bun pm fetch` layer caching in Dockerfile.
- [search/docs] [done] Added Exa search provider (`EXA_API_KEY`, priority Tavily -> Exa -> Brave -> SearXNG -> DuckDuckGo) with keyless header auth, error redacting, and signal timeout/cancellation support in `src/lib/research/search.ts` and `tests/search.test.ts`. Documented in `.env.example`, updated `README.md` search providers table, and marked streaming answers as completed in the roadmap.
- RESOLVED from Sprint 3: Custom MCP endpoints guarded against SSRF (`POST /api/v1/tools` validates target URLs against private/loopback ranges).
- STILL OPEN: DuckDuckGo intermittently blocked (Tavily/Exa/Brave recommended); Docker image build unverified (requires Docker daemon).

## Sprint 4 — Local Agent Station: Provider Hub, Session Backup & Document RAG

- [providers] [done] Built `GET /api/v1/providers/status` endpoint querying real health, latency (via `performance.now()`), model count, and configuration status for LLM providers (Anthropic, Gemini, OpenAI, Ollama) and search providers (Tavily, Exa, Brave, SearXNG, DuckDuckGo). Supports targeted individual provider pings via `?provider=`. Zero fake data or Math.random.
- [frontend] [done] Upgraded `SettingsModal.tsx` to serve as the interactive Provider & Health Control Hub with live status badges (Connected / Not Configured / Error), real latency pills (e.g. `⚡ 142ms`), individual Ping/Test triggers with reactive loaders, preset guidance for local LLM engines (Ollama, LM Studio, vLLM) with 1-click clipboard copy, and search grounding status badges. Retained thinking budget preferences.
- [sessions] [done] Created `src/lib/session-export.ts` with `exportSessionAsJson`, `exportAllSessionsAsJson`, `exportSessionAsMarkdown`, `downloadSessionMarkdown`, `copySessionMarkdownToClipboard`, and `validateSessionBackup` with strict schema validation and prototype pollution defense.
- [frontend] [done] Created `src/components/SessionExportModal.tsx` offering active session export (.md, .json, clipboard copy with live markdown preview) and full session backup & restore dropzone. Added `FolderArchive` export triggers to `Sidebar.tsx` and wired `onImportSessions` into `page.tsx`.
- [rag/documents] [done] Created `src/lib/document-parser.ts` parsing text, code, and structured files (.txt, .md, .json, .csv, .py, .ts, etc.) with 256 KB safety limit, control character sanitization, and size formatting.
- [frontend] [done] Added drag-and-drop file dropzone and paperclip file attachment support to `AgentCanvas.tsx` displaying formatted file chips and error alerts, passing attachments into `/api/agent`.
- [desktop] [done] Added Tauri v2 desktop application scaffolding in `src-tauri/` (`tauri.conf.json`, `Cargo.toml`, `main.rs`, `capabilities/default.json`) with `desktop:dev` and `desktop:build` scripts in `package.json`.
- [tests] [done] Added `tests/provider-status.test.ts` (5 tests), `tests/session-export.test.ts` (23 tests), and `tests/document-parser.test.ts` (7 tests). Total repo test suite: 163 tests passing across 11 test suites.
- All tests, lint, and build passing cleanly. Zero fake data.
