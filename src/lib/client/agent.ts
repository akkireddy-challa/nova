import type {
  AgentThought,
  ChatMessage,
  ConversationTurn,
  GenerativeArtifact,
} from "@/lib/types";

/** Error codes returned by POST /api/agent (see docs/team/SPRINT2.md). */
export type AgentErrorCode =
  | "NO_PROVIDER"
  | "PROVIDER_ERROR"
  | "INVALID_OUTPUT"
  | "BAD_REQUEST"
  | "NETWORK";

/** A chat message that records a failed request instead of an answer. Stored alongside normal messages. */
export interface ErrorChatMessage extends ChatMessage {
  errorCode: AgentErrorCode;
}

export function isErrorMessage(msg: ChatMessage): msg is ErrorChatMessage {
  return typeof (msg as Partial<ErrorChatMessage>).errorCode === "string";
}

const KNOWN_CODES: AgentErrorCode[] = [
  "NO_PROVIDER",
  "PROVIDER_ERROR",
  "INVALID_OUTPUT",
  "BAD_REQUEST",
];

/** Extracts `{error, code}` from a failed response body; falls back to the HTTP status. */
export function parseAgentError(
  body: unknown,
  status: number,
): { message: string; code: AgentErrorCode } {
  const rec =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const rawCode = typeof rec.code === "string" ? rec.code : "";
  const code = (KNOWN_CODES as string[]).includes(rawCode)
    ? (rawCode as AgentErrorCode)
    : "PROVIDER_ERROR";
  const message =
    typeof rec.error === "string" && rec.error.trim()
      ? rec.error
      : `Request failed with HTTP ${status}.`;
  return { message, code };
}

// ---------------------------------------------------------------------------
// Stopped requests
// ---------------------------------------------------------------------------

/** A neutral marker left in the conversation when the user stops a request. */
export interface StoppedChatMessage extends ChatMessage {
  stopped: true;
}

export function isStoppedMessage(msg: ChatMessage): msg is StoppedChatMessage {
  return (msg as Partial<StoppedChatMessage>).stopped === true;
}

/** Steps still "running" when the user stopped are marked as stopped rather than left spinning. */
export function settleStoppedSteps(steps: AgentThought[]): AgentThought[] {
  return steps.map((step) =>
    step.status === "running"
      ? { ...step, status: "warn", details: "Stopped before it finished" }
      : step,
  );
}

/** Merges a streamed step into the list: a step with a known id replaces the earlier version. */
export function upsertStep(
  steps: AgentThought[],
  step: AgentThought,
): AgentThought[] {
  const index = steps.findIndex((s) => s.id === step.id);
  if (index === -1) return [...steps, step];
  const next = steps.slice();
  next[index] = step;
  return next;
}

// ---------------------------------------------------------------------------
// Conversation history for follow-up questions
// ---------------------------------------------------------------------------

export const HISTORY_MAX_TURNS = 10;
export const HISTORY_MAX_CHARS = 4000;

/** A one-paragraph text summary of an artifact so follow-ups like "point 2" have something to refer to. */
export function summarizeArtifact(artifact: GenerativeArtifact): string {
  switch (artifact.type) {
    case "research": {
      const points = artifact.data.keyFindings
        .map((f, i) => `${i + 1}. ${f.point}`)
        .join("\n");
      return `Research report "${artifact.data.title}". Key findings:\n${points}`;
    }
    case "plan":
      return `Plan for "${artifact.data.goal}" (${artifact.data.timeframe}). Phases: ${artifact.data.phases.map((p, i) => `${i + 1}. ${p.phaseName}`).join("; ")}`;
    case "matrix":
      return `Decision matrix "${artifact.data.topic}". Options: ${artifact.data.options.map((o) => o.name).join(", ")}. Verdict: ${artifact.data.verdict}`;
    case "code":
      return `Code file ${artifact.data.filename} (${artifact.data.language}).`;
    case "debate":
      return `Debate "${artifact.data.topic}". Verdict: ${artifact.data.synthesisVerdict}`;
    case "chart":
      return `Chart "${artifact.data.title}". Insight: ${artifact.data.insight}`;
    default:
      return "";
  }
}

/**
 * The recent turns of a session to send as `history`: user and assistant text only (plus a short
 * artifact summary), skipping failed and stopped requests, capped to the API's limits.
 */
export function buildHistory(messages: ChatMessage[]): ConversationTurn[] {
  const turns: ConversationTurn[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role !== "user" && msg.role !== "assistant") continue;
    if (msg.role === "user") {
      // Skip a question whose answer failed or was stopped, so the history stays consistent.
      const reply = messages[i + 1];
      if (
        !reply ||
        reply.role !== "assistant" ||
        isErrorMessage(reply) ||
        isStoppedMessage(reply)
      )
        continue;
    } else if (isErrorMessage(msg) || isStoppedMessage(msg)) {
      continue;
    }
    const parts = [msg.content.trim()];
    if (msg.role === "assistant" && msg.artifact)
      parts.push(summarizeArtifact(msg.artifact));
    const content = parts
      .filter(Boolean)
      .join("\n\n")
      .slice(0, HISTORY_MAX_CHARS);
    if (content) turns.push({ role: msg.role, content });
  }
  return turns.slice(-HISTORY_MAX_TURNS);
}

// ---------------------------------------------------------------------------
// Streaming client for POST /api/agent (Accept: text/event-stream)
// ---------------------------------------------------------------------------

export interface SseEvent {
  event: string;
  data: string;
}

/** Incremental Server-Sent Events parser; feed it decoded text chunks split anywhere. */
export class SseParser {
  private buffer = "";

  push(chunk: string): SseEvent[] {
    this.buffer += chunk.replace(/\r\n?/g, "\n");
    const events: SseEvent[] = [];
    let boundary = this.buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const block = this.buffer.slice(0, boundary);
      this.buffer = this.buffer.slice(boundary + 2);
      const parsed = parseBlock(block);
      if (parsed) events.push(parsed);
      boundary = this.buffer.indexOf("\n\n");
    }
    return events;
  }
}

function parseBlock(block: string): SseEvent | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (!line || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
    if (field === "event") event = value;
    else if (field === "data") data.push(value);
  }
  return data.length > 0 ? { event, data: data.join("\n") } : null;
}

export type AgentOutcome =
  | { kind: "result"; data: Partial<ChatMessage> }
  | { kind: "error"; message: string; code: AgentErrorCode };

/**
 * POSTs to /api/agent asking for a stream, reports each step through `onStep`, and resolves with
 * the final result or error. Falls back to the JSON body when the server does not stream.
 * Rejects with an AbortError when `signal` fires.
 */
export async function requestAgent(
  body: Record<string, unknown>,
  options: {
    signal?: AbortSignal;
    onStep?: (step: AgentThought) => void;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<AgentOutcome> {
  const res = await (options.fetchImpl ?? fetch)("/api/agent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  const isStream = (res.headers.get("content-type") ?? "").includes(
    "text/event-stream",
  );
  if (!isStream || !res.body) {
    // Validation errors (and servers that do not stream) answer with plain JSON.
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) return { kind: "error", ...parseAgentError(data, res.status) };
    return { kind: "result", data: (data ?? {}) as Partial<ChatMessage> };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parser = new SseParser();
  try {
    while (true) {
      const { done, value } = await reader.read();
      const events = done
        ? parser.push(`${decoder.decode()}\n\n`)
        : parser.push(decoder.decode(value, { stream: true }));
      for (const evt of events) {
        const outcome = handleEvent(evt, options.onStep);
        if (outcome) return outcome;
      }
      if (done) break;
    }
  } finally {
    reader.cancel().catch(() => undefined);
  }
  if (options.signal?.aborted)
    throw new DOMException("The request was stopped.", "AbortError");
  return {
    kind: "error",
    message: "The connection closed before the answer arrived. Try again.",
    code: "NETWORK",
  };
}

function handleEvent(
  evt: SseEvent,
  onStep?: (step: AgentThought) => void,
): AgentOutcome | null {
  let data: unknown;
  try {
    data = JSON.parse(evt.data);
  } catch {
    return null;
  }
  if (evt.event === "step") {
    if (isThought(data)) onStep?.(data);
    return null;
  }
  if (evt.event === "result")
    return { kind: "result", data: (data ?? {}) as Partial<ChatMessage> };
  if (evt.event === "error")
    return { kind: "error", ...parseAgentError(data, 200) };
  return null;
}

function isThought(value: unknown): value is AgentThought {
  if (typeof value !== "object" || value === null) return false;
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.id === "string" &&
    typeof rec.agentName === "string" &&
    typeof rec.action === "string" &&
    typeof rec.status === "string"
  );
}
