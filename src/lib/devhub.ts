import { VerificationAudit } from "./types";

export type TunnelTool = "cloudflared" | "localtunnel" | "ngrok";

export interface TunnelConfig {
  id: TunnelTool;
  name: string;
  command: (port: number) => string;
  installHint: string;
  recommendedFor: string;
}

export const TUNNEL_CONFIGS: Record<TunnelTool, TunnelConfig> = {
  cloudflared: {
    id: "cloudflared",
    name: "Cloudflare Tunnel",
    command: (port: number) =>
      `cloudflared tunnel --url http://localhost:${port}`,
    installHint: "brew install cloudflare/cloudflare/cloudflared",
    recommendedFor: "Free HTTPS, zero login required, no bandwidth cap",
  },
  localtunnel: {
    id: "localtunnel",
    name: "Localtunnel (npx)",
    command: (port: number) => `npx localtunnel --port ${port}`,
    installHint: "npx localtunnel --port 3000 (no install required)",
    recommendedFor: "Zero setup, instant temporary public tunnel",
  },
  ngrok: {
    id: "ngrok",
    name: "ngrok",
    command: (port: number) => `ngrok http ${port}`,
    installHint: "brew install ngrok/ngrok/ngrok",
    recommendedFor: "Industry-standard with rich local request inspector",
  },
};

/**
 * Validates whether a port number is a valid TCP port (1-65535).
 */
export function isValidPort(port: unknown): boolean {
  if (typeof port === "number") {
    return Number.isInteger(port) && port >= 1 && port <= 65535;
  }
  if (typeof port === "string") {
    const trimmed = port.trim();
    if (!/^\d+$/.test(trimmed)) return false;
    const num = parseInt(trimmed, 10);
    return num >= 1 && num <= 65535;
  }
  return false;
}

/**
 * Safely parse a port, falling back to 3000 if invalid.
 */
export function parsePort(port: unknown, fallback: number = 3000): number {
  if (isValidPort(port)) {
    return typeof port === "number" ? port : parseInt(String(port).trim(), 10);
  }
  return fallback;
}

/**
 * Generates the shell command to launch a public tunnel.
 */
export function generateTunnelCommand(
  tool: TunnelTool,
  port: unknown = 3000,
): string {
  const safePort = parsePort(port, 3000);
  const config = TUNNEL_CONFIGS[tool];
  if (!config) {
    throw new Error(`Unsupported tunnel tool: ${tool}`);
  }
  return config.command(safePort);
}

export type ApiSandboxMethod = "GET" | "POST";

export interface ApiSandboxEndpoint {
  id: string;
  path: string;
  method: ApiSandboxMethod;
  label: string;
  description: string;
  defaultBody?: string;
}

export const API_SANDBOX_ENDPOINTS: ApiSandboxEndpoint[] = [
  {
    id: "chat-completions",
    path: "/api/v1/chat/completions",
    method: "POST",
    label: "Chat Completions",
    description:
      "OpenAI-compatible inference endpoint for active configured providers.",
    defaultBody: JSON.stringify(
      {
        messages: [
          {
            role: "user",
            content:
              "Explain the difference between optimistic concurrency and pessimistic locking in one sentence.",
          },
        ],
        stream: false,
      },
      null,
      2,
    ),
  },
  {
    id: "models",
    path: "/api/v1/models",
    method: "GET",
    label: "List Models",
    description:
      "List all active models from configured providers (Gemini, Claude, OpenAI, Ollama).",
  },
  {
    id: "providers-status",
    path: "/api/v1/providers/status",
    method: "GET",
    label: "Provider Status",
    description:
      "Check live connectivity, latency, and model availability for all providers and search backends.",
  },
  {
    id: "tools",
    path: "/api/v1/tools",
    method: "GET",
    label: "MCP Tools Registry",
    description:
      "Inspect registered MCP plugins and available executable tools.",
  },
];

/**
 * Validates a JSON request payload.
 */
export function validateJsonPayload(payload: string): {
  valid: boolean;
  error?: string;
  parsed?: unknown;
} {
  const trimmed = payload.trim();
  if (!trimmed) {
    return { valid: true, parsed: undefined };
  }
  try {
    const parsed = JSON.parse(trimmed);
    return { valid: true, parsed };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Invalid JSON syntax",
    };
  }
}

/**
 * Formats a cURL command for an API request.
 */
export function formatCurlCommand(options: {
  method: ApiSandboxMethod;
  path: string;
  baseUrl?: string;
  body?: string;
  headers?: Record<string, string>;
}): string {
  const baseUrl =
    options.baseUrl?.replace(/\/+$/, "") || "http://localhost:3000";
  const url = `${baseUrl}${options.path.startsWith("/") ? "" : "/"}${options.path}`;
  const parts: string[] = [`curl -X ${options.method} "${url}"`];

  const headers = { ...options.headers };
  if (options.method === "POST" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  for (const [key, value] of Object.entries(headers)) {
    parts.push(`-H "${key}: ${value}"`);
  }

  if (options.method === "POST" && options.body && options.body.trim()) {
    // Minify JSON if valid to avoid multiline curl escaping issues, or escape single quotes
    const minified = (() => {
      try {
        return JSON.stringify(JSON.parse(options.body));
      } catch {
        return options.body.trim();
      }
    })();
    const escaped = minified.replace(/'/g, "'\\''");
    parts.push(`-d '${escaped}'`);
  }

  return parts.join(" \\\n  ");
}

export interface ClaimVerificationInput {
  text: string;
  hasCitation: boolean;
  contradiction?: boolean;
}

/**
 * Calculates evidence verification audit metrics from a set of claims.
 */
export function calculateVerificationAudit(
  claims: ClaimVerificationInput[],
): VerificationAudit {
  if (!claims || claims.length === 0) {
    return {
      verifiedClaims: 0,
      totalClaims: 0,
      sourceAlignment: 100,
      uncitedClaims: [],
      contradictions: [],
      status: "verified",
    };
  }

  const totalClaims = claims.length;
  const uncitedClaims: string[] = [];
  const contradictions: string[] = [];
  let verifiedCount = 0;

  for (const claim of claims) {
    if (claim.contradiction) {
      contradictions.push(claim.text);
    }
    if (!claim.hasCitation) {
      uncitedClaims.push(claim.text);
    }
    if (claim.hasCitation && !claim.contradiction) {
      verifiedCount++;
    }
  }

  const rawAlignment = (verifiedCount / totalClaims) * 100;
  const sourceAlignment = Math.min(100, Math.max(0, Math.round(rawAlignment)));

  let status: "verified" | "flagged" | "warning" = "verified";
  if (contradictions.length > 0) {
    status = "warning";
  } else if (uncitedClaims.length > 0 || sourceAlignment < 80) {
    status = "flagged";
  }

  return {
    verifiedClaims: verifiedCount,
    totalClaims,
    sourceAlignment,
    uncitedClaims: uncitedClaims.length > 0 ? uncitedClaims : undefined,
    contradictions: contradictions.length > 0 ? contradictions : undefined,
    status,
  };
}

/**
 * Returns formatted badge text: "${verifiedClaims} verified claims (${sourceAlignment}% alignment)"
 */
export function formatAuditBadgeText(audit: VerificationAudit): string {
  const verified = audit.verifiedClaims ?? 0;
  const alignment = audit.sourceAlignment ?? 0;
  return `${verified} verified claims (${alignment}% alignment)`;
}

/**
 * Determines styling and tone for a VerificationAudit result.
 */
export function getAuditStatusVariant(audit: VerificationAudit): {
  color: "emerald" | "amber" | "rose";
  badgeClass: string;
  icon: "check" | "alert" | "warning";
  label: string;
} {
  const hasContradictions = Boolean(
    audit.contradictions && audit.contradictions.length > 0,
  );
  const hasUncited = Boolean(
    audit.uncitedClaims &&
    (Array.isArray(audit.uncitedClaims)
      ? audit.uncitedClaims.length > 0
      : audit.uncitedClaims > 0),
  );

  if (hasContradictions || audit.status === "warning") {
    return {
      color: "rose",
      badgeClass:
        "bg-rose-500/10 text-rose-300 border-rose-500/30 hover:border-rose-400",
      icon: "warning",
      label: "Contradiction Detected",
    };
  }

  if (hasUncited || audit.status === "flagged" || audit.sourceAlignment < 80) {
    return {
      color: "amber",
      badgeClass:
        "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:border-amber-400",
      icon: "alert",
      label: "Uncited Claims Detected",
    };
  }

  return {
    color: "emerald",
    badgeClass:
      "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:border-emerald-400",
    icon: "check",
    label: "Fully Verified",
  };
}
