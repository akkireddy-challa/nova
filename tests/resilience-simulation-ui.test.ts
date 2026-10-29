import { describe, it, expect } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "fs";
import path from "path";
import { ResilienceSimulationCard } from "@/components/GenerativeCards/ResilienceSimulationCard";
import { runResilienceSimulation } from "@/lib/research/resilience-simulator";
import type { ResilienceSimulationArtifact } from "@/lib/types";

describe("ResilienceSimulationCard Generative UI Component", () => {
  const sampleSim: ResilienceSimulationArtifact = runResilienceSimulation(
    "Primary Kafka Broker Network Partition",
    {
      baselineRps: 1500,
      steps: 25,
    },
  );

  const componentSource = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/components/GenerativeCards/ResilienceSimulationCard.tsx",
    ),
    "utf-8",
  );

  it("renders scenario title, resilience score, and risk badge in the header", () => {
    const html = renderToString(
      React.createElement(ResilienceSimulationCard, {
        simulation: sampleSim,
      }),
    );

    expect(html).toContain("Primary Kafka Broker Network Partition");
    expect(html).toContain("Chaos &amp; Resilience Simulator");
    expect(html).toContain(`${sampleSim.summary.resilienceScore}%`);
    expect(html).toContain("CSV");
    expect(html).toContain("Copy");
  });

  it("renders circuit breaker status pill and time scrubber controls", () => {
    const html = renderToString(
      React.createElement(ResilienceSimulationCard, {
        simulation: sampleSim,
      }),
    );

    expect(html).toContain("Circuit Breaker:");
    expect(html).toContain("Play");
    expect(html).toContain("Step");
    expect(html).toContain("Step 1 / 25 (0s)");
  });

  it("renders real-time telemetry gauges (throughput, latency, error rate, CPU)", () => {
    const html = renderToString(
      React.createElement(ResilienceSimulationCard, {
        simulation: sampleSim,
      }),
    );

    expect(html).toContain("Throughput");
    expect(html).toContain("p99 Latency");
    expect(html).toContain("Error Rate");
    expect(html).toContain("CPU Saturation");
    expect(html).toContain("rps");
    expect(html).toContain("ms");
  });

  it("renders bottleneck diagnosis and architectural hardening recommendations", () => {
    const html = renderToString(
      React.createElement(ResilienceSimulationCard, {
        simulation: sampleSim,
      }),
    );

    expect(html).toContain("Bottleneck &amp; Failure Mode Diagnosis");
    expect(html).toContain("Recommended Architectural Hardening Gates");
    expect(html).toContain(sampleSim.summary.hardeningRecommendations[0]);
  });

  it("strictly enforces ZERO Math.random() in ResilienceSimulationCard source", () => {
    expect(componentSource).not.toContain("Math.random()");
    expect(componentSource).not.toContain("Math.random");
  });
});
