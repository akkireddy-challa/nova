/**
 * Document Parser for Nova Open-Source Studio
 * Validates, sanitizes, and extracts content from user-attached local documents.
 */

export const SUPPORTED_EXTENSIONS = [
  ".txt",
  ".md",
  ".markdown",
  ".json",
  ".csv",
  ".tsv",
  ".html",
  ".xml",
  ".py",
  ".ts",
  ".js",
  ".yaml",
  ".yml",
] as const;

export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export const MAX_DOCUMENT_SIZE = 256 * 1024; // 256 KB per document

const MIME_TYPE_MAP: Record<string, string> = {
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".markdown": "text/markdown",
  ".json": "application/json",
  ".csv": "text/csv",
  ".tsv": "text/tab-separated-values",
  ".html": "text/html",
  ".xml": "application/xml",
  ".py": "text/x-python",
  ".ts": "text/typescript",
  ".js": "text/javascript",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
};

export interface ParsedDocument {
  name: string;
  type: string;
  content: string;
  size: number;
}

/**
 * Extracts lowercase file extension from filename including the dot (e.g. ".md").
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.slice(lastDot).toLowerCase();
}

/**
 * Checks whether a file extension is in the supported document whitelist.
 */
export function isSupportedDocument(filename: string): boolean {
  const ext = getFileExtension(filename);
  return SUPPORTED_EXTENSIONS.includes(ext as SupportedExtension);
}

/**
 * Strips non-printable ASCII control characters (preserving tabs, newlines, carriage returns)
 * and trims leading/trailing whitespace.
 */
export function cleanDocumentText(raw: string): string {
  // ASCII 0-31 and 127 except \t (9), \n (10), \r (13)
  const stripped = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return stripped.trim();
}

/**
 * Formats byte size into human-readable label (e.g. "14 KB", "350 B", "1.2 MB").
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Parses, validates, and cleans an attached local file.
 * Throws clean descriptive error if file is unsupported or exceeds 256 KB.
 */
export async function parseAttachedFile(file: File): Promise<ParsedDocument> {
  if (!file || !file.name) {
    throw new Error("Invalid file attachment: missing file or filename.");
  }

  const ext = getFileExtension(file.name);
  if (!isSupportedDocument(file.name)) {
    throw new Error(
      `Unsupported file type for "${file.name}". Supported formats: ${SUPPORTED_EXTENSIONS.join(", ")}`,
    );
  }

  if (file.size > MAX_DOCUMENT_SIZE) {
    const sizeKb = (file.size / 1024).toFixed(1);
    throw new Error(
      `File "${file.name}" (${sizeKb} KB) exceeds the maximum allowed limit of 256 KB.`,
    );
  }

  let rawContent = "";
  if (typeof file.text === "function") {
    rawContent = await file.text();
  } else if (typeof FileReader !== "undefined") {
    rawContent = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || "");
      reader.onerror = () =>
        reject(
          reader.error || new Error(`Failed to read file "${file.name}".`),
        );
      reader.readAsText(file);
    });
  } else {
    throw new Error("No file reader available in the current environment.");
  }

  const cleanedText = cleanDocumentText(rawContent);

  return {
    name: file.name,
    type: file.type || MIME_TYPE_MAP[ext] || "text/plain",
    content: cleanedText,
    size: file.size,
  };
}
