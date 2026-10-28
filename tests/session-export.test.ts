import { describe, expect, test } from "bun:test";
import {
  exportSessionAsMarkdown,
  validateSessionBackup,
  sanitizeFileName,
  exportSessionAsJson,
  exportAllSessionsAsJson,
  downloadSessionMarkdown,
  copySessionMarkdownToClipboard,
} from "../src/lib/session-export";
import type { Session, ChatMessage } from "../src/lib/types";

describe("Session Export & Archive Hub", () => {
  describe("sanitizeFileName", () => {
    test("converts normal title into kebab-case slug", () => {
      expect(sanitizeFileName("Bun vs Node Performance")).toBe(
        "bun-vs-node-performance",
      );
    });

    test("removes punctuation and special characters", () => {
      expect(
        sanitizeFileName("What's Next? (2026 Edition) #1: Deep-Dive!"),
      ).toBe("what-s-next-2026-edition-1-deep-dive");
    });

    test("collapses consecutive dashes and removes leading/trailing dashes", () => {
      expect(sanitizeFileName("---Research---Summary---")).toBe(
        "research-summary",
      );
    });

    test("falls back to untitled-session when empty or symbols only", () => {
      expect(sanitizeFileName("")).toBe("untitled-session");
      expect(sanitizeFileName("   ")).toBe("untitled-session");
      expect(sanitizeFileName("???///:::***")).toBe("untitled-session");
    });
  });

  describe("exportSessionAsMarkdown", () => {
    test("formats session title, export date, and studio mode in header", () => {
      const session: Session = {
        id: "sess-1",
        title: "Agentic AI Architecture Evaluation",
        mode: "research",
        createdAt: "2026-10-28T12:00:00.000Z",
        updatedAt: "2026-10-28T12:30:00.000Z",
        messages: [],
      };

      const md = exportSessionAsMarkdown(session);
      expect(md).toContain("# Agentic AI Architecture Evaluation");
      expect(md).toContain("*Exported from Nova on");
      expect(md).toContain("**Mode:** `research`");
      expect(md).toContain("*No messages in this session.*");
    });

    test("formats user message with prompt query and file attachments", () => {
      const userMsg: ChatMessage = {
        id: "msg-user-1",
        role: "user",
        content: "Please analyze our architecture diagram and benchmark data.",
        timestamp: "12:00:01",
        attachments: [
          {
            id: "att-1",
            name: "architecture.png",
            size: 2048576,
            type: "image/png",
            content: "data:image/png;base64,mock",
          },
          {
            id: "att-2",
            name: "benchmarks.csv",
            size: 1536,
            type: "text/csv",
            content: "metric,val",
          },
        ],
      };

      const session: Session = {
        id: "sess-2",
        title: "Architecture Review",
        mode: "research",
        createdAt: "2026-10-28T12:00:00.000Z",
        updatedAt: "2026-10-28T12:30:00.000Z",
        messages: [userMsg],
      };

      const md = exportSessionAsMarkdown(session);
      expect(md).toContain("### 👤 User (12:00:01)");
      expect(md).toContain(
        "Please analyze our architecture diagram and benchmark data.",
      );
      expect(md).toContain("**Attachments:**");
      expect(md).toContain("- `architecture.png` (2.0 MB, `image/png`)");
      expect(md).toContain("- `benchmarks.csv` (1.5 KB, `text/csv`)");
    });

    test("formats assistant message with research report, key findings, citations, and recommendations", () => {
      const assistantMsg: ChatMessage = {
        id: "msg-asst-1",
        role: "assistant",
        content:
          "I completed an in-depth empirical comparison of the runtime engines.",
        timestamp: "12:00:05",
        artifact: {
          type: "research",
          data: {
            title: "Bun vs Node.js Production Readiness",
            executiveSummary:
              "Bun achieves 3x lower startup latency while Node.js retains broader ecosystem depth.",
            keyFindings: [
              {
                point: "Startup Latency",
                description:
                  "Bun starts HTTP listeners in 12ms compared to 42ms for Node.js.",
                confidence: "high",
                citationIds: ["src-1"],
              },
              {
                point: "Native TypeScript",
                description:
                  "Bun executes TS files directly without ahead-of-time build steps.",
                confidence: "high",
                citationIds: ["src-2"],
              },
            ],
            sources: [
              {
                id: "src-1",
                title: "Bun Documentation & Benchmarks",
                url: "https://bun.sh/docs",
                domain: "bun.sh",
                snippet: "Fast all-in-one JavaScript runtime",
                relevanceScore: 98,
              },
              {
                id: "src-2",
                title: "Node.js v22 Release Notes",
                url: "https://nodejs.org/en/blog/release/v22.0.0",
                domain: "nodejs.org",
                snippet: "V8 engine upgrade and experimental TS support",
                relevanceScore: 92,
              },
            ],
            contradictionsAndRisks: [
              "Certain native C++ V8 addons are not 100% compatible with JavaScriptCore.",
            ],
            recommendation:
              "Adopt Bun for CLI tools, background workers, and SSR frontends immediately.",
          },
        },
      };

      const session: Session = {
        id: "sess-3",
        title: "Runtime Comparison",
        mode: "research",
        createdAt: "2026-10-28T12:00:00.000Z",
        updatedAt: "2026-10-28T12:30:00.000Z",
        messages: [assistantMsg],
      };

      const md = exportSessionAsMarkdown(session);
      expect(md).toContain("### 🤖 Nova (12:00:05)");
      expect(md).toContain(
        "I completed an in-depth empirical comparison of the runtime engines.",
      );
      expect(md).toContain(
        "#### 📑 Research Report: Bun vs Node.js Production Readiness",
      );
      expect(md).toContain(
        "> Bun achieves 3x lower startup latency while Node.js retains broader ecosystem depth.",
      );
      expect(md).toContain("**Key Findings:**");
      expect(md).toContain(
        "- **Startup Latency**: Bun starts HTTP listeners in 12ms compared to 42ms for Node.js. *(Confidence: high)*",
      );
      expect(md).toContain(
        "- **Native TypeScript**: Bun executes TS files directly without ahead-of-time build steps. *(Confidence: high)*",
      );
      expect(md).toContain("**Sources:**");
      expect(md).toContain(
        "1. [Bun Documentation & Benchmarks](https://bun.sh/docs) — *bun.sh*",
      );
      expect(md).toContain(
        "2. [Node.js v22 Release Notes](https://nodejs.org/en/blog/release/v22.0.0) — *nodejs.org*",
      );
      expect(md).toContain("**Contradictions & Risks:**");
      expect(md).toContain(
        "- Certain native C++ V8 addons are not 100% compatible with JavaScriptCore.",
      );
      expect(md).toContain(
        "**Recommendation:**\nAdopt Bun for CLI tools, background workers, and SSR frontends immediately.",
      );
    });

    test("formats goal plan, decision matrix, chart, and code artifacts", () => {
      const planMsg: ChatMessage = {
        id: "msg-plan",
        role: "assistant",
        content: "Here is your implementation plan.",
        timestamp: "12:01:00",
        artifact: {
          type: "plan",
          data: {
            goal: "Migrate API Gateway",
            timeframe: "3 Weeks",
            overview: "Zero-downtime transition to the new gateway.",
            phases: [
              {
                id: "ph-1",
                phaseNumber: 1,
                phaseName: "Canary Deployment",
                summary: "Route 5% traffic to Bun service",
                status: "active",
                tasks: [
                  {
                    id: "t-1",
                    title: "Deploy shadow container",
                    description: "Stand up container on port 8080",
                    status: "completed",
                    actionableOutput: "Container healthy",
                  },
                  {
                    id: "t-2",
                    title: "Compare latency logs",
                    description: "Ensure p99 is under 50ms",
                    status: "todo",
                  },
                ],
              },
            ],
            keySuccessMetrics: ["Zero 5xx errors", "p99 < 50ms"],
          },
        },
      };

      const matrixMsg: ChatMessage = {
        id: "msg-matrix",
        role: "assistant",
        content: "Here is the comparison matrix.",
        timestamp: "12:02:00",
        artifact: {
          type: "matrix",
          data: {
            topic: "Database Engine Selection",
            criteria: [{ id: "c1", name: "Speed", weight: 0.6 }],
            options: [
              {
                id: "opt-1",
                name: "PostgreSQL",
                scores: { c1: 9 },
                pros: ["Battle-tested", "Extensible"],
                cons: ["Heavyweight"],
                totalWeightedScore: 9.1,
              },
            ],
            verdict: "PostgreSQL is recommended for relational integrity.",
          },
        },
      };

      const codeMsg: ChatMessage = {
        id: "msg-code",
        role: "assistant",
        content: "Here is the gateway script.",
        timestamp: "12:03:00",
        artifact: {
          type: "code",
          data: {
            language: "typescript",
            filename: "gateway.ts",
            code: 'console.log("Gateway ready");',
            explanation: "Minimal standalone entry point.",
          },
        },
      };

      const session: Session = {
        id: "sess-multi",
        title: "Multi-artifact Session",
        mode: "planner",
        createdAt: "2026-10-28T12:00:00.000Z",
        updatedAt: "2026-10-28T12:30:00.000Z",
        messages: [planMsg, matrixMsg, codeMsg],
      };

      const md = exportSessionAsMarkdown(session);
      expect(md).toContain("#### 🎯 Goal Plan: Migrate API Gateway");
      expect(md).toContain("##### Phase 1: Canary Deployment");
      expect(md).toContain(
        "- [x] **Deploy shadow container**: Stand up container on port 8080 *(Output: Container healthy)*",
      );
      expect(md).toContain(
        "- [ ] **Compare latency logs**: Ensure p99 is under 50ms",
      );
      expect(md).toContain("- Zero 5xx errors");

      expect(md).toContain(
        "#### ⚖️ Decision Matrix: Database Engine Selection",
      );
      expect(md).toContain(
        "| **PostgreSQL** | 9.1 | Battle-tested; Extensible | Heavyweight |",
      );
      expect(md).toContain(
        "**Verdict:** PostgreSQL is recommended for relational integrity.",
      );

      expect(md).toContain("#### 💻 Code Artifact: `gateway.ts`");
      expect(md).toContain('```typescript\nconsole.log("Gateway ready");\n```');
      expect(md).toContain("*Explanation:* Minimal standalone entry point.");
    });

    test("formats chart and multi-agent debate artifacts", () => {
      const chartMsg: ChatMessage = {
        id: "msg-chart",
        role: "assistant",
        content: "Here are the benchmark results.",
        timestamp: "12:04:00",
        artifact: {
          type: "chart",
          data: {
            title: "Startup Latency (ms)",
            type: "bar",
            xAxisKey: "Runtime",
            data: [
              { label: "Bun", value: 12 },
              { label: "Node.js", value: 42 },
            ],
            insight: "Bun boots 3.5x faster.",
            takeaways: ["Lower cold start in serverless"],
          },
        },
      };

      const debateMsg: ChatMessage = {
        id: "msg-debate",
        role: "assistant",
        content: "Here is the debate summary.",
        timestamp: "12:05:00",
        artifact: {
          type: "debate",
          data: {
            topic: "Serverless vs Containers",
            consensusSummary:
              "Use containers for long-running stateful services.",
            perspectives: [
              {
                agentName: "Cloud Architect",
                stance: "Advocate",
                avatarColor: "teal",
                arguments: ["Zero idle compute cost"],
                caveats: ["Cold start latency spikes"],
              },
            ],
            synthesisVerdict: "Containers are preferred for Nova.",
          },
        },
      };

      const session: Session = {
        id: "sess-debate",
        title: "Architecture Debate",
        mode: "debate",
        createdAt: "2026-10-28T12:00:00.000Z",
        updatedAt: "2026-10-28T12:30:00.000Z",
        messages: [chartMsg, debateMsg],
      };

      const md = exportSessionAsMarkdown(session);
      expect(md).toContain("#### 📊 Chart: Startup Latency (ms) (bar)");
      expect(md).toContain("*Insight:* Bun boots 3.5x faster.");
      expect(md).toContain("| Runtime | Value |");
      expect(md).toContain("| Bun | 12 |");
      expect(md).toContain("- Lower cold start in serverless");

      expect(md).toContain(
        "#### 🎙️ Multi-Agent Debate: Serverless vs Containers",
      );
      expect(md).toContain(
        "> Use containers for long-running stateful services.",
      );
      expect(md).toContain("##### Cloud Architect (Advocate)");
      expect(md).toContain("- Zero idle compute cost");
      expect(md).toContain("- Cold start latency spikes");
      expect(md).toContain(
        "**Synthesis Verdict:** Containers are preferred for Nova.",
      );
    });
  });

  describe("validateSessionBackup", () => {
    test("accepts a valid single session backup object", () => {
      const validSession: Session = {
        id: "single-1",
        title: "Single Session Backup",
        mode: "research",
        createdAt: "2026-10-28T10:00:00.000Z",
        updatedAt: "2026-10-28T10:15:00.000Z",
        messages: [
          {
            id: "m-1",
            role: "user",
            content: "What is Next.js 15?",
            timestamp: "10:00:01",
          },
          {
            id: "m-2",
            role: "assistant",
            content: "Next.js 15 features React 19 support.",
            timestamp: "10:00:05",
          },
        ],
      };

      const result = validateSessionBackup(validSession);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.sessions.length).toBe(1);
        expect(result.sessions[0].id).toBe("single-1");
        expect(result.sessions[0].title).toBe("Single Session Backup");
        expect(result.sessions[0].messages.length).toBe(2);
      }
    });

    test("accepts a valid wrapped multi-session backup container", () => {
      const backupContainer = {
        version: 1,
        exportedAt: "2026-10-28T11:00:00.000Z",
        sessions: [
          {
            id: "s-1",
            title: "First Workspace",
            mode: "planner",
            createdAt: "2026-10-28T09:00:00.000Z",
            updatedAt: "2026-10-28T09:30:00.000Z",
            messages: [
              {
                id: "msg-1",
                role: "user",
                content: "Plan sprint",
                timestamp: "09:01:00",
              },
            ],
          },
          {
            id: "s-2",
            title: "Second Workspace",
            mode: "coder",
            createdAt: "2026-10-28T10:00:00.000Z",
            updatedAt: "2026-10-28T10:30:00.000Z",
            messages: [
              {
                id: "msg-2",
                role: "assistant",
                content: "Done code",
                timestamp: "10:01:00",
              },
            ],
          },
        ],
      };

      const result = validateSessionBackup(backupContainer);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.sessions.length).toBe(2);
        expect(result.sessions[0].title).toBe("First Workspace");
        expect(result.sessions[1].title).toBe("Second Workspace");
      }
    });

    test("accepts a raw array of valid sessions", () => {
      const rawArray = [
        {
          id: "arr-1",
          title: "Array Session",
          mode: "research",
          createdAt: "2026-10-28T08:00:00.000Z",
          updatedAt: "2026-10-28T08:10:00.000Z",
          messages: [],
        },
      ];

      const result = validateSessionBackup(rawArray);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.sessions.length).toBe(1);
        expect(result.sessions[0].id).toBe("arr-1");
      }
    });

    test("rejects non-object or null root payloads", () => {
      expect(validateSessionBackup(null).valid).toBe(false);
      expect(validateSessionBackup(undefined).valid).toBe(false);
      expect(validateSessionBackup("string data").valid).toBe(false);
      expect(validateSessionBackup(12345).valid).toBe(false);
      expect(validateSessionBackup(true).valid).toBe(false);
    });

    test("rejects empty sessions array or empty backup object", () => {
      expect(validateSessionBackup([]).valid).toBe(false);
      expect(validateSessionBackup({ sessions: [] }).valid).toBe(false);
      expect(validateSessionBackup({}).valid).toBe(false);
    });

    test("rejects sessions missing required fields (id, title, messages)", () => {
      const missingId = {
        title: "No ID",
        messages: [],
      };
      expect(validateSessionBackup(missingId).valid).toBe(false);

      const missingTitle = {
        id: "id-1",
        messages: [],
      };
      expect(validateSessionBackup(missingTitle).valid).toBe(false);

      const missingMessages = {
        id: "id-1",
        title: "No Messages",
      };
      expect(validateSessionBackup(missingMessages).valid).toBe(false);
    });

    test("rejects sessions with invalid types for required fields", () => {
      const invalidId = {
        id: 12345,
        title: "Number ID",
        messages: [],
      };
      expect(validateSessionBackup(invalidId).valid).toBe(false);

      const invalidTitle = {
        id: "id-1",
        title: { text: "Title" },
        messages: [],
      };
      expect(validateSessionBackup(invalidTitle).valid).toBe(false);

      const invalidMessagesType = {
        id: "id-1",
        title: "Test",
        messages: "not-an-array",
      };
      expect(validateSessionBackup(invalidMessagesType).valid).toBe(false);
    });

    test("rejects session messages with invalid role or missing content", () => {
      const invalidRole = {
        id: "sess-bad-role",
        title: "Bad Role",
        messages: [
          {
            id: "m-1",
            role: "superuser",
            content: "Hello",
          },
        ],
      };
      const res1 = validateSessionBackup(invalidRole);
      expect(res1.valid).toBe(false);
      if (!res1.valid) {
        expect(res1.error).toContain("invalid role");
      }

      const missingContent = {
        id: "sess-bad-content",
        title: "Bad Content",
        messages: [
          {
            id: "m-1",
            role: "user",
          },
        ],
      };
      const res2 = validateSessionBackup(missingContent);
      expect(res2.valid).toBe(false);
    });

    test("rejects prototype pollution attempts", () => {
      const maliciousPayload = JSON.parse(
        '{"__proto__": {"admin": true}, "id": "s1", "title": "Attack", "messages": []}',
      );
      const res = validateSessionBackup(maliciousPayload);
      expect(res.valid).toBe(false);
    });

    test("normalizes missing timestamps and whitespace in session id/title", () => {
      const input = {
        id: "  trimmed-id  ",
        title: "  Trimmed Title  ",
        mode: "unknown_mode_falls_back",
        messages: [
          {
            id: "  m-1  ",
            role: "user",
            content: "Hello",
          },
        ],
      };
      const res = validateSessionBackup(input);
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.sessions[0].id).toBe("trimmed-id");
        expect(res.sessions[0].title).toBe("Trimmed Title");
        expect(res.sessions[0].mode).toBe("research");
        expect(res.sessions[0].messages[0].id).toBe("m-1");
        expect(res.sessions[0].createdAt).toBeDefined();
        expect(res.sessions[0].updatedAt).toBeDefined();
      }
    });
  });

  describe("Browser Export Helpers (Non-browser environment resilience)", () => {
    const mockSession: Session = {
      id: "sess-resilience",
      title: "Resilience Test",
      mode: "research",
      createdAt: "2026-10-28T12:00:00.000Z",
      updatedAt: "2026-10-28T12:00:00.000Z",
      messages: [],
    };

    test("exportSessionAsJson runs without crashing when window is undefined", () => {
      expect(() => exportSessionAsJson(mockSession)).not.toThrow();
    });

    test("exportAllSessionsAsJson runs without crashing when window is undefined", () => {
      expect(() => exportAllSessionsAsJson([mockSession])).not.toThrow();
    });

    test("downloadSessionMarkdown runs without crashing when window is undefined", () => {
      expect(() => downloadSessionMarkdown(mockSession)).not.toThrow();
    });

    test("copySessionMarkdownToClipboard returns false safely when navigator.clipboard is unavailable", async () => {
      const result = await copySessionMarkdownToClipboard(mockSession);
      expect(result).toBe(false);
    });
  });
});
