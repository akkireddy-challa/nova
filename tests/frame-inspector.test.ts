import { describe, it, expect } from "bun:test";
import fs from "fs";
import path from "path";
import {
  computeBoundingBoxIoU,
  normalizeCoordinates,
  calculateVisualGroundingIndex,
  calculateInspectionSummary,
  synthesizeMultiModalInspection,
  multiModalInspectionToCsv,
  multiModalInspectionToMarkdown,
  DEFAULT_INSPECTION_FRAMES,
} from "@/lib/multimodal/frame-inspector";
import type { SpatialBoundingBox } from "@/lib/types";

describe("Autonomous Multi-Modal Frame Inspector Engine", () => {
  describe("computeBoundingBoxIoU", () => {
    it("returns 1.0 for identical overlapping boxes", () => {
      const boxA: SpatialBoundingBox = {
        id: "b1",
        ymin: 100,
        xmin: 100,
        ymax: 500,
        xmax: 500,
        label: "Target",
        confidencePct: 95,
      };
      expect(computeBoundingBoxIoU(boxA, boxA)).toBe(1);
    });

    it("returns 0.0 for completely disjoint boxes", () => {
      const boxA: SpatialBoundingBox = {
        id: "b1",
        ymin: 0,
        xmin: 0,
        ymax: 100,
        xmax: 100,
        label: "TopLeft",
        confidencePct: 95,
      };
      const boxB: SpatialBoundingBox = {
        id: "b2",
        ymin: 500,
        xmin: 500,
        ymax: 600,
        xmax: 600,
        label: "BottomRight",
        confidencePct: 90,
      };
      expect(computeBoundingBoxIoU(boxA, boxB)).toBe(0);
    });

    it("computes accurate fractional IoU for partially overlapping boxes", () => {
      const boxA: SpatialBoundingBox = {
        id: "b1",
        ymin: 0,
        xmin: 0,
        ymax: 200,
        xmax: 200,
        label: "A",
        confidencePct: 90,
      };
      const boxB: SpatialBoundingBox = {
        id: "b2",
        ymin: 100,
        xmin: 100,
        ymax: 300,
        xmax: 300,
        label: "B",
        confidencePct: 90,
      };
      // Box A area: 200*200 = 40,000
      // Box B area: 200*200 = 40,000
      // Intersection: [100..200, 100..200] -> 100*100 = 10,000
      // Union: 40,000 + 40,000 - 10,000 = 70,000
      // IoU: 10,000 / 70,000 = 0.142857 -> 0.143
      const iou = computeBoundingBoxIoU(boxA, boxB);
      expect(iou).toBe(0.143);
    });
  });

  describe("normalizeCoordinates", () => {
    it("converts normalized 0-1000 coordinates to pixel dimensions", () => {
      const box: SpatialBoundingBox = {
        id: "b1",
        ymin: 250,
        xmin: 200,
        ymax: 750,
        xmax: 800,
        label: "Region",
        confidencePct: 95,
      };
      const coords = normalizeCoordinates(box, 1000, 600);
      expect(coords.left).toBe(200);
      expect(coords.top).toBe(150);
      expect(coords.width).toBe(600);
      expect(coords.height).toBe(300);
    });
  });

  describe("calculateVisualGroundingIndex", () => {
    it("calculates accurate grounding index from default inspection frames", () => {
      const index = calculateVisualGroundingIndex(DEFAULT_INSPECTION_FRAMES);
      expect(index).toBeGreaterThanOrEqual(80);
      expect(index).toBeLessThanOrEqual(100);
    });

    it("returns 100 when no visual citations exist", () => {
      const index = calculateVisualGroundingIndex([]);
      expect(index).toBe(100);
    });
  });

  describe("calculateInspectionSummary", () => {
    it("calculates summary statistics for default enterprise frames", () => {
      const summary = calculateInspectionSummary(DEFAULT_INSPECTION_FRAMES);
      expect(summary.totalFrames).toBe(3);
      expect(summary.totalRegions).toBe(8);
      expect(summary.averageConfidencePct).toBeGreaterThan(90);
      expect(summary.auditStatus).toBe("verified");
      expect(summary.modalityType).toBe("vision_video");
    });
  });

  describe("synthesizeMultiModalInspection", () => {
    it("synthesizes populated MultiModalInspectionArtifact from topic string", () => {
      const artifact = synthesizeMultiModalInspection(
        "Autonomous Medical Robotic Video Telemetry",
      );
      expect(artifact.id).toBe("mm-inspect-01");
      expect(artifact.topic).toBe("Autonomous Medical Robotic Video Telemetry");
      expect(artifact.frames.length).toBe(3);
      expect(artifact.summary.totalRegions).toBe(8);
      expect(artifact.summary.visualGroundingIndex).toBeGreaterThan(80);
    });
  });

  describe("RFC 4180 CSV & Markdown Exports", () => {
    it("exports multimodal inspection to RFC 4180 CSV with CRLF line endings", () => {
      const artifact = synthesizeMultiModalInspection(
        "Multimodal Acoustic & Vision Audit",
      );
      const csv = multiModalInspectionToCsv(artifact);
      expect(csv).toContain("\r\n");
      expect(csv).toContain(
        "Record Type,Item ID,Frame Index,Timestamp Ms,Label or Claim",
      );
      expect(csv).toContain("OVERVIEW");
      expect(csv).toContain("KEYFRAME");
      expect(csv).toContain("BOUNDING_REGION");
      expect(csv).toContain("VISUAL_CITATION");
      expect(csv).toContain("box-01");
    });

    it("exports multimodal inspection to formatted Markdown report", () => {
      const artifact = synthesizeMultiModalInspection(
        "Multimodal Acoustic & Vision Audit",
      );
      const md = multiModalInspectionToMarkdown(artifact);
      expect(md).toContain(
        "# 👁️ Multi-Modal Vision & Audio Ingestion Inspector: Multimodal Acoustic & Vision Audit",
      );
      expect(md).toContain("Media Source:");
      expect(md).toContain("Grounding Index:");
      expect(md).toContain("Ingested Keyframes & Spatial Regions");
      expect(md).toContain("Grounded Visual Citations");
    });
  });

  describe("Zero Pseudo-Randomness Integrity", () => {
    it("strictly verifies ZERO Math.random() in frame-inspector.ts", () => {
      const filePath = path.join(
        process.cwd(),
        "src/lib/multimodal/frame-inspector.ts",
      );
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).not.toContain("Math.random");
    });
  });
});
