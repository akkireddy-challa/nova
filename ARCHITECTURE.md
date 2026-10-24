# Nova Architecture & Engineering Specification

This document provides a technical deep-dive into **Nova's** architecture, state lifecycle, multi-agent coordination, and Model Context Protocol (MCP) tool integration.

---

## 1. System Overview

Nova is built as a **hybrid local-first Autonomous Intelligence Studio**. It separates client-side rendering from autonomous orchestration loops to ensure sub-second UI responsiveness, acoustic feedback, and uninterrupted offline capability.

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Layer                          │
│  Next.js 15 App Router • Tailwind 4 • Turbopack • Web Audio │
│                                                             │
│   ┌──────────────┐   ┌──────────────┐   ┌───────────────┐   │
│   │  Swarm HUD   │   │ Canvas Dock  │   │  Command ⌘K   │   │
│   └──────┬───────┘   └──────┬───────┘   └───────┬───────┘   │
└──────────┼──────────────────┼───────────────────┼───────────┘
           │                  │                   │
           ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                 Nova Autonomous Orchestrator                │
│                     (/api/agent Route)                      │
│                                                             │
│    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│    │  Strategist  │──▶│  Crawler/MCP │──▶│   Verifier   │   │
│    └──────────────┘   └──────────────┘   └──────┬───────┘   │
│                                                 │           │
│                                                 ▼           │
│                                          ┌──────────────┐   │
│                                          │ UI Synthesizer│  │
│                                          └──────────────┘   │
└─────────────────────────────┬───────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
┌───────────────────────────┐           ┌───────────────────┐
│     Multi-Model Gateway   │           │   MCP Tool Bus    │
│ Gemini 2.0 • Claude 3.7   │           │ Filesystem • Web  │
│ DeepSeek • Local Ollama   │           │ Vector Store • Git│
└───────────────────────────┘           └───────────────────┘
```

---

## 2. Multi-Agent Swarm Pipeline

Every incoming user task passes through a 4-stage pipeline:

1. **Lead Strategist (Inquiry Planner)**:
   - Deconstructs broad goals into specific, testable sub-hypotheses.
   - Computes the critical path and orders execution milestones.
2. **Crawler & MCP Tool Dispatcher**:
   - Executes parallel multi-domain queries across academic and web repositories.
   - Invokes local MCP tools (filesystem, vector memory, git inspector).
3. **Fact Verifier & Anti-Hallucination Critic**:
   - Triangulates factual claims across disparate sources.
   - Calculates relevance confidence scores and flags contradictions or safety risks.
4. **Generative UI Synthesizer**:
   - Converts structured JSON deliverables into interactive visual cards:
     - `ResearchReportCard`: Citation links, relevance badges, TTS audio briefing.
     - `TaskDagCard`: Interactive checklist, percentage tracker, confetti burst.
     - `ChartCard`: Dynamic Recharts data models.
     - `DecisionMatrixCard`: Weighted scoring with real-time recalculation sliders.
     - `CodeSandboxCard`: Syntax-styled runnable code with copy and download.

---

## 3. Resilience & Defensive "Zero Demo Crash" Pattern

In mission-critical hackathons and live production use, external LLM endpoints frequently hit HTTP 429 (rate limits) or network latency drops. Nova guarantees 100% continuous operation:

- **Strict AbortSignal Timeouts**: All external network calls abort at 8,000ms.
- **Dynamic Contextual Fallbacks**: If an API key is missing or an endpoint times out, Nova switches automatically to high-fidelity simulated outputs tagged with an explicit telemetry badge.
- **Client Error Boundary**: A top-level React Error Boundary intercepts any runtime exceptions, preventing blank-screen crashes.

---

## 4. Model Context Protocol (MCP) Integration

Nova natively follows the [Anthropic Model Context Protocol](https://modelcontextprotocol.io/) specification:
- Connects to local MCP servers via standard JSON-RPC endpoints.
- Displays live ping latency and parameter schemas in the `McpInspector` drawer.
- Tools can be dynamically enabled or disabled per workspace session.
