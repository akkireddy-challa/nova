import type {
  GenerativeArtifact,
  ResearchReport,
  PersonaCouncilArtifact,
  ResilienceSimulationArtifact,
  DebateArtifact,
  DecisionMatrix,
  AudioChapterSegment,
  WaveformBar,
  AudioBriefingArtifact,
} from "@/lib/types";

export type NarratableArtifact =
  | GenerativeArtifact
  | ResearchReport
  | PersonaCouncilArtifact
  | ResilienceSimulationArtifact
  | DebateArtifact
  | DecisionMatrix
  | string;

export type { AudioChapterSegment, WaveformBar, AudioBriefingArtifact };

/**
 * Standard speaking speed in words per minute (150 wpm = 2.5 words/sec).
 */
export const DEFAULT_WORDS_PER_MINUTE = 150;

/**
 * Deterministically estimates speech duration in milliseconds.
 * Uses exact word count with configurable words-per-minute rate.
 */
export function estimateSpeechDurationMs(
  text: string,
  wordsPerMinute: number = DEFAULT_WORDS_PER_MINUTE,
): number {
  if (!text || typeof text !== "string") return 0;
  const clean = text.trim();
  if (!clean) return 0;
  const words = clean.split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  const safeWpm = Math.max(50, Math.min(300, wordsPerMinute));
  return Math.round((words / safeWpm) * 60 * 1000);
}

/**
 * Formats a duration in milliseconds into MM:SS or HH:MM:SS timestamp.
 */
export function formatDurationTimestamp(ms: number): string {
  if (!ms || ms <= 0 || !Number.isFinite(ms)) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (hours > 0) {
    const hh = String(hours).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Formats milliseconds into WebVTT timestamp format (00:00:00.000).
 */
export function formatVttTimestamp(ms: number): string {
  if (!ms || ms <= 0 || !Number.isFinite(ms)) return "00:00:00.000";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor(ms % 1000);

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const mmm = String(millis).padStart(3, "0");

  return `${hh}:${mm}:${ss}.${mmm}`;
}

/**
 * Generates deterministic audio waveform bars based on sinusoidal harmonics,
 * chapter content energy, and vocal inflection cues.
 * Strictly ZERO pseudo-random generation.
 */
export function generateDeterministicWaveform(
  chapters: AudioChapterSegment[],
  barCount: number = 48,
): WaveformBar[] {
  const safeBarCount = Math.max(12, Math.min(128, barCount));
  const bars: WaveformBar[] = [];

  // Create seed hash from chapter texts and titles
  let seedHash = 42;
  const combinedText = chapters.map((c) => `${c.title}:${c.text}`).join(" ");
  for (let i = 0; i < combinedText.length; i++) {
    seedHash = (seedHash * 31 + combinedText.charCodeAt(i)) & 0x7fffffff;
  }

  for (let i = 0; i < safeBarCount; i++) {
    const progress = i / (safeBarCount - 1);

    // Multi-harmonic sinusoidal wave for acoustic envelope
    const primaryWave = Math.sin(progress * Math.PI) * 40; // 0 to 40
    const secondaryWave = Math.sin(progress * 3 * Math.PI) * 15; // ripples
    const tertiaryWave = Math.cos(progress * 5 * Math.PI) * 10; // high frequency texture

    // Chapter boundary pulsation
    const chapterProgress =
      (i %
        Math.max(1, Math.floor(safeBarCount / Math.max(1, chapters.length)))) /
      10;
    const inflection = Math.sin(chapterProgress * Math.PI * 2) * 8;

    // Pseudo-deterministic variance from text seed hash
    const hashVariation = ((seedHash >> (i % 16)) & 0xf) - 7; // -7 to +8

    const rawHeight =
      35 +
      primaryWave +
      secondaryWave +
      tertiaryWave +
      inflection +
      hashVariation;
    const clampedHeight = Math.max(15, Math.min(98, Math.round(rawHeight)));

    let energyLevel: "low" | "medium" | "high" = "medium";
    if (clampedHeight >= 70) {
      energyLevel = "high";
    } else if (clampedHeight < 38) {
      energyLevel = "low";
    }

    bars.push({
      index: i,
      heightPct: clampedHeight,
      energyLevel,
    });
  }

  return bars;
}

/**
 * Synthesizes structured audio narration chapters from any generative artifact or topic.
 */
export function synthesizeNarrationChapters(
  artifactOrTopic: NarratableArtifact,
  topicHint?: string,
): AudioChapterSegment[] {
  let artifactType = "generic";
  let data: unknown = artifactOrTopic;

  if (typeof artifactOrTopic === "string") {
    artifactType = "generic";
    data = { title: artifactOrTopic };
  } else if ("type" in artifactOrTopic && "data" in artifactOrTopic) {
    artifactType = artifactOrTopic.type;
    data = artifactOrTopic.data;
  } else if (
    "councilVerdict" in artifactOrTopic ||
    "alignmentIndex" in artifactOrTopic
  ) {
    artifactType = "council";
    data = artifactOrTopic;
  } else if (
    "telemetrySeries" in artifactOrTopic ||
    "baselineRps" in artifactOrTopic
  ) {
    artifactType = "simulation";
    data = artifactOrTopic;
  } else if (
    "perspectives" in artifactOrTopic ||
    "consensusSummary" in artifactOrTopic
  ) {
    artifactType = "debate";
    data = artifactOrTopic;
  } else if ("criteria" in artifactOrTopic && "options" in artifactOrTopic) {
    artifactType = "matrix";
    data = artifactOrTopic;
  } else if ("executiveSummary" in artifactOrTopic) {
    artifactType = "research";
    data = artifactOrTopic;
  }

  interface RawChapter {
    title: string;
    speaker: string;
    text: string;
    keyTakeaways: string[];
  }

  const rawChapters: RawChapter[] = [];

  switch (artifactType) {
    case "research": {
      const rep = data as ResearchReport;
      const title = rep.title || topicHint || "Executive Research Report";

      rawChapters.push({
        title: "Executive Overview & Context",
        speaker: "Nova Host",
        text: `Welcome to this Nova audio briefing. Today we are examining "${title}". To summarize the core findings: ${rep.executiveSummary || "No executive summary provided."}`,
        keyTakeaways: [`Topic: ${title}`, "Core strategic thesis overview"],
      });

      if (rep.keyFindings && rep.keyFindings.length > 0) {
        const topFindings = rep.keyFindings.slice(0, 4);
        const findingsNarrative = topFindings
          .map(
            (f, idx) =>
              `Finding number ${idx + 1}: ${f.point}. ${f.description}`,
          )
          .join(" ");

        rawChapters.push({
          title: "Empirical Findings & Key Evidence",
          speaker: "Senior Research Analyst",
          text: `Diving into the empirical evidence, our multi-agent investigation identified several primary findings. ${findingsNarrative}`,
          keyTakeaways: topFindings.map((f) => f.point),
        });
      }

      if (rep.contradictionsAndRisks && rep.contradictionsAndRisks.length > 0) {
        const risks = rep.contradictionsAndRisks.slice(0, 3).join(". ");
        rawChapters.push({
          title: "Critical Risks & Contradictions",
          speaker: "Risk & Adversarial Critic",
          text: `Turning to the counter-evidence and potential blindspots, several critical contradictions were flagged during adversarial cross-examination: ${risks}`,
          keyTakeaways: rep.contradictionsAndRisks.slice(0, 3),
        });
      }

      rawChapters.push({
        title: "Strategic Recommendation & Next Steps",
        speaker: "Nova Host",
        text: `Based on the synthesis of grounded citations and adversarial evaluation, here is the decisive recommendation: ${rep.recommendation || "Proceed with staged validation."} This concludes our executive research briefing.`,
        keyTakeaways: [
          rep.recommendation?.slice(0, 100) ||
            "Follow architectural recommendation",
        ],
      });
      break;
    }

    case "council": {
      const council = data as PersonaCouncilArtifact;
      const topic = council.topic || topicHint || "Executive Deliberation";

      rawChapters.push({
        title: "Council Alignment & Verdict",
        speaker: "Council Lead",
        text: `Convening the executive deliberation on "${topic}". The five-persona institutional council concluded with verdict: ${council.councilVerdict || "consensus reached"} and an alignment index of ${council.alignmentIndex ?? 100} out of 100. ${council.verdictSummary || ""}`,
        keyTakeaways: [
          `Verdict: ${council.councilVerdict}`,
          `Alignment Index: ${council.alignmentIndex}%`,
        ],
      });

      if (council.reviews && council.reviews.length > 0) {
        const reviewsText = council.reviews
          .map(
            (r) =>
              `${r.personaName}, serving as ${r.roleTitle}, issued grade ${r.grade} with verdict ${r.verdict}. Endorsement: ${r.coreEndorsement}`,
          )
          .join(" ");

        rawChapters.push({
          title: "Specialist Persona Evaluations",
          speaker: "Lead Architect",
          text: `Let's break down the individual specialist scorecards. ${reviewsText}`,
          keyTakeaways: council.reviews.map(
            (r) => `${r.personaName}: Grade ${r.grade} (${r.verdict})`,
          ),
        });
      }

      if (council.fatalBlindspots && council.fatalBlindspots.length > 0) {
        const blindspotsText = council.fatalBlindspots
          .map(
            (b) =>
              `In dimension ${b.dimension}, flagged by ${b.flaggedBy} as ${b.severity} severity: ${b.risk}. Recommended mitigation: ${b.mitigation}`,
          )
          .join(" ");

        rawChapters.push({
          title: "Fatal Blindspots & Red-Team Vetoes",
          speaker: "Chief Information Security Officer",
          text: `Adversarial red-team review surfaced critical blindspots that must be resolved before proceeding. ${blindspotsText}`,
          keyTakeaways: council.fatalBlindspots.map(
            (b) => `${b.dimension}: ${b.risk}`,
          ),
        });
      }

      rawChapters.push({
        title: "Unified Strategic Compromise & Execution Gates",
        speaker: "Council Lead",
        text: `To bridge conflicting persona priorities, the council established this unified strategic compromise: ${council.strategicCompromise || "Balance innovation with phased guardrails."} Actionable execution gates: ${(council.actionItems || []).slice(0, 3).join(", ")}. This concludes the council briefing.`,
        keyTakeaways: (council.actionItems || []).slice(0, 3),
      });
      break;
    }

    case "simulation": {
      const sim = data as ResilienceSimulationArtifact;
      const title = sim.title || topicHint || "Chaos Stress-Test Simulation";

      rawChapters.push({
        title: "Chaos Scenario & Baseline Architecture",
        speaker: "Site Reliability Engineer",
        text: `Initiating resilience telemetry overview for "${title}". We modeled discrete event traffic across ${sim.totalSteps || 25} steps at a baseline load of ${sim.baselineRps || 1000} requests per second under active chaos injections. ${sim.description || ""}`,
        keyTakeaways: [
          `Scenario: ${title}`,
          `Baseline Load: ${sim.baselineRps} RPS`,
        ],
      });

      rawChapters.push({
        title: "Traffic Surges & Queue Saturation",
        speaker: "Systems Architect",
        text: `Under simulated load and Little's Law queueing saturation, the system experienced a peak P99 latency of ${sim.summary?.peakP99LatencyMs || 0} milliseconds and a maximum error rate of ${sim.summary?.maxErrorRatePct || 0} percent. Active incidents occurred across dependency failure windows.`,
        keyTakeaways: [
          `Peak P99 Latency: ${sim.summary?.peakP99LatencyMs}ms`,
          `Max Error Rate: ${sim.summary?.maxErrorRatePct}%`,
        ],
      });

      rawChapters.push({
        title: "Failure Diagnosis & Hardening Checklist",
        speaker: "Nova Host",
        text: `Diagnosis: ${sim.summary?.bottleneckDiagnosis || "No bottleneck observed."} The architectural hardening checklist mandates: ${(sim.summary?.hardeningRecommendations || []).slice(0, 3).join("; ")}. System resilience score is evaluated at ${sim.summary?.resilienceScore || 0} out of 100.`,
        keyTakeaways: (sim.summary?.hardeningRecommendations || []).slice(0, 3),
      });
      break;
    }

    case "debate": {
      const debate = data as DebateArtifact;
      const topic =
        debate.topic || topicHint || "Multi-Agent Dialectical Debate";

      rawChapters.push({
        title: "Dialectic Thesis & Core Tension",
        speaker: "Nova Arbiter",
        text: `Welcome to the dialectic debate arena. Today's contentious topic: "${topic}". Consensus overview: ${debate.consensusSummary || "Multiple perspectives presented."}`,
        keyTakeaways: [`Debate Topic: ${topic}`],
      });

      if (debate.perspectives && debate.perspectives.length > 0) {
        const perspectiveText = debate.perspectives
          .map(
            (p) =>
              `${p.agentName}, arguing from the ${p.stance} stance: ${(p.arguments || []).slice(0, 2).join(". ")}`,
          )
          .join(" ");

        rawChapters.push({
          title: "Advocate vs Critic Clashes",
          speaker: "Debate Adjudicator",
          text: `Examining the dialectical cross-examination: ${perspectiveText}`,
          keyTakeaways: debate.perspectives.map(
            (p) => `${p.agentName} (${p.stance})`,
          ),
        });
      }

      rawChapters.push({
        title: "Arbiter Synthesis & Decisive Verdict",
        speaker: "Nova Arbiter",
        text: `Synthesizing the core arguments, here is the decisive verdict: ${debate.synthesisVerdict || "Balanced trade-off consensus."} This concludes the dialectical debate briefing.`,
        keyTakeaways: [
          debate.synthesisVerdict?.slice(0, 100) || "Consensus verdict",
        ],
      });
      break;
    }

    case "matrix": {
      const matrix = data as DecisionMatrix;
      const topic = matrix.topic || topicHint || "Decision Matrix Evaluation";

      rawChapters.push({
        title: "Decision Framework & Criteria Weighting",
        speaker: "Quantitative Analyst",
        text: `Welcome to the quantitative evaluation for "${topic}". We evaluated ${(matrix.options || []).length} options across ${(matrix.criteria || []).length} weighted criteria.`,
        keyTakeaways: [`Topic: ${topic}`],
      });

      const optionsText = (matrix.options || [])
        .map(
          (o) =>
            `Option "${o.name}" achieved a total weighted score of ${o.totalWeightedScore}. Top pro: ${(o.pros || [])[0] || "None"}. Top con: ${(o.cons || [])[0] || "None"}.`,
        )
        .join(" ");

      rawChapters.push({
        title: "Comparative Option Breakdown",
        speaker: "Senior Analyst",
        text: `Analyzing the scored candidates: ${optionsText}`,
        keyTakeaways: (matrix.options || []).map(
          (o) => `${o.name}: ${o.totalWeightedScore} pts`,
        ),
      });

      rawChapters.push({
        title: "Final Weighted Verdict",
        speaker: "Nova Host",
        text: `The quantitative decision model concludes: ${matrix.verdict || "Select highest scoring option."}`,
        keyTakeaways: [
          matrix.verdict?.slice(0, 100) || "Winning option selected",
        ],
      });
      break;
    }

    default: {
      const fallbackObj =
        typeof data === "object" && data !== null
          ? (data as Record<string, unknown>)
          : {};
      const title =
        typeof fallbackObj.title === "string"
          ? fallbackObj.title
          : topicHint || "Intelligence Overview";
      rawChapters.push({
        title: "Executive Briefing Overview",
        speaker: "Nova Host",
        text: `Welcome to this executive audio briefing on "${title}". We are analyzing the strategic architecture and core operational requirements.`,
        keyTakeaways: [`Topic: ${title}`],
      });

      rawChapters.push({
        title: "Core Analysis & Synthesis",
        speaker: "Lead Analyst",
        text: `In examining the structural dynamics, our automated intelligence synthesis processed the primary execution parameters, dependencies, and risk factors.`,
        keyTakeaways: [
          "Systematic parameter evaluation",
          "Structural dependency mapping",
        ],
      });

      rawChapters.push({
        title: "Operational Roadmap & Next Steps",
        speaker: "Nova Host",
        text: `To conclude this audio overview: verify the foundational configurations, execute continuous validation testing, and monitor key performance indicators. Thank you for listening.`,
        keyTakeaways: [
          "Verify foundational configurations",
          "Continuous validation testing",
        ],
      });
      break;
    }
  }

  // Calculate sequential timeline timestamps for each chapter
  let currentStartTimeMs = 0;
  const chapters: AudioChapterSegment[] = [];

  for (let idx = 0; idx < rawChapters.length; idx++) {
    const raw = rawChapters[idx];
    const durationMs = estimateSpeechDurationMs(raw.text);
    const endTimeMs = currentStartTimeMs + durationMs;

    chapters.push({
      id: `chap-${idx + 1}`,
      chapterIndex: idx + 1,
      title: raw.title,
      speaker: raw.speaker,
      text: raw.text,
      estimatedDurationMs: durationMs,
      startTimeMs: currentStartTimeMs,
      endTimeMs,
      keyTakeaways: raw.keyTakeaways,
    });

    currentStartTimeMs = endTimeMs;
  }

  return chapters;
}

/**
 * Generates a complete deterministic AudioBriefingArtifact from an artifact or topic.
 */
export function generateAudioBriefing(
  artifactOrTopic: GenerativeArtifact | ResearchReport | string,
  options?: { hostName?: string; topic?: string },
): AudioBriefingArtifact {
  let title = "Executive Audio Briefing";

  if (typeof artifactOrTopic === "string") {
    title = artifactOrTopic;
  } else if ("type" in artifactOrTopic) {
    const art = artifactOrTopic as GenerativeArtifact;
    switch (art.type) {
      case "research":
        title = art.data.title || "Research Synthesis";
        break;
      case "council":
        title = art.data.topic || "Council Deliberation";
        break;
      case "simulation":
        title = art.data.title || "Chaos Simulation";
        break;
      case "debate":
        title = art.data.topic || "Dialectic Debate";
        break;
      case "matrix":
        title = art.data.topic || "Decision Matrix";
        break;
      case "plan":
        title = art.data.goal || "Strategic Plan";
        break;
      case "code":
        title = art.data.filename || "Technical Architecture";
        break;
      default:
        title = options?.topic || "Nova Audio Overview";
    }
  } else if (
    "title" in artifactOrTopic &&
    typeof artifactOrTopic.title === "string"
  ) {
    title = artifactOrTopic.title;
  }

  if (options?.topic) {
    title = options.topic;
  }

  const chapters = synthesizeNarrationChapters(artifactOrTopic, title);
  const totalDurationMs = chapters.reduce(
    (sum, c) => sum + c.estimatedDurationMs,
    0,
  );
  const totalWordCount = chapters.reduce(
    (sum, c) => sum + c.text.split(/\s+/).filter(Boolean).length,
    0,
  );

  const fullNarrationScript = chapters
    .map(
      (c) =>
        `[${formatDurationTimestamp(c.startTimeMs)} - ${formatDurationTimestamp(c.endTimeMs)}] Chapter ${c.chapterIndex}: ${c.title} (${c.speaker})\n${c.text}`,
    )
    .join("\n\n");

  const waveform = generateDeterministicWaveform(chapters, 48);

  return {
    title: `Audio Briefing: ${title}`,
    totalDurationMs,
    totalWordCount,
    chapters,
    waveform,
    fullNarrationScript,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Escapes CSV field value according to RFC 4180.
 */
function escapeCsvField(val: unknown): string {
  if (val == null) return '""';
  const str = String(val);
  if (
    str.includes('"') ||
    str.includes(",") ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Strict RFC 4180 CSV export for Audio Briefings with CRLF endings.
 */
export function audioBriefingToCsv(briefing: AudioBriefingArtifact): string {
  const header = [
    "Chapter",
    "StartTimeMs",
    "EndTimeMs",
    "StartTime",
    "EndTime",
    "Speaker",
    "Title",
    "WordCount",
    "Script",
  ].join(",");

  const lines = [header];

  for (const c of briefing.chapters) {
    const wordCount = c.text.split(/\s+/).filter(Boolean).length;
    const row = [
      c.chapterIndex,
      c.startTimeMs,
      c.endTimeMs,
      escapeCsvField(formatDurationTimestamp(c.startTimeMs)),
      escapeCsvField(formatDurationTimestamp(c.endTimeMs)),
      escapeCsvField(c.speaker),
      escapeCsvField(c.title),
      wordCount,
      escapeCsvField(c.text),
    ].join(",");
    lines.push(row);
  }

  return lines.join("\r\n");
}

/**
 * Exports Audio Briefing into standard WebVTT (.vtt) subtitle track format.
 */
export function audioBriefingToVtt(briefing: AudioBriefingArtifact): string {
  const parts: string[] = ["WEBVTT", ""];

  for (const c of briefing.chapters) {
    const startVtt = formatVttTimestamp(c.startTimeMs);
    const endVtt = formatVttTimestamp(c.endTimeMs);

    parts.push(String(c.chapterIndex));
    parts.push(`${startVtt} --> ${endVtt}`);
    parts.push(`[${c.speaker}] - ${c.title}: ${c.text}`);
    parts.push("");
  }

  return parts.join("\n");
}

/**
 * Exports Audio Briefing into an executive Markdown briefing dossier.
 */
export function audioBriefingToMarkdown(
  briefing: AudioBriefingArtifact,
): string {
  const sections: string[] = [];

  sections.push(`# 🎙️ ${briefing.title}\n`);
  sections.push(
    `**Total Duration:** ${formatDurationTimestamp(briefing.totalDurationMs)} (${Math.round(briefing.totalDurationMs / 1000)} seconds)`,
  );
  sections.push(`**Total Word Count:** ${briefing.totalWordCount} words`);
  sections.push(`**Generated At:** ${briefing.generatedAt}\n`);

  sections.push("## Chapter Breakdown & Timeline\n");
  sections.push("| # | Timestamp | Title | Speaker | Duration |");
  sections.push("| :-: | :--- | :--- | :--- | :-: |");

  for (const c of briefing.chapters) {
    const timeSpan = `${formatDurationTimestamp(c.startTimeMs)} - ${formatDurationTimestamp(c.endTimeMs)}`;
    const dur = `${Math.round(c.estimatedDurationMs / 1000)}s`;
    sections.push(
      `| ${c.chapterIndex} | \`${timeSpan}\` | **${c.title}** | ${c.speaker} | ${dur} |`,
    );
  }

  sections.push("\n## Full Narration Script\n");

  for (const c of briefing.chapters) {
    sections.push(`### Chapter ${c.chapterIndex}: ${c.title}`);
    sections.push(
      `*Speaker:* **${c.speaker}** • *Timeline:* \`${formatDurationTimestamp(c.startTimeMs)} - ${formatDurationTimestamp(c.endTimeMs)}\`\n`,
    );
    sections.push(`> ${c.text}\n`);
    if (c.keyTakeaways && c.keyTakeaways.length > 0) {
      sections.push("**Key Takeaways:**");
      for (const t of c.keyTakeaways) {
        sections.push(`- ${t}`);
      }
      sections.push("");
    }
  }

  return sections.join("\n");
}
