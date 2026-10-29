import { describe, it, expect } from "bun:test";
import fs from "fs";
import path from "path";
import {
  simulateTrafficLoad,
  computeQueueLatency,
  evaluateCircuitBreakerState,
  calculateResilienceScore,
  runResilienceSimulation,
  simulationToCsv,
  simulationToMarkdown,
  PRESET_CHAOS_INJECTIONS,
  type ChaosInjectionOption,
} from "@/lib/research/resilience-simulator";

describe("Discrete Event Resilience & Chaos Simulator Engine", () => {
  describe("simulateTrafficLoad Deterministic Calculations", () => {
    it("computes baseline load curve with smooth diurnal variation", () => {
      const step1 = simulateTrafficLoad(1000, 1, 25);
      const step13 = simulateTrafficLoad(1000, 13, 25);
      const step25 = simulateTrafficLoad(1000, 25, 25);

      expect(step1).toBeGreaterThanOrEqual(950);
      expect(step13).toBeGreaterThan(step1); // Peak of sine wave mid-day
      expect(step25).toBeGreaterThanOrEqual(950);
    });

    it("applies critical traffic spike surge multiplier during active injection", () => {
      const injection: ChaosInjectionOption = {
        id: "spike",
        name: "Traffic Surge",
        description: "10x surge",
        category: "traffic_spike",
        severity: "critical",
        triggerStep: 5,
        durationSteps: 3,
      };

      const beforeSpike = simulateTrafficLoad(1000, 4, 25, injection);
      const duringSpike = simulateTrafficLoad(1000, 6, 25, injection);
      const afterSpike = simulateTrafficLoad(1000, 9, 25, injection);

      expect(duringSpike).toBe(4500); // 4.5x multiplier
      expect(beforeSpike).toBeLessThan(1200);
      expect(afterSpike).toBeLessThan(1200);
    });

    it("handles zero or negative baseline RPS safely", () => {
      expect(simulateTrafficLoad(0, 1, 25)).toBe(0);
      expect(simulateTrafficLoad(-500, 1, 25)).toBe(0);
    });
  });

  describe("computeQueueLatency Queueing Theory & Little's Law", () => {
    it("returns nominal latency when throughput is well below capacity", () => {
      const latency = computeQueueLatency(500, 1500, 40); // 33% utilization
      expect(latency).toBeGreaterThanOrEqual(40);
      expect(latency).toBeLessThan(60);
    });

    it("escalates latency non-linearly near saturation capacity (85-95%)", () => {
      const latency = computeQueueLatency(1400, 1500, 40); // 93% utilization
      expect(latency).toBeGreaterThan(100);
      expect(latency).toBeLessThan(1000);
    });

    it("exponentially blows out latency under severe overload (>95%)", () => {
      const latency = computeQueueLatency(3000, 1500, 40); // 200% capacity
      expect(latency).toBeGreaterThan(1000);
      expect(latency).toBeLessThanOrEqual(12000);
    });
  });

  describe("evaluateCircuitBreakerState State Machine", () => {
    it("remains closed when error rates are low", () => {
      expect(evaluateCircuitBreakerState(0, 0)).toBe("closed");
      expect(evaluateCircuitBreakerState(4.5, 0)).toBe("closed");
    });

    it("transitions to half_open when error rate rises or first failure occurs", () => {
      expect(evaluateCircuitBreakerState(18.0, 0)).toBe("half_open");
      expect(evaluateCircuitBreakerState(5.0, 1)).toBe("half_open");
    });

    it("trips open under sustained high errors (>=25% for 2+ steps)", () => {
      expect(evaluateCircuitBreakerState(32.0, 2)).toBe("open");
      expect(evaluateCircuitBreakerState(80.0, 5)).toBe("open");
    });
  });

  describe("calculateResilienceScore Formula Precision", () => {
    it("yields 100% on ideal system with zero errors and nominal latency", () => {
      const score = calculateResilienceScore({
        peakLatency: 50,
        maxError: 0,
        recoverySteps: 0,
        circuitBreakerTripped: false,
      });
      expect(score).toBe(100);
    });

    it("penalizes latency blowouts and error rate peaks deterministically", () => {
      const score = calculateResilienceScore({
        peakLatency: 2500,
        maxError: 45,
        recoverySteps: 5,
        circuitBreakerTripped: true,
      });
      expect(score).toBeLessThan(50);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe("runResilienceSimulation Full Execution", () => {
    it("runs complete 25-step simulation and generates valid artifact", () => {
      const sim = runResilienceSimulation("ClickHouse CDC Replay Stress Test", {
        baselineRps: 2000,
        steps: 25,
      });

      expect(sim.title).toBe("ClickHouse CDC Replay Stress Test");
      expect(sim.totalSteps).toBe(25);
      expect(sim.telemetrySeries.length).toBe(25);
      expect(sim.summary.resilienceScore).toBeGreaterThanOrEqual(0);
      expect(sim.summary.resilienceScore).toBeLessThanOrEqual(100);
      expect(sim.summary.bottleneckDiagnosis.length).toBeGreaterThan(10);
      expect(
        sim.summary.hardeningRecommendations.length,
      ).toBeGreaterThanOrEqual(3);
    });

    it("produces 100% deterministic and reproducible results across runs", () => {
      const runA = runResilienceSimulation("Deterministic Verification");
      const runB = runResilienceSimulation("Deterministic Verification");

      expect(runA.summary.resilienceScore).toBe(runB.summary.resilienceScore);
      expect(runA.summary.peakP99LatencyMs).toBe(runB.summary.peakP99LatencyMs);
      expect(runA.summary.maxErrorRatePct).toBe(runB.summary.maxErrorRatePct);
      expect(runA.telemetrySeries[10].throughputRps).toBe(
        runB.telemetrySeries[10].throughputRps,
      );
    });
  });

  describe("Preset Chaos Injections", () => {
    it("exports well-structured chaos presets with valid steps and impacts", () => {
      expect(PRESET_CHAOS_INJECTIONS.length).toBeGreaterThan(0);
      for (const preset of PRESET_CHAOS_INJECTIONS) {
        expect(preset.id).toBeDefined();
        expect(preset.name.length).toBeGreaterThan(0);
        expect(preset.triggerStep).toBeGreaterThanOrEqual(1);
        expect(preset.durationSteps).toBeGreaterThanOrEqual(1);
        expect(preset.severity).toBeDefined();
        expect(preset.category).toBeDefined();
      }
    });
  });

  describe("RFC 4180 CSV Export & Markdown Briefing", () => {
    const sim = runResilienceSimulation("Payment Gateway Outage Simulation");

    it("exports telemetry to compliant RFC 4180 CSV", () => {
      const csv = simulationToCsv(sim);
      expect(csv).toContain(
        "Step,TimeSeconds,ThroughputRps,LatencyP99Ms,ErrorRatePct,CpuSaturationPct,CircuitBreaker,Incident",
      );
      expect(csv).toContain("\r\n");
      const lines = csv.split("\r\n");
      expect(lines.length).toBe(sim.telemetrySeries.length + 1);
    });

    it("exports executive briefing to Markdown format", () => {
      const md = simulationToMarkdown(sim);
      expect(md).toContain("# Resilience & Chaos Stress-Test Simulation:");
      expect(md).toContain("## Bottleneck & Failure Mode Diagnosis");
      expect(md).toContain("## Configured Chaos Injections");
      expect(md).toContain("## Architectural Hardening Recommendations");
    });
  });

  describe("Strict ZERO Math.random() Audit", () => {
    it("ensures resilience-simulator.ts contains strictly ZERO Math.random()", () => {
      const source = fs.readFileSync(
        path.join(process.cwd(), "src/lib/research/resilience-simulator.ts"),
        "utf-8",
      );
      expect(source).not.toContain("Math.random()");
      expect(source).not.toContain("Math.random");
    });
  });
});
