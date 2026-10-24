import {
  ModelSelectionError,
  NoProviderConfiguredError,
  ProviderError,
  generate,
  resolveModel,
  streamText,
  toModelId,
  type LLMImage,
  type LLMMessage,
  type ModelSelection,
} from "@/lib/providers";

interface ChatRequest {
  model?: string;
  system?: string;
  messages: LLMMessage[];
  images: LLMImage[];
  stream: boolean;
  temperature?: number;
  maxTokens?: number;
}

class BadRequest extends Error {
  constructor(
    message: string,
    public readonly param: string | null,
  ) {
    super(message);
  }
}

function errorResponse(
  status: number,
  message: string,
  type: string,
  code: string | null = null,
  param: string | null = null,
): Response {
  return Response.json({ error: { message, type, param, code } }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const DATA_URL = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i;

function parseContent(
  content: unknown,
  index: number,
): { text: string; images: LLMImage[] } {
  if (typeof content === "string") return { text: content, images: [] };
  if (content === null || content === undefined)
    return { text: "", images: [] };
  if (!Array.isArray(content)) {
    throw new BadRequest(
      `messages[${index}].content must be a string or an array of parts.`,
      "messages",
    );
  }
  const texts: string[] = [];
  const images: LLMImage[] = [];
  for (const part of content) {
    if (!isRecord(part))
      throw new BadRequest(
        `Invalid content part in messages[${index}].`,
        "messages",
      );
    if (part.type === "text" && typeof part.text === "string") {
      texts.push(part.text);
    } else if (part.type === "image_url") {
      const raw = isRecord(part.image_url)
        ? part.image_url.url
        : part.image_url;
      const match = typeof raw === "string" ? DATA_URL.exec(raw) : null;
      if (!match) {
        throw new BadRequest(
          "Only base64 data: URLs are supported for image_url parts.",
          "messages",
        );
      }
      images.push({
        mimeType: match[1].toLowerCase(),
        data: match[2].replace(/\s+/g, ""),
      });
    } else {
      throw new BadRequest(
        `Unsupported content part type in messages[${index}].`,
        "messages",
      );
    }
  }
  return { text: texts.join("\n"), images };
}

function parseRequest(body: unknown): ChatRequest {
  if (!isRecord(body))
    throw new BadRequest("Request body must be a JSON object.", null);

  if (
    body.model !== undefined &&
    body.model !== null &&
    typeof body.model !== "string"
  ) {
    throw new BadRequest("'model' must be a string.", "model");
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw new BadRequest(
      "Missing or invalid 'messages' array in request body.",
      "messages",
    );
  }

  const systemParts: string[] = [];
  const messages: LLMMessage[] = [];
  let images: LLMImage[] = [];
  let imageMessageIndex = -1;
  body.messages.forEach((raw: unknown, index: number) => {
    if (!isRecord(raw))
      throw new BadRequest(`messages[${index}] must be an object.`, "messages");
    const { text, images: partImages } = parseContent(raw.content, index);
    if (raw.role === "system" || raw.role === "developer") {
      if (partImages.length)
        throw new BadRequest(
          "System messages cannot contain images.",
          "messages",
        );
      if (text) systemParts.push(text);
    } else if (raw.role === "user" || raw.role === "assistant") {
      if (partImages.length && raw.role !== "user") {
        throw new BadRequest(
          "Only user messages can contain images.",
          "messages",
        );
      }
      if (partImages.length) {
        if (imageMessageIndex !== -1) {
          throw new BadRequest(
            "Images are only supported in the last user message.",
            "messages",
          );
        }
        images = partImages;
        imageMessageIndex = messages.length;
      }
      messages.push({ role: raw.role, content: text });
    } else {
      throw new BadRequest(
        `Unsupported role in messages[${index}].`,
        "messages",
      );
    }
  });

  if (messages.length === 0) {
    throw new BadRequest(
      "At least one user or assistant message is required.",
      "messages",
    );
  }
  if (
    imageMessageIndex !== -1 &&
    imageMessageIndex !==
      messages.map((message) => message.role).lastIndexOf("user")
  ) {
    throw new BadRequest(
      "Images are only supported in the last user message.",
      "messages",
    );
  }

  let temperature: number | undefined;
  if (body.temperature !== undefined && body.temperature !== null) {
    if (
      typeof body.temperature !== "number" ||
      body.temperature < 0 ||
      body.temperature > 2
    ) {
      throw new BadRequest(
        "'temperature' must be a number between 0 and 2.",
        "temperature",
      );
    }
    temperature = body.temperature;
  }

  const rawMax = body.max_tokens ?? body.max_completion_tokens;
  let maxTokens: number | undefined;
  if (rawMax !== undefined && rawMax !== null) {
    if (
      typeof rawMax !== "number" ||
      !Number.isInteger(rawMax) ||
      rawMax <= 0
    ) {
      throw new BadRequest(
        "'max_tokens' must be a positive integer.",
        "max_tokens",
      );
    }
    maxTokens = rawMax;
  }

  return {
    model:
      typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : undefined,
    system: systemParts.length ? systemParts.join("\n\n") : undefined,
    messages,
    images,
    stream: body.stream === true,
    temperature,
    maxTokens,
  };
}

function providerStatus(status: number | undefined): number {
  if (
    status === 400 ||
    status === 404 ||
    status === 413 ||
    status === 422 ||
    status === 429
  )
    return status;
  if (status === 504) return 504;
  return 502;
}

function toErrorResponse(error: unknown): Response {
  if (error instanceof BadRequest) {
    return errorResponse(
      400,
      error.message,
      "invalid_request_error",
      null,
      error.param,
    );
  }
  if (error instanceof NoProviderConfiguredError) {
    return errorResponse(
      503,
      error.message,
      "service_unavailable",
      "no_provider",
    );
  }
  if (error instanceof ModelSelectionError) {
    return errorResponse(
      400,
      error.message,
      "invalid_request_error",
      "model_not_found",
      "model",
    );
  }
  if (error instanceof ProviderError) {
    // ProviderError messages are already stripped of keys and URLs by the provider layer.
    return errorResponse(
      providerStatus(error.status),
      error.message,
      "provider_error",
      error.provider,
    );
  }
  console.error(
    "[api/v1/chat/completions] unexpected error:",
    error instanceof Error ? error.name : "unknown",
  );
  return errorResponse(500, "Internal server error.", "api_error");
}

function chunkPayload(
  id: string,
  created: number,
  model: string,
  delta: Record<string, string>,
  finishReason: "stop" | null,
): string {
  return `data: ${JSON.stringify({
    id,
    object: "chat.completion.chunk",
    created,
    model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  })}\n\n`;
}

async function streamResponse(
  selection: ModelSelection,
  request: ChatRequest,
  signal: AbortSignal,
): Promise<Response> {
  const id = `chatcmpl-${crypto.randomUUID()}`;
  const created = Math.floor(Date.now() / 1000);
  const model = toModelId(selection);
  const iterator = streamText(selection, {
    system: request.system,
    messages: request.messages,
    images: request.images.length ? request.images : undefined,
    temperature: request.temperature,
    maxTokens: request.maxTokens,
    signal,
  });

  // Pull the first delta before committing to a 200 so early failures get a real status code.
  let first: IteratorResult<string>;
  try {
    first = await iterator.next();
  } catch (error) {
    return toErrorResponse(error);
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(
        encoder.encode(
          chunkPayload(
            id,
            created,
            model,
            { role: "assistant", content: first.done ? "" : first.value },
            null,
          ),
        ),
      );
      try {
        if (!first.done) {
          for (
            let next = await iterator.next();
            !next.done;
            next = await iterator.next()
          ) {
            controller.enqueue(
              encoder.encode(
                chunkPayload(id, created, model, { content: next.value }, null),
              ),
            );
          }
        }
        controller.enqueue(
          encoder.encode(chunkPayload(id, created, model, {}, "stop")),
        );
      } catch (error) {
        const message =
          error instanceof ProviderError
            ? error.message
            : "Stream interrupted.";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: { message, type: "provider_error", param: null, code: null } })}\n\n`,
          ),
        );
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
    async cancel() {
      await iterator.return(undefined);
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(req: Request) {
  let request: ChatRequest;
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequest("Request body must be valid JSON.", null);
    }
    request = parseRequest(body);
  } catch (error) {
    return toErrorResponse(error);
  }

  try {
    const selection = await resolveModel(request.model);
    if (request.stream)
      return await streamResponse(selection, request, req.signal);

    const result = await generate(selection, {
      system: request.system,
      messages: request.messages,
      images: request.images.length ? request.images : undefined,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      signal: req.signal,
    });

    const completion: Record<string, unknown> = {
      id: `chatcmpl-${crypto.randomUUID()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: toModelId({ provider: result.provider, model: result.model }),
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: result.text },
          finish_reason: "stop",
        },
      ],
    };
    if (result.usage) {
      completion.usage = {
        prompt_tokens: result.usage.inputTokens,
        completion_tokens: result.usage.outputTokens,
        total_tokens: result.usage.inputTokens + result.usage.outputTokens,
      };
    }
    return Response.json(completion);
  } catch (error) {
    return toErrorResponse(error);
  }
}
