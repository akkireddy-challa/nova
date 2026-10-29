import type { ThinkingBudget } from "./types";

export interface AgentPersona {
  id: string;
  name: string;
  icon: string;
  roleTitle: string;
  description: string;
  systemPrompt: string;
  defaultBudget: ThinkingBudget;
  verificationThreshold: number; // e.g. 80 (%)
  isCustom?: boolean;
}

export interface PersonasBundle {
  version: string;
  exportedAt: string;
  type: "nova-agent-personas";
  personas: AgentPersona[];
}

export const STORAGE_KEY_CUSTOM_PERSONAS = "nova_custom_agent_personas";
export const STORAGE_KEY_ACTIVE_PERSONA = "nova_active_persona_id";

export const DEFAULT_PERSONAS: readonly AgentPersona[] = [
  {
    id: "market-analyst",
    name: "Market Intelligence Analyst",
    icon: "TrendingUp",
    roleTitle: "Strategic Market & Competitive Intelligence Specialist",
    description:
      "Market intelligence, competitor pricing, feature matrices, TAM/SAM/SOM, market share estimation.",
    systemPrompt: `You are a Principal Strategic Market & Competitive Intelligence Specialist.
Your mission is to provide institutional-grade market intelligence, competitor teardowns, and rigorous market sizing.

Operational Directives:
1. Market Sizing: Calculate and deconstruct TAM (Total Addressable Market), SAM (Serviceable Addressable Market), and SOM (Serviceable Obtainable Market) with explicit top-down and bottom-up assumptions.
2. Competitive Feature Matrices: Build granular feature-by-feature comparison matrices, pricing tiers, and packaging analyses across key incumbents and emerging disruptors.
3. Pricing & Monetization: Analyze unit pricing, seat/usage billing metrics, discounting structures, and willingness-to-pay elasticity.
4. Market Share & Dynamics: Quantify market share distributions, customer switching barriers, multi-homing costs, and network effects.
5. Strategic Frameworks: Apply Porter's Five Forces, Blue Ocean Strategy, and SWOT analysis grounded strictly in verifiable market signals and empirical data.

Standards:
- Demand verified metrics and cite industry sources whenever possible.
- Avoid vague hand-waving or unbacked hyperbole.
- Detail risks, distribution bottlenecks, and regulatory hurdles alongside opportunities.`,
    defaultBudget: "analytical",
    verificationThreshold: 85,
    isCustom: false,
  },
  {
    id: "tech-architect",
    name: "Principal Systems Architect",
    icon: "Cpu",
    roleTitle: "Distributed Systems & Cloud Architecture Lead",
    description:
      "Technical architecture review, scalability bottlenecks, security posture, concurrency models, API design.",
    systemPrompt: `You are a Principal Systems Architect and Distributed Infrastructure Specialist.
Your mission is to review complex architectures, diagnose scalability bottlenecks, audit security postures, and design fault-tolerant computing platforms.

Operational Directives:
1. Architecture Review: Scrutinize system topology, microservices vs modular monolith trade-offs, service mesh overhead, and event-driven architectures.
2. Scalability & Latency: Detect throughput bottlenecks, hot spots, single points of failure (SPOF), tail latency (p99/p99.9), and backpressure strategies.
3. Concurrency & Consistency: Evaluate concurrency models, lock contention, caching strategies (Redis write-through/write-around), and consistency guarantees (ACID vs BASE, CAP theorem trade-offs).
4. Security Posture: Audit zero-trust principles, mTLS, OAuth2/OIDC flows, RBAC/ABAC authorization models, cryptographic hygiene, rate limiting, and attack surface minimization.
5. API & Contract Design: Formulate clean, idempotent REST, gRPC, or GraphQL contracts with schema versioning, backward compatibility, and distributed tracing (OpenTelemetry).

Standards:
- Provide concrete, production-grade architectural blueprints and trade-off matrices.
- Justify every technology recommendation with concrete latency, cost, and complexity trade-offs.
- Emphasize graceful degradation, circuit breaking, and operational maintainability.`,
    defaultBudget: "deep",
    verificationThreshold: 90,
    isCustom: false,
  },
  {
    id: "academic-critic",
    name: "Academic Peer Reviewer",
    icon: "GraduationCap",
    roleTitle: "Methodology Auditor & Empirical Science Critic",
    description:
      "Academic rigor, peer-reviewed methodology analysis, empirical significance, citation auditing.",
    systemPrompt: `You are an Academic Peer Reviewer and Empirical Methodology Auditor.
Your mission is to enforce scientific rigor, challenge epistemological assumptions, evaluate statistical validity, and audit empirical evidence.

Operational Directives:
1. Methodology Auditing: Rigorously critique experimental setups, sample sizing, cohort selection, observational biases, confounding variables, and baseline controls.
2. Statistical Rigor: Scrutinize statistical significance, effect sizes (Cohen's d, odds ratios), confidence intervals, p-values, power calculations, and risks of p-hacking or publication bias.
3. Citation & Literature Auditing: Verify claims against primary literature, distinguish empirical findings from theoretical conjecture or marketing claims, and actively detect hallucinated or misattributed references.
4. Logical Validity: Interrogate underlying premises, causal inference vs correlation, false dichotomies, and boundary conditions where conclusions fail.
5. Reproducibility & Open Science: Assess data availability, code replicability, pre-registration adherence, and methodological transparency.

Standards:
- Uphold the unsparing standard of top-tier peer-reviewed journals (Nature, Science, IEEE, ACM).
- Expose unstated assumptions and identify counter-evidence or confounding theories.
- Provide structured, constructive critiques distinguishing fatal flaws from minor limitations.`,
    defaultBudget: "deep",
    verificationThreshold: 95,
    isCustom: false,
  },
  {
    id: "financial-analyst",
    name: "Quantitative Financial Analyst",
    icon: "DollarSign",
    roleTitle: "Venture Capital & Unit Economics Specialist",
    description:
      "Financial due diligence, unit economics, gross margins, CAC/LTV, burn rate.",
    systemPrompt: `You are a Quantitative Financial Analyst and Venture Capital Due Diligence Specialist.
Your mission is to conduct exhaustive financial audits, stress-test unit economics, analyze cap tables, and model enterprise financial sustainability.

Operational Directives:
1. Unit Economics: Deconstruct Customer Acquisition Cost (CAC), Customer Lifetime Value (LTV), CAC/LTV and LTV/CAC ratio, CAC payback period (months), and retention cohorts.
2. Margin Analysis: Scrutinize gross margins, Cost of Goods Sold (COGS), hosting/infrastructure overhead, contribution margins, and operating leverage.
3. Burn & Runway: Calculate net burn rate, gross burn, cash runway under base/pessimistic/optimistic scenarios, and capital efficiency (Rule of 40, Magic Number, Hype Ratio).
4. Valuation & Sensitivity: Formulate discounted cash flow (DCF) models, comparable company analysis (trading multiples), and multi-variable sensitivity tables.
5. Financial Due Diligence: Identify revenue recognition caveats (ASC 606), customer concentration risk, working capital requirements, and hidden liabilities.

Standards:
- Deliver precise, quantitatively sound financial analysis with clear assumptions.
- Zero tolerance for hand-waving or unjustified multiplier inflation.
- Highlight sensitivity boundaries where profitability turns negative.`,
    defaultBudget: "analytical",
    verificationThreshold: 85,
    isCustom: false,
  },
];

/**
 * Returns a fresh copy of the default specialist personas.
 */
export function getDefaultPersonas(): AgentPersona[] {
  return DEFAULT_PERSONAS.map((p) => ({ ...p }));
}

/**
 * Sanitizes a string by stripping potential script tags and trimming whitespace.
 */
function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  let clean = value.trim();
  // Strip harmful script tags and javascript: links
  clean = clean.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    "",
  );
  clean = clean.replace(/javascript\s*:/gi, "");
  clean = clean.trim();
  if (clean.length > maxLength) {
    clean = clean.slice(0, maxLength);
  }
  return clean;
}

/**
 * Checks for prototype pollution attack vectors.
 */
function hasPrototypePollution(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return false;

  const forbiddenKeys = ["__proto__", "constructor", "prototype"];
  for (const key of forbiddenKeys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return true;
    }
  }

  for (const val of Object.values(obj as Record<string, unknown>)) {
    if (val && typeof val === "object") {
      if (hasPrototypePollution(val)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validates a single candidate object into a clean AgentPersona.
 */
export function validatePersona(
  data: unknown,
): { valid: true; persona: AgentPersona } | { valid: false; error: string } {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Persona must be a non-null object." };
  }

  if (hasPrototypePollution(data)) {
    return {
      valid: false,
      error:
        "Security rejection: Persona payload contains forbidden prototype keys.",
    };
  }

  const rec = data as Record<string, unknown>;

  const id = sanitizeText(rec.id, 64);
  if (!id) {
    return { valid: false, error: "Persona missing valid 'id'." };
  }
  // IDs must be alphanumeric or dashes/underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return {
      valid: false,
      error:
        "Persona 'id' must contain only letters, numbers, hyphens, or underscores.",
    };
  }

  const name = sanitizeText(rec.name, 100);
  if (!name) {
    return { valid: false, error: `Persona '${id}' missing valid 'name'.` };
  }

  const icon = sanitizeText(rec.icon, 50) || "Bot";
  const roleTitle = sanitizeText(rec.roleTitle, 150) || "Specialist Agent";
  const description = sanitizeText(rec.description, 500);
  if (!description) {
    return {
      valid: false,
      error: `Persona '${id}' missing valid 'description'.`,
    };
  }

  const systemPrompt = sanitizeText(rec.systemPrompt, 12000);
  if (!systemPrompt) {
    return {
      valid: false,
      error: `Persona '${id}' missing valid 'systemPrompt'.`,
    };
  }

  const validBudgets: ThinkingBudget[] = ["quick", "analytical", "deep"];
  const budgetCandidate = rec.defaultBudget as ThinkingBudget;
  const defaultBudget: ThinkingBudget = validBudgets.includes(budgetCandidate)
    ? budgetCandidate
    : "analytical";

  let verificationThreshold = 80;
  if (
    typeof rec.verificationThreshold === "number" &&
    !isNaN(rec.verificationThreshold)
  ) {
    verificationThreshold = Math.max(
      50,
      Math.min(100, Math.round(rec.verificationThreshold)),
    );
  }

  const isCustom = Boolean(rec.isCustom);

  return {
    valid: true,
    persona: {
      id,
      name,
      icon,
      roleTitle,
      description,
      systemPrompt,
      defaultBudget,
      verificationThreshold,
      isCustom,
    },
  };
}

/**
 * Loads all personas (built-in specialists merged with user custom personas from localStorage).
 */
export function loadPersonasFromStorage(): AgentPersona[] {
  const defaults = getDefaultPersonas();

  if (typeof window === "undefined" || !window.localStorage) {
    return defaults;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_CUSTOM_PERSONAS);
    if (!raw) return defaults;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaults;

    const customPersonas: AgentPersona[] = [];
    const defaultIds = new Set(defaults.map((d) => d.id));

    for (const item of parsed) {
      const res = validatePersona(item);
      if (res.valid && !defaultIds.has(res.persona.id)) {
        customPersonas.push({ ...res.persona, isCustom: true });
      }
    }

    return [...defaults, ...customPersonas];
  } catch {
    return defaults;
  }
}

/**
 * Saves or updates a custom persona in localStorage.
 * Built-in specialist personas cannot be overwritten.
 */
export function savePersonaToStorage(persona: AgentPersona): void {
  const val = validatePersona(persona);
  if (!val.valid) {
    throw new Error(`Cannot save invalid persona: ${val.error}`);
  }

  const defaultIds = new Set(DEFAULT_PERSONAS.map((d) => d.id));
  if (defaultIds.has(val.persona.id)) {
    throw new Error(
      `Cannot overwrite built-in specialist persona with id '${val.persona.id}'.`,
    );
  }

  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    const customList: AgentPersona[] = [];
    const raw = window.localStorage.getItem(STORAGE_KEY_CUSTOM_PERSONAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const res = validatePersona(item);
          if (res.valid && !defaultIds.has(res.persona.id)) {
            customList.push(res.persona);
          }
        }
      }
    }

    const personaToSave: AgentPersona = {
      ...val.persona,
      isCustom: true,
    };

    const existingIdx = customList.findIndex((p) => p.id === personaToSave.id);
    if (existingIdx >= 0) {
      customList[existingIdx] = personaToSave;
    } else {
      customList.push(personaToSave);
    }

    window.localStorage.setItem(
      STORAGE_KEY_CUSTOM_PERSONAS,
      JSON.stringify(customList),
    );
  } catch (err) {
    console.error("Failed to save persona to localStorage:", err);
  }
}

/**
 * Deletes a custom persona from localStorage by ID.
 * Built-in specialist personas are protected and will not be deleted.
 */
export function deletePersonaFromStorage(id: string): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  const defaultIds = new Set(DEFAULT_PERSONAS.map((d) => d.id));
  if (defaultIds.has(id)) {
    // Built-ins cannot be deleted
    return;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_CUSTOM_PERSONAS);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;

    const filtered = parsed.filter(
      (item) =>
        item &&
        typeof item === "object" &&
        (item as Record<string, unknown>).id !== id,
    );

    window.localStorage.setItem(
      STORAGE_KEY_CUSTOM_PERSONAS,
      JSON.stringify(filtered),
    );
  } catch (err) {
    console.error("Failed to delete persona from localStorage:", err);
  }
}

/**
 * Gets the active persona ID from storage or defaults to "market-analyst".
 */
export function getActivePersonaId(): string {
  if (typeof window === "undefined" || !window.localStorage) {
    return DEFAULT_PERSONAS[0].id;
  }
  try {
    const id = window.localStorage.getItem(STORAGE_KEY_ACTIVE_PERSONA);
    if (id && typeof id === "string" && id.trim()) {
      return id.trim();
    }
  } catch {
    // fallback
  }
  return DEFAULT_PERSONAS[0].id;
}

/**
 * Sets the active persona ID in storage.
 */
export function setActivePersonaId(id: string): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY_ACTIVE_PERSONA, id.trim());
  } catch {
    // ignore
  }
}

/**
 * Returns the currently active persona, matching against provided personas or storage.
 */
export function getActivePersona(personas?: AgentPersona[]): AgentPersona {
  const list =
    personas && personas.length > 0 ? personas : loadPersonasFromStorage();
  const activeId = getActivePersonaId();
  const match = list.find((p) => p.id === activeId);
  return match || list[0] || DEFAULT_PERSONAS[0];
}

/**
 * Exports personas as a standardized JSON bundle string.
 */
export function exportPersonasBundle(personas: AgentPersona[]): string {
  const bundle: PersonasBundle = {
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    type: "nova-agent-personas",
    personas: personas.map((p) => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      roleTitle: p.roleTitle,
      description: p.description,
      systemPrompt: p.systemPrompt,
      defaultBudget: p.defaultBudget,
      verificationThreshold: p.verificationThreshold,
      isCustom: Boolean(p.isCustom),
    })),
  };
  return JSON.stringify(bundle, null, 2);
}

/**
 * Imports and validates a personas JSON bundle (or array) with prototype pollution & XSS defenses.
 */
export function importPersonasBundle(
  json: string,
): { valid: true; personas: AgentPersona[] } | { valid: false; error: string } {
  if (!json || typeof json !== "string" || !json.trim()) {
    return { valid: false, error: "Empty or invalid JSON payload." };
  }

  // Pre-parse security check against prototype injection tokens
  if (
    json.includes('"__proto__"') ||
    json.includes('"constructor"') ||
    json.includes('"prototype"')
  ) {
    return {
      valid: false,
      error: "Security rejection: Payload contains forbidden prototype keys.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return {
      valid: false,
      error: "Malformed JSON syntax. Please provide valid JSON.",
    };
  }

  if (!parsed || typeof parsed !== "object") {
    return {
      valid: false,
      error: "Invalid bundle format: Root must be a JSON object or array.",
    };
  }

  if (hasPrototypePollution(parsed)) {
    return {
      valid: false,
      error:
        "Security rejection: Payload contains forbidden prototype properties.",
    };
  }

  let candidates: unknown[];
  if (Array.isArray(parsed)) {
    candidates = parsed;
  } else {
    const record = parsed as Record<string, unknown>;
    if ("personas" in record) {
      if (!Array.isArray(record.personas)) {
        return {
          valid: false,
          error: "Invalid bundle: 'personas' property must be an array.",
        };
      }
      candidates = record.personas;
    } else {
      return {
        valid: false,
        error: "Invalid bundle: Expected 'personas' array in bundle payload.",
      };
    }
  }

  if (candidates.length === 0) {
    return { valid: false, error: "Bundle contains no personas to import." };
  }

  const validatedList: AgentPersona[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < candidates.length; i++) {
    const res = validatePersona(candidates[i]);
    if (!res.valid) {
      return {
        valid: false,
        error: `Item ${i + 1} validation failed: ${res.error}`,
      };
    }
    if (seenIds.has(res.persona.id)) {
      return {
        valid: false,
        error: `Duplicate persona id '${res.persona.id}' found in bundle.`,
      };
    }
    seenIds.add(res.persona.id);
    validatedList.push(res.persona);
  }

  return { valid: true, personas: validatedList };
}

/**
 * Resolves full system prompt by prepending persona prompt to any base prompt.
 */
export function resolvePersonaSystemPrompt(
  persona: AgentPersona,
  basePrompt?: string,
): string {
  const personaPart = persona.systemPrompt.trim();
  if (!basePrompt || !basePrompt.trim()) {
    return personaPart;
  }
  return `${personaPart}\n\n---\nAdditional System Directives:\n${basePrompt.trim()}`;
}

/**
 * Initiates browser download of the persona bundle as a .json file.
 */
export function downloadPersonasBundle(
  personas: AgentPersona[],
  filename = "nova-agent-personas.json",
): void {
  if (typeof window === "undefined" || !window.document) return;
  try {
    const content = exportPersonasBundle(personas);
    const blob = new Blob([content], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Failed to download personas bundle:", err);
  }
}
