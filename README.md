# Nova: The Universal Open-Source Autonomous Intelligence Studio

[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](https://opensource.org/licenses/MIT)
[![Next.js 15](https://img.shields.io/badge/Next.js-15%20(App%20Router)-black)](https://nextjs.org/)
[![Turbopack](https://img.shields.io/badge/Bundler-Turbopack-blueviolet)](https://turbo.build/)
[![Local First](https://img.shields.io/badge/Privacy-100%25%20Local--First-emerald)](https://github.com)

**Nova** is an open-source, local-first Autonomous Intelligence Studio built for everyone. While legacy chatbots trap you in passive walls of text, Nova orchestrates specialized multi-agent teams that **plan, research, synthesize, and render live interactive visual artifacts** (evidence graphs, milestone task DAGs, dynamic data charts, and weighted decision matrices).

---

## 🌟 Why Nova? ("Something Better We Needed")

Everyday knowledge workers, researchers, builders, students, and creators are drowning in disconnected tabs and shallow prompt-response loops. Nova introduces a new category of open-source personal AI:

1. **🧭 Autonomous Deep Research & Investigation**:
   - Recursively breaks down hypotheses into exploration sub-queries.
   - Crawls multi-domain sources, flags contradictions, and calculates relevance scores.
   - Generates publication-ready reports with verified citations and one-click markdown exports.

2. **⚡ Goal-to-DAG Autonomous Execution Planner**:
   - Translates any ambitious human goal into a dependency-ordered milestone hierarchy.
   - Interactive task runner with live checkbox completion tracking and progress calculation.
   - Automatic celebratory feedback on milestone achievements.

3. **📊 Dynamic Generative UI & Visual Artifacts**:
   - Replaces walls of text with live, interactive Recharts visualizations (Bar & Line modes).
   - Generates multi-criteria **Decision Matrices** with dynamic slider recalculations.
   - Syntax-highlighted **Code Sandboxes** with instant one-click copying and file downloads.

4. **🧠 Personal Context & Local Knowledge Hub**:
   - Zero-telemetry, local-first memory stored directly in your browser.
   - Injects user preferences, project constraints, and architectural guidelines into agent reasoning.

5. **🎙️ Voice & Multimodal Interaction**:
   - Built-in speech-to-text voice dictation using standard browser Web Speech APIs.

6. **🛡️ Zero-Crash Defensive Resilience**:
   - First-class support for **Google Gemini 2.0 Flash / 1.5 Flash**, **Anthropic Claude**, and **Local Ollama** (`http://localhost:11434`).
   - Seamless offline fallback simulation ensuring 100% demo reliability without unexpected 429s or network disconnects.

---

## 🚀 Quick Start (Running in 30 Seconds)

### Prerequisites
- Node.js 20+ or Bun 1.2+

### 1. Clone & Install
```bash
git clone git@github.com:your-username/nova.git
cd nova
bun install # or: pnpm install
```

### 2. Configure Environment (Optional)
Nova runs completely offline out of the box with realistic local simulation. To enable live frontier models, add your keys to `.env.local`:
```bash
cp .env.example .env.local
```
Add your key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Development Server
```bash
bun dev # or: pnpm dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🏗️ Architecture

```
nova/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── agent/route.ts       # Unified Agent Orchestration Streaming API
│   │   ├── globals.css              # Custom styling, dark mode & smooth scrollbars
│   │   ├── layout.tsx               # Root layout & typography
│   │   └── page.tsx                 # Main Nova Studio interactive workspace
│   ├── components/
│   │   ├── Navbar.tsx               # Header with Engine Switcher & Status
│   │   ├── Sidebar.tsx              # Sessions, Starters, & Open Source info
│   │   ├── AgentCanvas.tsx          # Central collaborative canvas & prompt dock
│   │   ├── VoiceInput.tsx           # Multimodal voice input recorder
│   │   ├── MemoryModal.tsx          # Personal Knowledge & Context memory manager
│   │   └── GenerativeCards/
│   │       ├── ResearchReportCard.tsx # Deep research visual report with citations
│   │       ├── TaskDagCard.tsx      # Milestone DAG & interactive task runner
│   │       ├── ChartCard.tsx        # Dynamic generative Recharts data visualizer
│   │       ├── DecisionMatrixCard.tsx # Weighted criteria comparison table
│   │       └── CodeSandboxCard.tsx  # Code viewer with copy, run, and syntax styling
│   └── lib/
│       ├── types.ts                 # Type definitions
│       ├── utils.ts                 # Styling & date helpers
│       ├── ai-gateway.ts            # Resilient Multi-Provider LLM Gateway
│       └── mock-generators.ts       # Realistic dynamic fallback generators
```

---

## 🤝 Contributing

Nova is designed for the global community:
- Fork the repository.
- Create a feature branch: `git checkout -b feature/amazing-engine`
- Commit your changes: `git commit -m "feat: add local Ollama streaming connector"`
- Push to the branch: `git push origin feature/amazing-engine`
- Open a Pull Request!

---

## 📄 License

Distributed under the **MIT License**. Free for personal, academic, and commercial use.
