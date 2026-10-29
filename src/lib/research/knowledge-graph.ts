import type { SourceCitation } from "@/lib/types";

export type KnowledgeGraphNodeType =
  "concept" | "source" | "entity" | "finding";

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: KnowledgeGraphNodeType;
  degree: number;
  url?: string;
  domain?: string;
  snippet?: string;
  x?: number;
  y?: number;
  confidence?: "high" | "medium" | "low";
}

export interface KnowledgeGraphEdge {
  source: string;
  target: string;
  label?: string;
  weight: number;
}

export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

export interface KnowledgeGraphFindingInput {
  text?: string;
  point?: string;
  description?: string;
  citationIds?: string[];
  confidence?: "high" | "medium" | "low";
}

export interface ExtractKnowledgeGraphData {
  title: string;
  findings?: Array<
    { text: string; citationIds?: string[] } | KnowledgeGraphFindingInput
  >;
  sources?: SourceCitation[];
  topic?: string;
}

const COMMON_STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "so",
  "as",
  "at",
  "by",
  "for",
  "in",
  "of",
  "on",
  "to",
  "with",
  "about",
  "against",
  "between",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "from",
  "up",
  "down",
  "in",
  "out",
  "on",
  "off",
  "over",
  "under",
  "again",
  "further",
  "then",
  "once",
  "here",
  "there",
  "when",
  "where",
  "why",
  "how",
  "all",
  "any",
  "both",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "than",
  "too",
  "very",
  "can",
  "will",
  "just",
  "should",
  "now",
  "this",
  "that",
  "these",
  "those",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "having",
  "do",
  "does",
  "did",
  "doing",
  "would",
  "could",
  "shall",
  "executive summary",
  "key findings",
  "key finding",
  "findings",
  "finding",
  "figure",
  "table",
  "section",
  "chapter",
  "result",
  "results",
  "overview",
  "study",
  "report",
  "conclusion",
  "conclusions",
  "discussion",
  "background",
  "method",
  "methods",
  "data",
  "source",
  "sources",
  "analysis",
  "evidence",
  "synthesized evidence",
  "in addition",
  "according to",
  "as well",
  "due to",
  "based on",
  "along with",
  "instead of",
  "also",
  "therefore",
  "furthermore",
  "moreover",
  "however",
  "although",
  "whereas",
  "while",
]);

const KNOWN_ENTITY_PATTERNS = new Set([
  "llm",
  "rag",
  "api",
  "gpu",
  "tpu",
  "cpu",
  "ai",
  "ml",
  "nlp",
  "json",
  "svg",
  "url",
  "rrf",
  "ssrf",
  "dag",
  "bm25",
  "http",
  "https",
  "css",
  "html",
  "sql",
  "gcp",
  "aws",
  "azure",
  "sdk",
  "cli",
  "ui",
  "ux",
  "rest",
  "deepmind",
  "google",
  "openai",
  "anthropic",
  "meta",
  "microsoft",
  "nvidia",
  "claude",
  "gemini",
  "gpt",
  "python",
  "typescript",
  "javascript",
  "react",
  "next.js",
  "fastapi",
  "docker",
  "kubernetes",
  "postgres",
  "postgresql",
  "redis",
  "mongodb",
  "pinecone",
  "weaviate",
  "qdrant",
  "chroma",
  "faiss",
  "milvus",
  "tavily",
]);

function cleanPhrase(phrase: string): string {
  return phrase
    .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripLeadingStopwords(phrase: string): string {
  const parts = phrase.split(" ");
  while (parts.length > 1 && COMMON_STOP_WORDS.has(parts[0].toLowerCase())) {
    parts.shift();
  }
  return parts.join(" ");
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Extracts candidate concepts and entities from real text without fake data.
 */
function extractEntitiesAndConcepts(
  texts: string[],
): Array<{ label: string; type: "concept" | "entity"; count: number }> {
  const candidateCounts = new Map<
    string,
    { original: string; count: number; isEntity: boolean }
  >();

  const registerCandidate = (raw: string, forceEntity = false) => {
    let cleaned = cleanPhrase(raw);
    cleaned = stripLeadingStopwords(cleaned);
    if (!cleaned || cleaned.length < 2) return;

    const lower = cleaned.toLowerCase();
    if (COMMON_STOP_WORDS.has(lower)) return;

    // Check if it's all digits or empty
    if (/^\d+$/.test(cleaned)) return;

    const isAcronym = /^[A-Z]{2,6}$/.test(cleaned);
    const isKnownEntity = KNOWN_ENTITY_PATTERNS.has(lower);
    const isTechPattern =
      /\.(js|ts|py|ai|io)$/i.test(cleaned) || /[a-z][A-Z]/.test(cleaned);
    const isEntity = forceEntity || isAcronym || isKnownEntity || isTechPattern;

    const existing = candidateCounts.get(lower);
    if (existing) {
      existing.count += 1;
      // Prefer capitalized/cased version
      if (
        cleaned !== cleaned.toLowerCase() &&
        existing.original === existing.original.toLowerCase()
      ) {
        existing.original = cleaned;
      }
    } else {
      candidateCounts.set(lower, {
        original: cleaned,
        count: 1,
        isEntity,
      });
    }
  };

  for (const text of texts) {
    if (!text) continue;

    // 1. Multi-word capitalized phrases (2-4 words)
    const multiWordRegex =
      /\b[A-Z][a-zA-Z0-9'’]*(?:\s+[A-Z][a-zA-Z0-9'’]*){1,3}\b/g;
    let match: RegExpExecArray | null = null;
    while ((match = multiWordRegex.exec(text)) !== null) {
      registerCandidate(match[0]);
    }

    // 2. Acronyms (2-6 uppercase letters)
    const acronymRegex = /\b[A-Z]{2,6}\b/g;
    while ((match = acronymRegex.exec(text)) !== null) {
      registerCandidate(match[0], true);
    }

    // 3. Known entity names from pattern list
    for (const entityName of KNOWN_ENTITY_PATTERNS) {
      const boundaryRegex = new RegExp(
        `\\b${escapeRegExp(entityName)}\\b`,
        "i",
      );
      const entityMatch = boundaryRegex.exec(text);
      if (entityMatch) {
        registerCandidate(entityMatch[0], true);
      }
    }
  }

  // Filter candidates: keep those with meaningful count and sort by significance
  const results = Array.from(candidateCounts.values())
    .filter((c) => {
      // Must not be a single short generic word unless it's an acronym or known entity
      if (!c.isEntity && !c.original.includes(" ") && c.original.length < 5) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.count - a.count || b.original.length - a.original.length)
    .slice(0, 18); // Keep top 18 concepts to maintain an uncluttered, readable network

  return results.map((c) => ({
    label: c.original,
    type: c.isEntity ? "entity" : "concept",
    count: c.count,
  }));
}

/**
 * Resolves a citation reference to a source node.
 */
function resolveCitation(
  citationRef: string,
  sources: SourceCitation[],
): SourceCitation | null {
  if (!sources || sources.length === 0) return null;
  const refStr = String(citationRef).trim();

  // 1. Exact match on source.id
  const direct = sources.find((s) => s.id === refStr);
  if (direct) return direct;

  // 2. Parse numbers from [1], 1, src-1, source-1, c1, etc.
  const numMatch = refStr.match(/^\[?(?:src-|source-?|c)?(\d+)\]?$/i);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    const byId = sources.find(
      (s) =>
        s.id === String(num) ||
        s.id === `src-${num}` ||
        s.id === `source-${num}`,
    );
    if (byId) return byId;

    // 1-based index
    if (num >= 1 && num <= sources.length) {
      return sources[num - 1];
    }
  }

  // 3. Fallback match by domain or URL substring
  if (refStr.includes("http") || refStr.includes(".")) {
    const byUrl = sources.find((s) => s.url === refStr || s.domain === refStr);
    if (byUrl) return byUrl;
  }

  return null;
}

/**
 * Computes deterministic 2D layout coordinates for knowledge graph nodes.
 * Strictly uses deterministic trigonometry and force relaxation with zero Math.random.
 */
function computeDeterministicLayout(
  nodes: KnowledgeGraphNode[],
  edges: KnowledgeGraphEdge[],
  width = 800,
  height = 600,
): void {
  if (nodes.length === 0) return;

  const cx = width / 2;
  const cy = height / 2;

  // Group nodes by category to arrange concentric orbits
  const concepts = nodes.filter(
    (n) => n.type === "concept" || n.type === "entity",
  );
  const findings = nodes.filter((n) => n.type === "finding");
  const sources = nodes.filter((n) => n.type === "source");

  // Initial deterministic concentric ring placement
  concepts.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / (concepts.length || 1) - Math.PI / 2;
    const r = Math.min(cx, cy) * 0.35;
    node.x = cx + r * Math.cos(angle);
    node.y = cy + r * Math.sin(angle);
  });

  findings.forEach((node, i) => {
    const angle =
      (2 * Math.PI * i) / (findings.length || 1) - Math.PI / 2 + 0.2;
    const r = Math.min(cx, cy) * 0.65;
    node.x = cx + r * Math.cos(angle);
    node.y = cy + r * Math.sin(angle);
  });

  sources.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / (sources.length || 1) - Math.PI / 2 + 0.4;
    const r = Math.min(cx, cy) * 0.88;
    node.x = cx + r * Math.cos(angle);
    node.y = cy + r * Math.sin(angle);
  });

  // Edge lookup for spring relaxation
  const nodeMap = new Map<string, KnowledgeGraphNode>(
    nodes.map((n) => [n.id, n]),
  );

  // Deterministic relaxation steps (cooling schedule)
  const iterations = 35;
  for (let iter = 0; iter < iterations; iter++) {
    const cooling = (1 - iter / iterations) * 0.5;

    // Node-Node Repulsion
    for (let i = 0; i < nodes.length; i++) {
      const u = nodes[i];
      let fx = 0;
      let fy = 0;

      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const v = nodes[j];
        const dx = (u.x ?? cx) - (v.x ?? cx);
        const dy = (u.y ?? cy) - (v.y ?? cy);
        const distSq = dx * dx + dy * dy + 1;
        const dist = Math.sqrt(distSq);

        // Repulsive force: inverse square law
        const rep = (1200 / distSq) * cooling;
        fx += (dx / dist) * rep;
        fy += (dy / dist) * rep;
      }

      // Gravitational pull toward center to prevent drift
      const toCenterX = cx - (u.x ?? cx);
      const toCenterY = cy - (u.y ?? cy);
      fx += toCenterX * 0.015 * cooling;
      fy += toCenterY * 0.015 * cooling;

      u.x = (u.x ?? cx) + fx;
      u.y = (u.y ?? cy) + fy;
    }

    // Edge Attraction (Hooke's Spring Law)
    for (const edge of edges) {
      const u = nodeMap.get(edge.source);
      const v = nodeMap.get(edge.target);
      if (!u || !v) continue;

      const dx = (v.x ?? cx) - (u.x ?? cx);
      const dy = (v.y ?? cy) - (u.y ?? cy);
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;

      const idealDist =
        edge.label === "cites" ? 110 : edge.label === "mentions" ? 95 : 130;
      const displacement = (dist - idealDist) * 0.03 * edge.weight * cooling;

      const ax = (dx / dist) * displacement;
      const ay = (dy / dist) * displacement;

      u.x = (u.x ?? cx) + ax;
      u.y = (u.y ?? cy) + ay;
      v.x = (v.x ?? cx) - ax;
      v.y = (v.y ?? cy) - ay;
    }
  }

  // Constrain coordinates within safe canvas padding and round to 1 decimal place
  const paddingX = 65;
  const paddingY = 55;
  for (const node of nodes) {
    const clampedX = Math.max(
      paddingX,
      Math.min(width - paddingX, node.x ?? cx),
    );
    const clampedY = Math.max(
      paddingY,
      Math.min(height - paddingY, node.y ?? cy),
    );
    node.x = Math.round(clampedX * 10) / 10;
    node.y = Math.round(clampedY * 10) / 10;
  }
}

/**
 * Extracts an interactive knowledge graph and citation network from research data.
 * Zero fake data: all nodes, edges, and metrics are derived strictly from actual findings and sources.
 */
export function extractKnowledgeGraph(
  data: ExtractKnowledgeGraphData,
): KnowledgeGraph {
  const nodes: KnowledgeGraphNode[] = [];
  const edges: KnowledgeGraphEdge[] = [];

  const rawFindings = data.findings || [];
  const rawSources = data.sources || [];
  const title = data.title || data.topic || "";

  // 1. Source Nodes
  const sourceNodeMap = new Map<string, KnowledgeGraphNode>();
  const sourceLookupMap = new Map<string, string>(); // ref -> node.id

  rawSources.forEach((src, idx) => {
    const rawId = src.id ? String(src.id).trim() : `src-${idx + 1}`;
    const nodeId = `source-${slugify(rawId) || idx + 1}`;
    const displayLabel = src.title?.trim() || src.domain || `Source ${idx + 1}`;

    const sourceNode: KnowledgeGraphNode = {
      id: nodeId,
      label: displayLabel,
      type: "source",
      degree: 0,
      url: src.url,
      domain: src.domain,
      snippet: src.snippet,
    };

    nodes.push(sourceNode);
    sourceNodeMap.set(nodeId, sourceNode);

    // Map variations to this sourceNode.id
    sourceLookupMap.set(nodeId, nodeId);
    if (src.id) sourceLookupMap.set(String(src.id), nodeId);
    sourceLookupMap.set(`src-${idx + 1}`, nodeId);
    sourceLookupMap.set(`source-${idx + 1}`, nodeId);
    sourceLookupMap.set(String(idx + 1), nodeId);
    sourceLookupMap.set(`[${idx + 1}]`, nodeId);
    if (src.url) sourceLookupMap.set(src.url, nodeId);
  });

  // 2. Finding Nodes
  const findingNodes: KnowledgeGraphNode[] = [];
  const findingTexts: string[] = [];

  rawFindings.forEach((finding, idx) => {
    const rawPoint = "point" in finding ? finding.point : undefined;
    const rawDesc = "description" in finding ? finding.description : undefined;
    const rawConfidence =
      "confidence" in finding ? finding.confidence : undefined;
    const rawText = "text" in finding ? finding.text : undefined;

    const text =
      rawText?.trim() ||
      [rawPoint, rawDesc].filter(Boolean).join(": ").trim() ||
      `Finding ${idx + 1}`;

    const findingId = `finding-${idx + 1}`;
    const label =
      rawPoint?.trim() ||
      (text.length > 55 ? `${text.slice(0, 52).trim()}...` : text);

    const findingNode: KnowledgeGraphNode = {
      id: findingId,
      label,
      type: "finding",
      degree: 0,
      snippet: text,
      confidence: rawConfidence,
    };

    nodes.push(findingNode);
    findingNodes.push(findingNode);
    findingTexts.push(text);
  });

  // 3. Concept and Entity Nodes (Extracted from real findings, title, and sources)
  const corpus = [
    title,
    ...findingTexts,
    ...rawSources.map((s) => `${s.title} ${s.snippet || ""}`),
  ];
  const extracted = extractEntitiesAndConcepts(corpus);

  const conceptNodes: KnowledgeGraphNode[] = [];
  const conceptNodeMap = new Map<string, KnowledgeGraphNode>();

  for (const item of extracted) {
    const slug = slugify(item.label);
    const nodeId = `${item.type}-${slug}`;

    // Ensure uniqueness
    if (conceptNodeMap.has(nodeId)) continue;

    const conceptNode: KnowledgeGraphNode = {
      id: nodeId,
      label: item.label,
      type: item.type,
      degree: 0,
      snippet: `Extracted ${item.type} from research synthesis evidence (${item.count} occurrences)`,
    };

    nodes.push(conceptNode);
    conceptNodes.push(conceptNode);
    conceptNodeMap.set(nodeId, conceptNode);
  }

  // 4. Edges: Finding -> Source ("cites")
  const edgeKeyMap = new Map<string, KnowledgeGraphEdge>();

  const addEdge = (
    source: string,
    target: string,
    label: string,
    weight = 1,
  ) => {
    if (source === target) return;
    const key = `${source}->${target}:${label}`;
    const existing = edgeKeyMap.get(key);
    if (existing) {
      existing.weight += weight;
    } else {
      const edge: KnowledgeGraphEdge = { source, target, label, weight };
      edgeKeyMap.set(key, edge);
      edges.push(edge);
    }
  };

  rawFindings.forEach((finding, idx) => {
    const findingNode = findingNodes[idx];
    if (!findingNode) return;

    const citationIds = Array.isArray(finding.citationIds)
      ? finding.citationIds
      : [];
    for (const cRef of citationIds) {
      let resolvedNodeId = sourceLookupMap.get(String(cRef).trim());
      if (!resolvedNodeId) {
        const resolvedSrc = resolveCitation(String(cRef), rawSources);
        if (resolvedSrc) {
          resolvedNodeId = sourceLookupMap.get(String(resolvedSrc.id));
        }
      }

      if (resolvedNodeId && sourceNodeMap.has(resolvedNodeId)) {
        addEdge(findingNode.id, resolvedNodeId, "cites", 1);
      }
    }
  });

  // 5. Edges: Finding -> Concept / Entity ("mentions")
  // and Concept <-> Concept co-occurrences ("relates_to")
  const coOccurrences = new Map<string, number>();

  rawFindings.forEach((finding, idx) => {
    const findingNode = findingNodes[idx];
    const text = findingTexts[idx];
    if (!findingNode || !text) return;

    const mentionedConcepts: KnowledgeGraphNode[] = [];

    for (const cNode of conceptNodes) {
      const regex = new RegExp(`\\b${escapeRegExp(cNode.label)}\\b`, "i");
      if (regex.test(text)) {
        addEdge(findingNode.id, cNode.id, "mentions", 1);
        mentionedConcepts.push(cNode);
      }
    }

    // Co-occurring concepts in the same finding
    for (let i = 0; i < mentionedConcepts.length; i++) {
      for (let j = i + 1; j < mentionedConcepts.length; j++) {
        const idA = mentionedConcepts[i].id;
        const idB = mentionedConcepts[j].id;
        const pairKey = idA < idB ? `${idA}::${idB}` : `${idB}::${idA}`;
        coOccurrences.set(pairKey, (coOccurrences.get(pairKey) || 0) + 1);
      }
    }
  });

  // Add relates_to edges between co-occurring concepts
  for (const [pairKey, count] of coOccurrences.entries()) {
    const [source, target] = pairKey.split("::");
    addEdge(source, target, "relates_to", count);
  }

  // 6. Deterministic Node Degrees
  for (const node of nodes) {
    let incidentCount = 0;
    for (const edge of edges) {
      if (edge.source === node.id || edge.target === node.id) {
        incidentCount += 1;
      }
    }
    node.degree = incidentCount;
  }

  // 7. Deterministic 2D Layout Coordinates
  computeDeterministicLayout(nodes, edges);

  return { nodes, edges };
}
