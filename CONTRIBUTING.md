# Contributing to Nova

Thank you for your interest in contributing to **Nova**! Nova is an open-source, local-first Autonomous Intelligence Studio built for everyone. We welcome contributions from developers, designers, researchers, and technical writers worldwide.

---

## Code of Conduct

All contributors are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat all community members with respect, empathy, and professional integrity.

---

## Quick Start for Contributors

### 1. Prerequisites
- **Bun** 1.2+ (recommended) or **Node.js** 20+
- **Git**

### 2. Fork & Clone
```bash
git clone https://github.com/your-username/nova.git
cd nova
bun install # or: pnpm install
```

### 3. Local Development
```bash
bun dev
```
Open [http://localhost:3000](http://localhost:3000) to view the live app.

### 4. Running Tests
We enforce a strict 100% test pass rate for all pull requests:
```bash
bun test
```

### 5. Production Build & Typecheck
Ensure Turbopack builds cleanly with zero errors:
```bash
bun run build
```

---

## Project Structure & Architecture

```
nova/
├── src/
│   ├── app/
│   │   ├── api/agent/route.ts       # Unified Agent Orchestration Streaming Route
│   │   ├── layout.tsx               # Root Layout & Typography
│   │   └── page.tsx                 # Main Studio Workspace
│   ├── components/
│   │   ├── Navbar.tsx               # Top Bar, Model Selector, Audio Haptics
│   │   ├── Sidebar.tsx              # Sessions & Quick Starters
│   │   ├── AgentCanvas.tsx          # Central Interaction Stream & Drag-Drop Dock
│   │   ├── CommandPalette.tsx       # ⌘K Power User Navigation
│   │   ├── McpInspector.tsx         # Model Context Protocol Tool Explorer
│   │   ├── SwarmHUD.tsx             # Real-time Multi-Agent Swarm Pipeline Status
│   │   ├── DevHubModal.tsx          # In-app Contributor & Architecture Hub
│   │   ├── ErrorBoundary.tsx        # Production Client-side Error Boundary
│   │   └── GenerativeCards/         # Dynamic Interactive Widgets
│   │       ├── ResearchReportCard.tsx
│   │       ├── TaskDagCard.tsx
│   │       ├── ChartCard.tsx
│   │       ├── DecisionMatrixCard.tsx
│   │       └── CodeSandboxCard.tsx
│   └── lib/
│       ├── types.ts                 # TypeScript Data Models
│       ├── sanitizer.ts             # Input Sanitization & Security Hardening
│       ├── sound.ts                 # Web Audio API Acoustic Haptic Engine
│       ├── ai-gateway.ts            # Resilient Multi-Provider LLM Gateway
│       └── mock-generators.ts       # Zero-Crash Realistic Fallback Generators
└── tests/                           # Bun Automated Unit & Integration Tests
    ├── gateway.test.ts
    ├── generators.test.ts
    └── sanitizer.test.ts
```

---

## How to Add a New Autonomous Engine

1. **Add the Engine Mode in `src/lib/types.ts`:**
   ```typescript
   export type StudioMode = 'research' | 'planner' | 'canvas' | 'coder' | 'matrix' | 'your_new_mode';
   ```
2. **Build an Interactive Generative Card:**
   Create `src/components/GenerativeCards/YourNewCard.tsx`. Ensure it renders structured interactive UI (charts, tables, action buttons) rather than static markdown.
3. **Add Mock Fallback Generators in `src/lib/mock-generators.ts`:**
   Always adhere to the **Zero Demo Crash** pattern. Even if an external API key is missing or rate-limited, provide a realistic mock response.
4. **Wire the Gateway in `src/lib/ai-gateway.ts`:**
   Handle the new mode in `processAgentRequest()`.
5. **Add a Unit Test:**
   Add test coverage in `tests/generators.test.ts`.

---

## Pull Request Guidelines

1. **Branch Naming**:
   - `feat/feature-name`
   - `fix/bug-description`
   - `docs/documentation-update`
2. **Commit Messages**: Follow Conventional Commits format (`feat: ...`, `fix: ...`, `docs: ...`).
3. **Verify Locally**:
   - Run `bun test` (all tests must pass).
   - Run `bun run build` (build must succeed).
4. **Submit PR**: Open a PR against the `main` branch with a clear description of what changed.
