import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  PipelineAbortedError,
  PipelineError,
  processAgentRequest,
} from "@/lib/ai-gateway";
import { ModelSelectionError } from "@/lib/providers";
import {
  NoProviderConfiguredError,
  ProviderError,
} from "@/lib/providers/types";
import type {
  AgentThought,
  Attachment,
  StudioMode,
  ThinkingBudget,
} from "@/lib/types";

type ErrorCode =
  "NO_PROVIDER" | "PROVIDER_ERROR" | "INVALID_OUTPUT" | "BAD_REQUEST";

const MODES = [
  "research",
  "planner",
  "canvas",
  "coder",
  "matrix",
  "debate",
  "intelligence",
  "mcp",
] as const satisfies readonly StudioMode[];
const BUDGETS = [
  "quick",
  "analytical",
  "deep",
] as const satisfies readonly ThinkingBudget[];

const attachmentSchema = z.object({
  id: z.string(),
  name: z.string().max(300),
  size: z.number(),
  type: z.string().max(200),
  content: z.string().max(15_000_000),
});

const requestSchema = z.object({
  prompt: z.string().max(20_000).optional(),
  mode: z.enum(MODES).default("research"),
  model: z.string().max(200).optional(),
  attachments: z.array(attachmentSchema).max(10).optional(),
  thinkingBudget: z.enum(BUDGETS).default("analytical"),
  context: z.string().max(50_000).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4_000),
      }),
    )
    .max(10)
    .optional(),
});

function errorResponse(error: string, code: ErrorCode, status: number) {
  return NextResponse.json({ error, code }, { status });
}

/** Clients opt into Server-Sent Events with `Accept: text/event-stream`. */
function wantsStream(req: NextRequest): boolean {
  return (req.headers.get("accept") ?? "")
    .toLowerCase()
    .includes("text/event-stream");
}

/** Strips anything that could leak endpoints or credentials from an upstream error message. */
function safeMessage(message: string): string {
  return message
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/\b(?:sk|pk|rk|gsk|tvly|AIza)[-_A-Za-z0-9]{8,}/g, "[redacted]")
    .replace(/([?&](?:key|api_key|token)=)[^&\s]+/gi, "$1[redacted]")
    .slice(0, 300);
}

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return errorResponse(
      "Request body must be valid JSON.",
      "BAD_REQUEST",
      400,
    );
  }

  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return errorResponse(
      `Invalid request: ${issue.path.join(".") || "body"} ${issue.message}`,
      "BAD_REQUEST",
      400,
    );
  }
  const body = parsed.data;
  const attachments: Attachment[] = body.attachments ?? [];
  const prompt =
    body.prompt?.trim() ||
    (attachments.length > 0 ? "Analyze the attached files." : "");
  if (!prompt) {
    return errorResponse(
      "Prompt or attachment is required.",
      "BAD_REQUEST",
      400,
    );
  }
  const input = {
    prompt,
    mode: body.mode,
    context: body.context,
    model: body.model?.trim() || undefined,
    attachments,
    thinkingBudget: body.thinkingBudget,
    history: body.history,
  };

  if (wantsStream(req)) return streamResponse(req, input);

  try {
    const result = await processAgentRequest(input, { signal: req.signal });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PipelineAbortedError || req.signal.aborted) {
      // The client went away; nobody reads this body.
      return new Response(null, { status: 499 });
    }
    const { error: message, code, status } = classifyError(error);
    return errorResponse(message, code, status);
  }
}

type AgentInput = Parameters<typeof processAgentRequest>[0];

/** Maps pipeline/provider errors to the public `{error, code}` contract and an HTTP status. */
function classifyError(error: unknown): {
  error: string;
  code: ErrorCode;
  status: number;
} {
  if (error instanceof NoProviderConfiguredError) {
    return { error: error.message, code: "NO_PROVIDER", status: 503 };
  }
  if (error instanceof ModelSelectionError) {
    return {
      error: safeMessage(error.message),
      code: "BAD_REQUEST",
      status: 400,
    };
  }
  if (error instanceof ProviderError) {
    console.error(
      `[api/agent] Provider error from ${error.provider} (status ${error.status ?? "n/a"})`,
    );
    return {
      error: `The ${error.provider} provider returned an error: ${safeMessage(error.message)}`,
      code: "PROVIDER_ERROR",
      status: 502,
    };
  }
  if (error instanceof PipelineError) {
    return error.code === "BAD_REQUEST"
      ? { error: error.message, code: "BAD_REQUEST", status: 400 }
      : { error: error.message, code: "INVALID_OUTPUT", status: 502 };
  }
  console.error(
    "[api/agent] Unexpected error:",
    error instanceof Error ? error.name : "unknown",
  );
  return {
    error: "Unexpected error while calling the model provider.",
    code: "PROVIDER_ERROR",
    status: 502,
  };
}

/**
 * Server-Sent Events: one `step` event per recorded (or updated) AgentThought, then exactly one
 * `result` event (the GatewayResponse) or one `error` event (`{error, code}`). Nothing is sent
 * after the client disconnects or cancels; the pipeline is aborted instead.
 */
function streamResponse(req: NextRequest, input: AgentInput): Response {
  const encoder = new TextEncoder();
  const cancelled = new AbortController();
  const signal = AbortSignal.any([req.signal, cancelled.signal]);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (event: "step" | "result" | "error", data: unknown) => {
        if (!open || signal.aborted) return;
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        } catch {
          open = false;
        }
      };

      try {
        const result = await processAgentRequest(input, {
          signal,
          onThought: (thought: AgentThought) => send("step", thought),
        });
        send("result", result);
      } catch (error) {
        if (!(error instanceof PipelineAbortedError) && !signal.aborted) {
          const { error: message, code } = classifyError(error);
          send("error", { error: message, code });
        }
      } finally {
        open = false;
        try {
          controller.close();
        } catch {
          // Already closed or errored by a cancelled reader.
        }
      }
    },
    cancel() {
      cancelled.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
