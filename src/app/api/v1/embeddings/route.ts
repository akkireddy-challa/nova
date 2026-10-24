import {
  ModelSelectionError,
  NoEmbeddingProviderError,
  ProviderError,
  embedTexts,
} from "@/lib/providers";

const MAX_INPUTS = 2_048;
const MAX_INPUT_CHARS = 100_000;

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

function errorResponse(
  status: number,
  message: string,
  type: string,
  code: string | null = null,
  param: string | null = null,
): Response {
  return Response.json({ error: { message, type, param, code } }, { status });
}

/** OpenAI-compatible embeddings proxy to the first configured provider with an embeddings API. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(
      400,
      "Request body must be valid JSON.",
      "invalid_request_error",
    );
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return errorResponse(
      400,
      "Request body must be a JSON object.",
      "invalid_request_error",
    );
  }
  const record = body as Record<string, unknown>;

  const rawInput = record.input;
  const inputs = typeof rawInput === "string" ? [rawInput] : rawInput;
  if (
    !Array.isArray(inputs) ||
    inputs.length === 0 ||
    !inputs.every(
      (item): item is string => typeof item === "string" && item.length > 0,
    )
  ) {
    return errorResponse(
      400,
      "'input' must be a non-empty string or an array of non-empty strings.",
      "invalid_request_error",
      null,
      "input",
    );
  }
  if (
    inputs.length > MAX_INPUTS ||
    inputs.some((item) => item.length > MAX_INPUT_CHARS)
  ) {
    return errorResponse(
      400,
      `'input' may contain at most ${MAX_INPUTS} strings of at most ${MAX_INPUT_CHARS} characters.`,
      "invalid_request_error",
      null,
      "input",
    );
  }
  if (
    record.model !== undefined &&
    record.model !== null &&
    typeof record.model !== "string"
  ) {
    return errorResponse(
      400,
      "'model' must be a string.",
      "invalid_request_error",
      null,
      "model",
    );
  }
  if (
    record.encoding_format !== undefined &&
    record.encoding_format !== "float"
  ) {
    return errorResponse(
      400,
      "Only encoding_format 'float' is supported.",
      "invalid_request_error",
      null,
      "encoding_format",
    );
  }

  try {
    const result = await embedTexts(
      inputs,
      typeof record.model === "string" ? record.model : undefined,
      req.signal,
    );
    const response: Record<string, unknown> = {
      object: "list",
      data: result.vectors.map((embedding, index) => ({
        object: "embedding",
        embedding,
        index,
      })),
      model: result.id,
    };
    // Usage is reported only when the provider returned it (Gemini does not).
    if (result.usage) {
      response.usage = {
        prompt_tokens: result.usage.inputTokens,
        total_tokens: result.usage.inputTokens,
      };
    }
    return Response.json(response);
  } catch (error) {
    if (error instanceof NoEmbeddingProviderError) {
      return errorResponse(
        503,
        error.message,
        "service_unavailable",
        "no_embedding_provider",
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
      "[api/v1/embeddings] failed:",
      error instanceof Error ? error.name : "unknown",
    );
    return errorResponse(500, "Embeddings request failed.", "api_error");
  }
}
