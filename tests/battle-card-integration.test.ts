import { describe, it, expect } from "bun:test";
import React from "react";
import ReactDOMServer from "react-dom/server";
import fs from "fs";
import path from "path";
import { ArtifactStage } from "@/components/ArtifactStage";
import {
  extractSpatialNodes,
  computeSpatialEdges,
} from "@/lib/canvas/spatial-canvas";
import { getArtifactMetadata } from "@/lib/print-dossier";
import { formatArtifactMarkdown } from "@/lib/session-export";
import {
  synthesizeBattleCardFromResearch,
  battleCardToCsv,
} from "@/lib/competitive/battle-card";
import type { ChatMessage, GenerativeArtifact } from "@/lib/types";

describe("Competitive Battle-Card Fullstack Integration", () => {
  const sampleCard = synthesizeBattleCardFromResearch(
    "Mission-Critical Aerospace Flight System",
  );

  const sampleBattleArtifact: GenerativeArtifact = {
    type: "battlecard",
    data: sampleCard,
  };

  const sampleMessages: ChatMessage[] = [
    {
      id: "msg-bc-1",
      role: "assistant",
      content: "Here is the competitive battle-card for aerospace systems.",
      timestamp: "2026-10-29T05:00:00.000Z",
      artifact: sampleBattleArtifact,
    },
  ];

  describe("ArtifactStage.tsx Battle-Card Rendering & CSV Export", () => {
    it("imports CompetitiveBattleCard and battleCardToCsv in ArtifactStage", () => {
      const filePath = path.join(
        process.cwd(),
        "src/components/ArtifactStage.tsx",
      );
      const source = fs.readFileSync(filePath, "utf-8");
      expect(source).toContain("CompetitiveBattleCard");
      expect(source).toContain("battleCardToCsv");
    });

    it("renders ArtifactStage preview with CompetitiveBattleCard for battlecard artifacts", () => {
      const html = ReactDOMServer.renderToString(
        React.createElement(ArtifactStage, {
          artifact: sampleBattleArtifact,
          onClose: () => {},
        }),
      );

      expect(html).toContain("Mission-Critical Aerospace Flight System");
      expect(html).toContain("Competitive Moat Battle-Card");
      expect(html).toContain("Dominant Moat");
    });

    it("ensures strict zero pseudo-randomness in ArtifactStage.tsx", () => {
      const filePath = path.join(
        process.cwd(),
        "src/components/ArtifactStage.tsx",
      );
      const source = fs.readFileSync(filePath, "utf-8");
      expect(source).not.toContain("Math.random");
    });
  });

  describe("Spatial Canvas 2D Extraction for Battle-Card Artifacts", () => {
    it("extracts battlecard nodes with tags and moat score metrics in extractSpatialNodes", () => {
      const nodes = extractSpatialNodes(sampleMessages);
      expect(nodes.length).toBe(1);

      const bcNode = nodes[0];
      expect(bcNode.artifactType).toBe("battlecard");
      expect(bcNode.title).toContain(
        "Mission-Critical Aerospace Flight System",
      );
      expect(bcNode.tags).toContain("BATTLECARD");
      expect(bcNode.tags).toContain("COMPETITIVE");
      expect(bcNode.tags).toContain("MOAT");
      expect(bcNode.metrics?.score).toBe(sampleCard.novaMoatScore);
      expect(bcNode.metrics?.itemCount).toBe(
        sampleCard.competitorProfiles.length,
      );
      expect(bcNode.metrics?.evidenceCount).toBe(sampleCard.dimensions.length);
    });

    it("computes topological edges between battlecard and research / matrix artifacts", () => {
      const multiMessages: ChatMessage[] = [
        {
          id: "msg-res",
          role: "assistant",
          content: "Research overview",
          timestamp: "2026-10-29T05:00:00.000Z",
          artifact: {
            type: "research",
            data: {
              title: "Aerospace Avionics Research",
              executiveSummary: "Flight critical summary.",
              keyFindings: [],
              sources: [],
              recommendation: "Deploy redundant avionics.",
            },
          },
        },
        {
          id: "msg-mat",
          role: "assistant",
          content: "Decision Matrix",
          timestamp: "2026-10-29T05:01:00.000Z",
          artifact: {
            type: "matrix",
            data: {
              topic: "Aerospace Avionics Frameworks",
              verdict: "Nova Aerospace delivers highest safety and redundancy.",
              criteria: [{ id: "c1", name: "Safety", weight: 3 }],
              options: [
                {
                  id: "o1",
                  name: "Nova Aerospace",
                  totalWeightedScore: 9.5,
                  scores: { c1: 9.5 },
                  pros: [],
                  cons: [],
                },
              ],
            },
          },
        },
        {
          id: "msg-bc",
          role: "assistant",
          content: "Battle-Card",
          timestamp: "2026-10-29T05:02:00.000Z",
          artifact: sampleBattleArtifact,
        },
      ];

      const nodes = extractSpatialNodes(multiMessages);
      expect(nodes.length).toBe(3);

      const edges = computeSpatialEdges(nodes);
      expect(edges.length).toBeGreaterThanOrEqual(2);

      // Verify battlecard + matrix produces "compares" edge
      const matrixEdge = edges.find(
        (e) =>
          (e.sourceId === "node-msg-mat" && e.targetId === "node-msg-bc") ||
          (e.sourceId === "node-msg-bc" && e.targetId === "node-msg-mat"),
      );
      expect(matrixEdge).toBeDefined();
      expect(matrixEdge?.relationType).toBe("compares");

      // Verify battlecard + research produces "validates" edge
      const researchEdge = edges.find(
        (e) =>
          (e.sourceId === "node-msg-res" && e.targetId === "node-msg-bc") ||
          (e.sourceId === "node-msg-bc" && e.targetId === "node-msg-res"),
      );
      expect(researchEdge).toBeDefined();
      expect(researchEdge?.relationType).toBe("validates");
    });
  });

  describe("Print Dossier & Session Export Resolvers", () => {
    it("resolves battlecard title and modeName in getArtifactMetadata", () => {
      const meta = getArtifactMetadata(sampleBattleArtifact);
      expect(meta.title).toBe("Mission-Critical Aerospace Flight System");
      expect(meta.modeName).toBe("Competitive Intelligence Battle-Card");
      expect(meta.artifactType).toBe("battlecard");
    });

    it("formats battlecard section in session-export.ts", () => {
      const md = formatArtifactMarkdown(sampleBattleArtifact);
      expect(md).toContain(
        "#### ⚔️ Competitive Moat Battle-Card: Mission-Critical Aerospace Flight System",
      );
      expect(md).toContain("Moat Score");
      expect(md).toContain("Key Win Themes");
    });
  });

  describe("Deterministic RFC 4180 CSV Validation", () => {
    it("exports valid RFC 4180 CSV with CRLF line endings", () => {
      const csv = battleCardToCsv(sampleCard);
      expect(csv.endsWith("\r\n")).toBe(true);

      const rows = csv.split("\r\n").filter((r) => r.trim().length > 0);
      expect(rows.length).toBeGreaterThan(10);
      expect(rows[0]).toContain("Record Type,Category / Competitor");
    });
  });
});
