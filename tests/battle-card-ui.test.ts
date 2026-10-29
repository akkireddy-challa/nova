import { describe, it, expect } from "bun:test";
import React from "react";
import ReactDOMServer from "react-dom/server";
import fs from "fs";
import path from "path";
import { CompetitiveBattleCard } from "@/components/GenerativeCards/CompetitiveBattleCard";
import { synthesizeBattleCardFromResearch } from "@/lib/competitive/battle-card";

describe("CompetitiveBattleCard Generative UI Component", () => {
  const sampleCard = synthesizeBattleCardFromResearch(
    "High-Frequency Distributed Trading Agent",
  );

  it("renders topic, target sector badge, and moat score index", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(CompetitiveBattleCard, { battleCard: sampleCard }),
    );

    expect(html).toContain("High-Frequency Distributed Trading Agent");
    expect(html).toContain("Competitive Moat Battle-Card");
    expect(html).toContain(String(sampleCard.novaMoatScore));
    expect(html).toContain("Dominant Moat");
  });

  it("renders feature matrix table headers and dimension rows", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(CompetitiveBattleCard, { battleCard: sampleCard }),
    );

    expect(html).toContain("Feature Matrix");
    expect(html).toContain("Evaluation Dimension");
    expect(html).toContain("Deterministic Verification");
    expect(html).toContain("Leader");
    expect(html).toContain("LegacyCorp Orchestrator");
  });

  it("renders action buttons for Markdown copy and CSV download", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(CompetitiveBattleCard, { battleCard: sampleCard }),
    );

    expect(html).toContain('aria-label="Copy Markdown Battle-Card"');
    expect(html).toContain('aria-label="Download RFC 4180 CSV"');
  });

  it("strictly enforces ZERO pseudo-randomness in CompetitiveBattleCard source", () => {
    const filePath = path.join(
      process.cwd(),
      "src/components/GenerativeCards/CompetitiveBattleCard.tsx",
    );
    const source = fs.readFileSync(filePath, "utf-8");
    expect(source).not.toContain("Math.random");
  });
});
