import { describe, expect, it } from "bun:test";
import {
  parseAttachedFile,
  cleanDocumentText,
  formatFileSize,
  isSupportedDocument,
  MAX_DOCUMENT_SIZE,
} from "../src/lib/document-parser";

describe("Document Parser Module", () => {
  it("should parse plain text and markdown files properly", async () => {
    const textContent = "Hello from a plain text file\nSecond line";
    const textFile = new File([textContent], "sample.txt", {
      type: "text/plain",
    });

    const parsedText = await parseAttachedFile(textFile);
    expect(parsedText.name).toBe("sample.txt");
    expect(parsedText.type).toContain("text/plain");
    expect(parsedText.content).toBe(textContent);
    expect(parsedText.size).toBe(textFile.size);

    const mdContent = "# Project Architecture\n\n- Task 1\n- Task 2";
    const mdFile = new File([mdContent], "architecture.md", {
      type: "text/markdown",
    });

    const parsedMd = await parseAttachedFile(mdFile);
    expect(parsedMd.name).toBe("architecture.md");
    expect(parsedMd.type).toBe("text/markdown");
    expect(parsedMd.content).toBe(mdContent);
  });

  it("should support code, data, and structured formats", async () => {
    const jsonContent = '{\n  "version": "1.0",\n  "status": "active"\n}';
    const jsonFile = new File([jsonContent], "config.json", {
      type: "application/json",
    });

    const parsedJson = await parseAttachedFile(jsonFile);
    expect(parsedJson.name).toBe("config.json");
    expect(parsedJson.content).toBe(jsonContent);

    const pyContent = "def solve():\n    return 42\n";
    const pyFile = new File([pyContent], "script.py");
    const parsedPy = await parseAttachedFile(pyFile);
    expect(parsedPy.name).toBe("script.py");
    expect(parsedPy.content).toBe("def solve():\n    return 42");
    expect(parsedPy.type).toBe("text/x-python");

    const tsFile = new File(["export const pi = 3.14;"], "math.ts");
    const parsedTs = await parseAttachedFile(tsFile);
    expect(parsedTs.content).toBe("export const pi = 3.14;");
    expect(parsedTs.type).toBe("text/typescript");
  });

  it("should clean non-printable control characters and trim whitespace", async () => {
    const dirty = "\x00\x08   Hello\x1F World\x7F!   \n\t\r";
    const cleaned = cleanDocumentText(dirty);
    expect(cleaned).toBe("Hello World!");

    const file = new File([dirty], "dirty.txt", { type: "text/plain" });
    const parsed = await parseAttachedFile(file);
    expect(parsed.content).toBe("Hello World!");
  });

  it("should enforce maximum 256 KB size limit and throw descriptive error", async () => {
    // 256 KB + 10 bytes
    const oversizedBlob = new Uint8Array(MAX_DOCUMENT_SIZE + 10);
    const oversizedFile = new File([oversizedBlob], "giant.txt", {
      type: "text/plain",
    });

    expect(oversizedFile.size).toBeGreaterThan(MAX_DOCUMENT_SIZE);

    let errorThrown = false;
    try {
      await parseAttachedFile(oversizedFile);
    } catch (err: unknown) {
      errorThrown = true;
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toContain("exceeds the maximum allowed limit of 256 KB");
      expect(message).toContain("giant.txt");
    }
    expect(errorThrown).toBe(true);
  });

  it("should reject unsupported binary extensions", async () => {
    const binaryFile = new File(
      [new Uint8Array([0xde, 0xad, 0xbe, 0xef])],
      "app.exe",
      {
        type: "application/octet-stream",
      },
    );

    let errorThrown = false;
    try {
      await parseAttachedFile(binaryFile);
    } catch (err: unknown) {
      errorThrown = true;
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toContain("Unsupported file type");
      expect(message).toContain("app.exe");
    }
    expect(errorThrown).toBe(true);

    const pdfFile = new File(["dummy pdf content"], "document.pdf", {
      type: "application/pdf",
    });
    expect(() => parseAttachedFile(pdfFile)).toThrow();

    const zipFile = new File(["dummy zip content"], "archive.zip");
    expect(() => parseAttachedFile(zipFile)).toThrow();
  });

  it("should handle case-insensitive extensions", () => {
    expect(isSupportedDocument("README.MD")).toBe(true);
    expect(isSupportedDocument("data.CSV")).toBe(true);
    expect(isSupportedDocument("config.JSON")).toBe(true);
    expect(isSupportedDocument("BINARY.EXE")).toBe(false);
  });

  it("should format file size labels correctly", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(14 * 1024)).toBe("14 KB");
    expect(formatFileSize(256 * 1024)).toBe("256 KB");
    expect(formatFileSize(1024 * 1024 * 2)).toBe("2.0 MB");
  });
});
