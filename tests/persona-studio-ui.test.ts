import { describe, it, expect } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "fs";
import path from "path";
import { PersonaCouncilCard } from "@/components/GenerativeCards/PersonaCouncilCard";
import { analyzePersonaCouncil } from "@/lib/research/persona-studio";
import type { PersonaCouncilArtifact } from "@/lib/types";

describe("PersonaCouncilCard Generative UI Component", () => {
  const sampleCouncil: PersonaCouncilArtifact = analyzePersonaCouncil(
    "Migrate to Global Multi-Region Spanner Database Cluster",
    "Mission-critical transaction ledger requiring five-nines availability and sub-100ms cross-region replication.",
  );

  const componentSource = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/components/GenerativeCards/PersonaCouncilCard.tsx",
    ),
    "utf-8",
  );

  it("renders council topic, verdict badge, and alignment gauge in the header", () => {
    const html = renderToString(
      React.createElement(PersonaCouncilCard, {
        council: sampleCouncil,
      }),
    );

    expect(html).toContain(
      "Migrate to Global Multi-Region Spanner Database Cluster",
    );
    expect(html).toContain("Executive Council Review");
    expect(html).toContain(`${sampleCouncil.alignmentIndex}%`);
    expect(html).toContain(`Mean: ${sampleCouncil.meanScore}/100`);
    expect(html).toContain("CSV");
    expect(html).toContain("Copy");
  });

  it("renders persona tabs with role titles, grades, and status dots", () => {
    const html = renderToString(
      React.createElement(PersonaCouncilCard, {
        council: sampleCouncil,
      }),
    );

    expect(html).toContain("Council Overview");
    for (const rev of sampleCouncil.reviews) {
      const escapedName = rev.personaName.replace(/&/g, "&amp;");
      expect(html).toContain(escapedName);
      expect(html).toContain(rev.grade);
    }
  });

  it("renders the council overview grid with reviews and strategic compromise", () => {
    const html = renderToString(
      React.createElement(PersonaCouncilCard, {
        council: sampleCouncil,
      }),
    );

    // Reviews overview cards
    for (const rev of sampleCouncil.reviews) {
      const escapedRole = rev.roleTitle.replace(/&/g, "&amp;");
      expect(html).toContain(escapedRole);
    }

    // Strategic Compromise section
    if (sampleCouncil.strategicCompromise) {
      expect(html).toContain("Unified Strategic Compromise Blueprint");
      expect(html).toContain(sampleCouncil.strategicCompromise);
    }

    // Action Items section
    if (sampleCouncil.actionItems && sampleCouncil.actionItems.length > 0) {
      expect(html).toContain("Council Action Items &amp; Execution Gates");
      expect(html).toContain(sampleCouncil.actionItems[0]);
    }
  });

  it("renders fatal blindspots callout when critical risks are flagged", () => {
    const highRiskCouncil = analyzePersonaCouncil(
      "Deploy Unencrypted Single-Node Database in Public Cloud without Authentication",
    );

    const html = renderToString(
      React.createElement(PersonaCouncilCard, {
        council: highRiskCouncil,
      }),
    );

    if (highRiskCouncil.fatalBlindspots.length > 0) {
      expect(html).toContain("Council Fatal Blindspots &amp; Risks");
      expect(html).toContain(highRiskCouncil.fatalBlindspots[0].dimension);
      expect(html).toContain(highRiskCouncil.fatalBlindspots[0].mitigation);
    }
  });

  it("strictly enforces ZERO Math.random() in PersonaCouncilCard source", () => {
    expect(componentSource).not.toContain("Math.random()");
    expect(componentSource).not.toContain("Math.random");
  });
});
