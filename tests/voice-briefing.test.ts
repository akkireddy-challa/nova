import { describe, it, expect } from "bun:test";
import fs from "fs";
import path from "path";
import {
  estimateSpeechDurationMs,
  formatDurationTimestamp,
  formatVttTimestamp,
  generateDeterministicWaveform,
  synthesizeNarrationChapters,
  generateAudioBriefing,
  audioBriefingToCsv,
  audioBriefingToVtt,
  audioBriefingToMarkdown,
} from "@/lib/audio/voice-briefing";
import type {
  ResearchReport,
  PersonaCouncilArtifact,
  ResilienceSimulationArtifact,
} from "@/lib/types";

describe("Voice Briefing Engine & Speech Synthesis Module", () => {
  describe("estimateSpeechDurationMs", () => {
    it("returns 0 for empty or whitespace text", () => {
      expect(estimateSpeechDurationMs("")).toBe(0);
      expect(estimateSpeechDurationMs("   \n\t  ")).toBe(0);
    });

    it("calculates exact millisecond duration at standard 150 WPM", () => {
      // 150 words at 150 WPM = exactly 1 minute = 60,000 ms
      const words150 = Array(150).fill("word").join(" ");
      expect(estimateSpeechDurationMs(words150)).toBe(60000);

      // 75 words = 30,000 ms
      const words75 = Array(75).fill("token").join(" ");
      expect(estimateSpeechDurationMs(words75)).toBe(30000);
    });

    it("respects custom wordsPerMinute speeds", () => {
      const words = Array(100).fill("data").join(" ");
      // At 200 WPM, 100 words = 0.5 minutes = 30,000 ms
      expect(estimateSpeechDurationMs(words, 200)).toBe(30000);
      // At 100 WPM, 100 words = 1.0 minutes = 60,000 ms
      expect(estimateSpeechDurationMs(words, 100)).toBe(60000);
    });
  });

  describe("formatDurationTimestamp & formatVttTimestamp", () => {
    it("formats duration milliseconds into standard MM:SS clock strings", () => {
      expect(formatDurationTimestamp(0)).toBe("00:00");
      expect(formatDurationTimestamp(5000)).toBe("00:05");
      expect(formatDurationTimestamp(65000)).toBe("01:05");
      expect(formatDurationTimestamp(3665000)).toBe("01:01:05"); // > 1 hour
    });

    it("formats milliseconds into standard WebVTT subtitle timestamps", () => {
      expect(formatVttTimestamp(0)).toBe("00:00:00.000");
      expect(formatVttTimestamp(5200)).toBe("00:00:05.200");
      expect(formatVttTimestamp(65450)).toBe("00:01:05.450");
      expect(formatVttTimestamp(3665123)).toBe("01:01:05.123");
    });
  });

  describe("generateDeterministicWaveform", () => {
    const sampleChapters = synthesizeNarrationChapters(
      "Distributed Database Consensus",
    );

    it("generates exactly requested bar count within valid bounds", () => {
      const bars = generateDeterministicWaveform(sampleChapters, 48);
      expect(bars.length).toBe(48);

      for (const bar of bars) {
        expect(bar.heightPct).toBeGreaterThanOrEqual(15);
        expect(bar.heightPct).toBeLessThanOrEqual(100);
        expect(["low", "medium", "high"]).toContain(bar.energyLevel);
      }
    });

    it("is 100% deterministic and reproducible across multiple invocations", () => {
      const runA = generateDeterministicWaveform(sampleChapters, 32);
      const runB = generateDeterministicWaveform(sampleChapters, 32);

      expect(runA).toEqual(runB);
      expect(runA[0].heightPct).toBe(runB[0].heightPct);
      expect(runA[15].heightPct).toBe(runB[15].heightPct);
    });
  });

  describe("synthesizeNarrationChapters across Artifact Types", () => {
    it("synthesizes 4 structured chapters for research reports", () => {
      const research: ResearchReport = {
        title: "Autonomous Agent Architectures in 2026",
        executiveSummary:
          "Multi-agent systems outperform monolithic LLMs on complex tasks.",
        keyFindings: [
          {
            point: "Orchestrator-worker topologies reduce token churn by 42%",
            description: "Targeted subagents restrict context leakage.",
            confidence: "high",
            citationIds: [],
          },
        ],
        contradictionsAndRisks: [
          "Recursive subagent spawns risk unbounded execution loops.",
        ],
        recommendation:
          "Deploy depth-capped DAG orchestrators with explicit timeouts.",
        sources: [],
      };

      const chapters = synthesizeNarrationChapters(research);
      expect(chapters.length).toBe(4);
      expect(chapters[0].title).toContain("Executive Overview");
      expect(chapters[1].title).toContain("Empirical Findings");
      expect(chapters[2].title).toContain("Critical Risks");
      expect(chapters[3].title).toContain("Strategic Recommendation");

      // Verify sequential timestamps
      expect(chapters[0].startTimeMs).toBe(0);
      expect(chapters[1].startTimeMs).toBe(chapters[0].endTimeMs);
      expect(chapters[2].startTimeMs).toBe(chapters[1].endTimeMs);
      expect(chapters[3].startTimeMs).toBe(chapters[2].endTimeMs);
    });

    it("synthesizes chapters for executive persona council artifacts", () => {
      const council: PersonaCouncilArtifact = {
        topic: "Migrating from PostgreSQL to Spanner",
        alignmentIndex: 82,
        meanScore: 84,
        councilVerdict: "conditional_consensus",
        verdictSummary:
          "Strong technical consensus with FinOps budget guardrails.",
        reviews: [
          {
            personaId: "tech-architect",
            personaName: "Tech Architect",
            roleTitle: "Staff Systems Architect",
            avatarIcon: "Cpu",
            score: 90,
            grade: "A",
            verdict: "approve",
            coreEndorsement: "Zero-maintenance multi-region consistency.",
            criticalObjections: [],
            nonNegotiables: ["Maintain sub-10ms P95 query latency"],
            criteriaScores: [],
          },
        ],
        fatalBlindspots: [
          {
            dimension: "Cost Governance",
            flaggedBy: "FinOps Lead",
            severity: "critical",
            risk: "Idle node provisioning costs $1,500/mo baseline",
            mitigation: "Autoscale node count during off-peak hours",
          },
        ],
        actionItems: [
          "Deploy pilot benchmark cluster",
          "Implement FinOps cost alert",
        ],
        strategicCompromise:
          "Start with 3-node regional instance before global rollout.",
        generatedAt: "2026-10-29T12:00:00.000Z",
      };

      const chapters = synthesizeNarrationChapters(council);
      expect(chapters.length).toBeGreaterThanOrEqual(3);
      expect(chapters[0].title).toContain("Council Alignment");
      expect(chapters[0].speaker).toBe("Council Lead");
      expect(chapters.some((c) => c.title.includes("Fatal Blindspots"))).toBe(
        true,
      );
    });

    it("synthesizes chapters for resilience chaos simulation artifacts", () => {
      const sim: ResilienceSimulationArtifact = {
        id: "sim-1",
        title: "Database Failover Stress Test",
        description: "Partitioning primary database under 2000 RPS surge.",
        totalSteps: 25,
        baselineRps: 2000,
        summary: {
          scenarioName: "Database Failover",
          resilienceScore: 78,
          peakP99LatencyMs: 340,
          maxErrorRatePct: 12.5,
          recoveryTimeSteps: 4,
          cascadingFailureRisk: "moderate",
          bottleneckDiagnosis:
            "Connection pool exhaustion on secondary replica.",
          hardeningRecommendations: [
            "Increase connection pool limits",
            "Enable aggressive circuit breaker tripping",
          ],
        },
        telemetrySeries: [],
        activeInjections: [],
        generatedAt: "2026-10-29T12:00:00.000Z",
      };

      const chapters = synthesizeNarrationChapters(sim);
      expect(chapters.length).toBe(3);
      expect(chapters[0].title).toContain("Chaos Scenario");
      expect(chapters[1].title).toContain("Traffic Surges");
      expect(chapters[2].title).toContain("Failure Diagnosis");
    });
  });

  describe("generateAudioBriefing Full Pipeline", () => {
    it("compiles complete briefing artifact with script, waveform, and duration", () => {
      const briefing = generateAudioBriefing(
        "Zero-Downtime Multi-Cloud Deployments",
      );

      expect(briefing.title).toContain("Zero-Downtime Multi-Cloud Deployments");
      expect(briefing.totalDurationMs).toBeGreaterThan(0);
      expect(briefing.totalWordCount).toBeGreaterThan(0);
      expect(briefing.chapters.length).toBe(3);
      expect(briefing.waveform.length).toBe(48);
      expect(briefing.fullNarrationScript).toContain("Chapter 1");
      expect(briefing.fullNarrationScript).toContain("Chapter 2");
      expect(briefing.fullNarrationScript).toContain("Chapter 3");
    });
  });

  describe("RFC 4180 CSV, WebVTT, and Markdown Exports", () => {
    const briefing = generateAudioBriefing("High-Throughput Streaming Engine");

    it("exports compliant RFC 4180 CSV with CRLF endings", () => {
      const csv = audioBriefingToCsv(briefing);
      expect(csv).toContain(
        "Chapter,StartTimeMs,EndTimeMs,StartTime,EndTime,Speaker,Title,WordCount,Script",
      );
      expect(csv).toContain("\r\n");
      const lines = csv.split("\r\n");
      expect(lines.length).toBe(briefing.chapters.length + 1);
    });

    it("exports compliant WebVTT subtitle track", () => {
      const vtt = audioBriefingToVtt(briefing);
      expect(vtt.startsWith("WEBVTT")).toBe(true);
      expect(vtt).toContain("-->");
      expect(vtt).toContain("[Nova Host]");
    });

    it("exports executive Markdown briefing dossier", () => {
      const md = audioBriefingToMarkdown(briefing);
      expect(md).toContain("# 🎙️ Audio Briefing:");
      expect(md).toContain("## Chapter Breakdown & Timeline");
      expect(md).toContain("## Full Narration Script");
      expect(md).toContain("Total Duration:");
    });
  });

  describe("Strict ZERO Math.random() Audit", () => {
    it("ensures voice-briefing.ts contains strictly ZERO Math.random()", () => {
      const source = fs.readFileSync(
        path.join(process.cwd(), "src/lib/audio/voice-briefing.ts"),
        "utf-8",
      );
      expect(source).not.toContain("Math.random()");
      expect(source).not.toContain("Math.random");
    });
  });
});
