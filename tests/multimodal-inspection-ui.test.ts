import { describe, it, expect } from "bun:test";
import React from "react";
import ReactDOMServer from "react-dom/server";
import fs from "fs";
import path from "path";
import { MultiModalInspectionCard } from "@/components/GenerativeCards/MultiModalInspectionCard";
import { synthesizeMultiModalInspection } from "@/lib/multimodal/frame-inspector";

describe("MultiModalInspectionCard Generative UI Component", () => {
  const sampleArtifact = synthesizeMultiModalInspection(
    "Robotic Teleoperation Video & Acoustic Inspection",
  );

  it("renders topic title, media source, and modality type badge", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(MultiModalInspectionCard, {
        artifact: sampleArtifact,
      }),
    );

    expect(html).toContain(
      "Robotic Teleoperation Video &amp; Acoustic Inspection",
    );
    expect(html).toContain("Multimodal Vision Inspector");
    expect(html).toContain("nova-multimodal-recording-stream.mp4");
    expect(html).toContain("Grounding Verified");
  });

  it("renders metric scorecard counters for grounding index and regions", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(MultiModalInspectionCard, {
        artifact: sampleArtifact,
      }),
    );

    expect(html).toContain(`${sampleArtifact.summary.visualGroundingIndex}%`);
    expect(html).toContain(String(sampleArtifact.summary.totalFrames));
    expect(html).toContain(String(sampleArtifact.summary.totalRegions));
    expect(html).toContain(`${sampleArtifact.summary.averageConfidencePct}%`);
  });

  it("renders keyframe timeline stepper and active frame label", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(MultiModalInspectionCard, {
        artifact: sampleArtifact,
      }),
    );

    expect(html).toMatch(/Frame.*1/);
    expect(html).toMatch(/Frame.*2/);
    expect(html).toMatch(/Frame.*3/);
    expect(html).toContain(
      "System Architecture &amp; Ingress Gateway Topology",
    );
  });

  it("renders grounded visual citations list", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(MultiModalInspectionCard, {
        artifact: sampleArtifact,
      }),
    );

    expect(html).toContain("Grounded Visual Citations");
    expect(html).toContain(sampleArtifact.frames[0].citations[0].claim);
    expect(html).toContain(sampleArtifact.frames[0].citations[0].boxId);
  });

  it("renders action buttons for Markdown report copy and CSV export", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(MultiModalInspectionCard, {
        artifact: sampleArtifact,
      }),
    );

    expect(html).toContain('title="Copy Markdown Report"');
    expect(html).toContain('title="Download RFC 4180 CSV"');
  });

  it("strictly enforces ZERO pseudo-randomness in MultiModalInspectionCard source", () => {
    const filePath = path.join(
      process.cwd(),
      "src/components/GenerativeCards/MultiModalInspectionCard.tsx",
    );
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).not.toContain("Math.random");
  });
});
