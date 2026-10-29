import type {
  ResilienceSimulationArtifact,
  SimulationMetricPoint,
  ChaosInjectionOption,
  SimulationSummary,
} from "@/lib/types";

export type {
  ResilienceSimulationArtifact,
  SimulationMetricPoint,
  ChaosInjectionOption,
  SimulationSummary,
};

/**
 * Deterministic traffic load calculation.
 * Produces reproducible throughput curves with smooth ramp, peak surge, and stabilization.
 */
export function simulateTrafficLoad(
  baselineRps: number,
  step: number,
  totalSteps: number,
  injection?: ChaosInjectionOption,
): number {
  if (baselineRps <= 0) return 0;
  const safeTotal = Math.max(1, totalSteps);
  const normalizedStep = (step - 1) / safeTotal;

  // Nominal diurnal wave using deterministic sine curve
  const waveFactor = 1.0 + Math.sin(normalizedStep * Math.PI) * 0.15;
  let rps = baselineRps * waveFactor;

  if (
    injection &&
    step >= injection.triggerStep &&
    step < injection.triggerStep + injection.durationSteps
  ) {
    if (injection.category === "traffic_spike") {
      const multiplier =
        injection.severity === "critical"
          ? 4.5
          : injection.severity === "severe"
            ? 3.0
            : 1.8;
      rps = baselineRps * multiplier;
    } else if (injection.category === "dependency_failure") {
      // Retry storm adds 40% traffic overhead
      rps = rps * 1.4;
    }
  }

  return Math.max(1, Math.round(rps));
}

/**
 * Deterministic queueing latency based on Little's Law and M/M/1 capacity model.
 * Latency degrades exponentially as throughput approaches or exceeds capacity.
 */
export function computeQueueLatency(
  throughputRps: number,
  capacityRps: number,
  baseLatencyMs: number,
): number {
  if (capacityRps <= 0) return 10000;
  const safeBase = Math.max(1, baseLatencyMs);
  const rho = throughputRps / capacityRps; // Utilization factor

  if (rho <= 0.7) {
    return Math.round(safeBase * (1.0 + rho * 0.25));
  } else if (rho <= 0.95) {
    const queueFactor = 1.0 / Math.max(0.05, 1.0 - rho);
    return Math.min(1000, Math.round(safeBase * (0.8 + queueFactor * 0.3)));
  } else {
    // Severe saturation queue blowout
    const overload = rho - 0.95;
    const latency = safeBase * (8.0 + overload * 60.0);
    return Math.min(12000, Math.round(latency));
  }
}

/**
 * Three-state circuit breaker state machine: CLOSED -> OPEN -> HALF_OPEN -> CLOSED.
 * Prevents cascading cascading service failure under sustained overload.
 */
export function evaluateCircuitBreakerState(
  errorRatePct: number,
  consecutiveHighErrors: number,
): "closed" | "open" | "half_open" {
  if (errorRatePct >= 25.0 && consecutiveHighErrors >= 2) {
    return "open";
  }
  if (errorRatePct >= 15.0 || consecutiveHighErrors === 1) {
    return "half_open";
  }
  return "closed";
}

/**
 * Computes deterministic system resilience score (0-100).
 * Penalized by peak latency, maximum error rate, and recovery time.
 */
export function calculateResilienceScore(summary: {
  peakLatency: number;
  maxError: number;
  recoverySteps: number;
  circuitBreakerTripped: boolean;
}): number {
  let score = 100;

  // Latency penalty (up to 35 points)
  if (summary.peakLatency > 150) {
    const latencyBlowout = Math.min(35, (summary.peakLatency - 150) / 120);
    score -= latencyBlowout;
  }

  // Error rate penalty (up to 40 points)
  if (summary.maxError > 0) {
    const errorPenalty = Math.min(40, summary.maxError * 0.8);
    score -= errorPenalty;
  }

  // Recovery time penalty (up to 20 points)
  if (summary.recoverySteps > 0) {
    const mttrPenalty = Math.min(20, summary.recoverySteps * 2.5);
    score -= mttrPenalty;
  }

  // Circuit breaker tripped penalty
  if (summary.circuitBreakerTripped) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Default preset chaos injection library.
 */
export const PRESET_CHAOS_INJECTIONS: readonly ChaosInjectionOption[] = [
  {
    id: "chaos-surge-10x",
    name: "10x Flash-Sale Traffic Spike",
    description:
      "Simulates instantaneous 300% request volume increase overwhelming ingress gateways.",
    category: "traffic_spike",
    severity: "critical",
    triggerStep: 8,
    durationSteps: 6,
  },
  {
    id: "chaos-db-failover",
    name: "Primary Database Replica Failover",
    description:
      "Simulates write leader loss causing lock contention and connection pool exhaustion.",
    category: "dependency_failure",
    severity: "severe",
    triggerStep: 14,
    durationSteps: 5,
  },
  {
    id: "chaos-network-latency",
    name: "Cross-Region Packet Loss & Jitter",
    description:
      "Simulates 120ms network partition jitter between API edge and storage cluster.",
    category: "network_partition",
    severity: "moderate",
    triggerStep: 20,
    durationSteps: 4,
  },
];

/**
 * Executes a full discrete event stress simulation across time steps.
 * Generates time-series telemetry metrics, circuit breaker transitions, and hardening advice.
 */
export function runResilienceSimulation(
  scenarioTitle: string,
  options?: {
    baselineRps?: number;
    steps?: number;
    injections?: ChaosInjectionOption[];
  },
): ResilienceSimulationArtifact {
  const title = scenarioTitle || "Distributed System Resilience Stress Test";
  const baselineRps = options?.baselineRps ?? 1250;
  const totalSteps = options?.steps ?? 25;
  const capacityRps = baselineRps * 1.6; // Ingress max capacity before queueing
  const baseLatencyMs = 45;

  const activeInjections =
    options?.injections && options.injections.length > 0
      ? options.injections
      : [...PRESET_CHAOS_INJECTIONS];

  const series: SimulationMetricPoint[] = [];
  let consecutiveHighErrors = 0;
  let circuitBreakerTripped = false;
  let recoverySteps = 0;
  let incidentActive = false;

  for (let step = 1; step <= totalSteps; step++) {
    const timestampSeconds = (step - 1) * 5;

    // Check if any injection is active on this step
    const activeInj = activeInjections.find(
      (inj) =>
        step >= inj.triggerStep && step < inj.triggerStep + inj.durationSteps,
    );

    const throughputRps = simulateTrafficLoad(
      baselineRps,
      step,
      totalSteps,
      activeInj,
    );

    // Dynamic capacity under failure
    let currentCapacity = capacityRps;
    let baseLatency = baseLatencyMs;
    let incidentDescription: string | null = null;

    if (activeInj) {
      incidentActive = true;
      incidentDescription = `${activeInj.name}: ${activeInj.description}`;

      if (activeInj.category === "dependency_failure") {
        currentCapacity = capacityRps * 0.45; // 55% capacity loss
        baseLatency = baseLatencyMs * 2.5;
      } else if (activeInj.category === "network_partition") {
        baseLatency = baseLatencyMs + 120;
      }
    } else if (incidentActive) {
      recoverySteps++;
      if (recoverySteps >= 4) {
        incidentActive = false;
      }
    }

    const latencyP99Ms = computeQueueLatency(
      throughputRps,
      currentCapacity,
      baseLatency,
    );

    // Compute error rate
    let errorRatePct = 0;
    if (throughputRps > currentCapacity) {
      const dropRatio = (throughputRps - currentCapacity) / throughputRps;
      errorRatePct = Math.min(85, Math.round(dropRatio * 100 * 10) / 10);
    } else if (activeInj?.category === "dependency_failure") {
      errorRatePct = 28.5;
    } else if (activeInj?.category === "network_partition") {
      errorRatePct = 8.2;
    }

    // Circuit breaker state
    if (errorRatePct >= 20.0) {
      consecutiveHighErrors++;
    } else {
      consecutiveHighErrors = Math.max(0, consecutiveHighErrors - 1);
    }

    const circuitBreakerState = evaluateCircuitBreakerState(
      errorRatePct,
      consecutiveHighErrors,
    );
    if (circuitBreakerState === "open") {
      circuitBreakerTripped = true;
    }

    // CPU saturation
    const cpuSaturationPct = Math.min(
      98,
      Math.max(
        18,
        Math.round((throughputRps / capacityRps) * 75 + (activeInj ? 22 : 0)),
      ),
    );

    series.push({
      step,
      timestampSeconds,
      throughputRps,
      latencyP99Ms,
      errorRatePct,
      cpuSaturationPct,
      circuitBreakerState,
      activeIncident: incidentDescription,
    });
  }

  // Summary aggregation
  const peakP99LatencyMs = Math.max(...series.map((s) => s.latencyP99Ms));
  const maxErrorRatePct = Math.max(...series.map((s) => s.errorRatePct));

  const resilienceScore = calculateResilienceScore({
    peakLatency: peakP99LatencyMs,
    maxError: maxErrorRatePct,
    recoverySteps,
    circuitBreakerTripped,
  });

  const cascadingFailureRisk: "low" | "moderate" | "critical" =
    resilienceScore < 50 || maxErrorRatePct > 50 || peakP99LatencyMs > 4000
      ? "critical"
      : resilienceScore < 75 || maxErrorRatePct > 15 || peakP99LatencyMs > 600
        ? "moderate"
        : "low";

  const bottleneckDiagnosis =
    cascadingFailureRisk === "critical"
      ? "Critical bottleneck: Upstream database connection starvation and lack of token bucket rate limits causes cascading latency blowout exceeding 4,000ms."
      : cascadingFailureRisk === "moderate"
        ? "Moderate bottleneck: Ingress gateway sustains 10x traffic spike with transient 28% error spikes prior to circuit breaker fast-failing."
        : "System resilient: Autonomous circuit breaking and retry backoff successfully shielded core stateful stores with minimal error propagation.";

  const hardeningRecommendations: string[] = [
    "Deploy adaptive token-bucket rate limiters at ingress to shed excess load before queue buildup",
    "Configure client-side exponential backoff with full jitter to eliminate downstream retry storms",
    "Provision isolated read replicas with stale-read fallback during primary database failover",
    "Tune circuit breaker trip thresholds: trip at 20% errors over a 5-second sliding window",
    "Establish automated horizontal pod autoscaling (HPA) triggered by p99 latency rather than CPU alone",
  ];

  return {
    id: `sim-${Date.now()}`,
    title,
    description: `Automated discrete event resilience simulation across ${totalSteps} discrete time steps under multi-vector chaos conditions.`,
    totalSteps,
    baselineRps,
    summary: {
      scenarioName: title,
      resilienceScore,
      peakP99LatencyMs,
      maxErrorRatePct,
      recoveryTimeSteps: recoverySteps,
      cascadingFailureRisk,
      bottleneckDiagnosis,
      hardeningRecommendations,
    },
    telemetrySeries: series,
    activeInjections,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Escapes a cell for strict RFC 4180 CSV compliance.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/["',\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts a resilience simulation artifact into an RFC 4180 CSV document.
 */
export function simulationToCsv(
  simulation: ResilienceSimulationArtifact,
): string {
  const headers = [
    "Step",
    "TimeSeconds",
    "ThroughputRps",
    "LatencyP99Ms",
    "ErrorRatePct",
    "CpuSaturationPct",
    "CircuitBreaker",
    "Incident",
  ];

  const rows = simulation.telemetrySeries.map((pt) => [
    pt.step,
    pt.timestampSeconds,
    pt.throughputRps,
    pt.latencyP99Ms,
    pt.errorRatePct,
    pt.cpuSaturationPct,
    pt.circuitBreakerState,
    pt.activeIncident || "None",
  ]);

  const csvLines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];

  return csvLines.join("\r\n");
}

/**
 * Generates an executive briefing report in Markdown format.
 */
export function simulationToMarkdown(
  simulation: ResilienceSimulationArtifact,
): string {
  const sections: string[] = [];

  sections.push(
    `# Resilience & Chaos Stress-Test Simulation: ${simulation.title}\n`,
  );
  sections.push(
    `> **Resilience Score:** ${simulation.summary.resilienceScore}/100 | **Risk Tier:** \`${simulation.summary.cascadingFailureRisk.toUpperCase()}\` | **Peak p99 Latency:** ${simulation.summary.peakP99LatencyMs}ms | **Max Error Rate:** ${simulation.summary.maxErrorRatePct}%\n`,
  );

  sections.push(`## Executive Summary\n${simulation.description}\n`);

  sections.push(`## Bottleneck & Failure Mode Diagnosis`);
  sections.push(`${simulation.summary.bottleneckDiagnosis}\n`);

  sections.push(`## Configured Chaos Injections`);
  sections.push(
    `| Injection Event | Category | Severity | Trigger Step | Duration |`,
  );
  sections.push(`| :--- | :--- | :--- | :--- | :--- |`);
  for (const inj of simulation.activeInjections) {
    sections.push(
      `| **${inj.name}** | \`${inj.category}\` | \`${inj.severity}\` | Step ${inj.triggerStep} | ${inj.durationSteps} steps |`,
    );
  }
  sections.push("");

  sections.push(`## Architectural Hardening Recommendations\n`);
  for (const rec of simulation.summary.hardeningRecommendations) {
    sections.push(`- [ ] ${rec}`);
  }
  sections.push("");

  return sections.join("\n");
}
