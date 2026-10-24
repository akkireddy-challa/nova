// Security, hardening, and input sanitization for Nova Open-Source Studio

export interface SanitizedInput {
  text: string;
  isSafe: boolean;
  warnings: string[];
}

const INJECTION_PATTERNS = [
  /ignore previous instructions/i,
  /system prompt override/i,
  /reveal your internal instructions/i,
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
];

export function sanitizeUserInput(input: string, maxLength: number = 8000): SanitizedInput {
  const warnings: string[] = [];
  let isSafe = true;

  if (!input) {
    return { text: '', isSafe: true, warnings: [] };
  }

  // Length hardening
  let cleaned = input.trim();
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
    warnings.push(`Input truncated to ${maxLength} characters to prevent context overflow.`);
  }

  // Strip script tags
  if (/<script\b/i.test(cleaned)) {
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    warnings.push('Potentially harmful script tags were stripped.');
    isSafe = false;
  }

  // Detect prompt injection attempts
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(cleaned)) {
      warnings.push('Security Alert: Suspected prompt injection or system override pattern detected.');
      isSafe = false;
      break;
    }
  }

  return {
    text: cleaned,
    isSafe,
    warnings,
  };
}

export function sanitizeInput(input: string, maxLength: number = 8000): string {
  return sanitizeUserInput(input, maxLength).text;
}

export function validateAttachmentSize(bytes: number, maxBytes: number = 5 * 1024 * 1024): boolean {
  return bytes > 0 && bytes <= maxBytes;
}
