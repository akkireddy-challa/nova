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

## Sprint 5 — Source Metadata Enrichment, Local Document Indexing & Print Dossier PDF Export

- [research] [done] Enhanced `fetch-page.ts` to extract OpenGraph and standard HTML meta tags: `og:description`, `meta[name="description"]`, `author`, `article:author`, `article:published_time`, `datePublished`, and `og:site_name`. Normalizes whitespace, strips tags, decodes HTML entities.
- [pipeline] [done] In `pipeline.ts`, populated `SourceCitation` with extracted author bylines, site names, publication dates, and curated summaries.
- [frontend] [done] In `ResearchReportCard.tsx`, displayed publisher name, author byline, publication date, and snippet inside citation popovers and sources inspector.
- [rag/indexer] [done] Created `src/lib/document-indexer.ts` with sliding-window paragraph chunking and `indexDocumentIntoMemories` converting local documents into tagged `KnowledgeMemoryItem` entries. Upgraded `IntelligenceCanvas.tsx` with dedicated "Indexed Local Documents (RAG)" dropzone, overview cards, and batch deletion.
- [print/pdf] [done] Added "Print / PDF Dossier" in `ArtifactStage.tsx` with formal `@media print` layout featuring executive cover headers, confidence ratings, zebra-striped data matrices, execution milestone checkmarks, and numbered bibliography `[1] Title - Domain (URL)`. Added pure formatting helpers in `src/lib/print-dossier.ts`.
- [tests] [done] Added `tests/fetch-metadata.test.ts` (13 tests), `tests/document-indexer.test.ts` (11 tests), and `tests/print-export.test.ts` (25 tests).

## Sprint 6 — Deep Research Loop, Voice Interface & Interactive Artifacts

- [research] [done] Implemented multi-step recursive deep research in `src/lib/research/pipeline.ts` and `src/lib/research/prompts.ts`. When `budget === 'deep'`, dynamically decomposes queries into primary and targeted sub-investigations, executes multi-step searches concurrently, deduplicates URLs via `deduplicateSearchResults`, normalizes citation IDs (`src-1`, `src-2`, ...), and records real thought steps ("Decomposing research query", "Executed multi-step search", "Aggregated distinct sources"). Preserves fast single-query path for quick/analytical.
- [voice] [done] Created `src/lib/client/voice.ts` and `src/components/AudioBriefingBar.tsx`. Implemented continuous hands-free speech-to-text dictation via Web Speech API with pulsing `<Mic />` button in `AgentCanvas.tsx`. Implemented client-side text-to-speech audio overview with sentence batching, floating audio player widget, speed controls (1x, 1.25x, 1.5x), and markdown cleaner.
- [artifacts] [done] Created `src/lib/matrix-calculator.ts` and updated `DecisionMatrixCard.tsx` with real-time criteria weight sliders (1x to 10x with normalized percentage display), dynamically recalculating candidate scores and leader ranks with a "Top Choice" trophy badge and "Reset Weights" control.
- [export] [done] Added 1-click "Download Code File" with automatic extension resolution, Line Numbers gutter toggle in `ArtifactStage.tsx`, and RFC 4180 compliant "Download CSV Data" for quantitative charts and decision matrices.
- [tests] [done] Added `tests/deep-research.test.ts` (22 tests), `tests/voice.test.ts` (19 tests), and `tests/interactive-artifacts.test.ts` (24 tests).
- All 276 tests passing across 17 test files. 0 lint errors, clean Next.js 16 build. Zero fake data.

## Sprint 7 — Multi-Agent Evaluator-Optimizer Critic, Portable HTML Dossiers & DevHub Live Tunnel

- [research/critic] [done] Created `src/lib/research/evaluator-optimizer.ts` implementing `auditEvidenceAndCitations` and `refineWithCritic`. Computes factual keyword overlap against real retrieved sources, tallies verified claims vs uncited claims vs invalid citations, and produces a factual alignment score (0-100%).
- [critic/optimizer] [done] In `refineWithCritic`, performs targeted optimization pass during deep budget synthesis if critical findings lack citations, matching and attaching real crawled sources based on keyword alignment.
- [pipeline] [done] In `src/lib/research/pipeline.ts`, hooked evidence audit and critic loop during research synthesis. Logs honest thought trace steps (`Auditing evidence against [N] crawled sources`, `Verified [X] claims across [Y] sources ([Z]% alignment)`), and attaches `verificationAudit` to research artifact metrics. Strictly zero fake data, zero Math.random().
- [html/export] [done] Created `src/lib/html-dossier.ts` compiling 100% self-contained single-file HTML5 documents with embedded CSS (dark/light themes), vanilla JS interactive citation hover popovers with smooth scroll glow, working criteria weight sliders with real-time score recalculation, and full bibliography with zero external network/CDN dependencies. Added "Save as Standalone HTML" (`<Share2 />`) buttons in `ArtifactStage.tsx` and `SessionExportModal.tsx`.
- [devhub/tunnel] [done] Upgraded `DevHubModal.tsx` and created `src/lib/devhub.ts` with instant 1-click Live Public Demo Tunnel launchers (`cloudflared`, `localtunnel`, `ngrok`), interactive API Gateway Sandbox for live query testing against `/api/v1` endpoints with latency measurement, and cURL command generators.
- [frontend/badges] [done] In `ResearchReportCard.tsx`, added the interactive `EvidenceAuditBadge` with popover breakdown of verified claims, source alignment %, and uncited assertions.
- [tests] [done] Created `tests/evaluator-optimizer.test.ts` (20 tests), `tests/html-dossier.test.ts` (22 tests), and `tests/devhub-tunnel.test.ts` (21 tests). Total test suite: 340 tests passing across 20 test files.
- [qa] [done] All 340 tests passing across 20 test files. 0 lint errors, clean Next.js 16 build. Zero fake data.
