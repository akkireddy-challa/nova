import Anthropic, {
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
} from "@anthropic-ai/sdk";
import type {
  Base64ImageSource,
  ContentBlockParam,
  MessageCreateParamsBase,
  MessageParam,
} from "@anthropic-ai/sdk/resources/messages/messages";
import {
  JSON_INSTRUCTION,
  REQUEST_TIMEOUT_MS,
  elapsedSince,
  errorFromException,
  redact,
  withTimeout,
} from "./openai";
import {
  ProviderError,
  type LLMProvider,
  type LLMRequest,
  type LLMResult,
  type ProviderId,
} from "./types";

const ID: ProviderId = "anthropic";
const LABEL = "Anthropic";
const FALLBACK_MODEL = "claude-sonnet-5-5";
const DEFAULT_MAX_TOKENS = 8192;
const SUPPORTED_IMAGE_TYPES: ReadonlyArray<Base64ImageSource["media_type"]> = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

function apiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY?.trim() || undefined;
}

function client(): { client: Anthropic; key: string } {
  const key = apiKey();
  if (!key)
    throw new ProviderError(
      "Anthropic is not configured (ANTHROPIC_API_KEY missing)",
      ID,
      503,
    );
  return {
    key,
    client: new Anthropic({
      apiKey: key,
      maxRetries: 1,
      timeout: REQUEST_TIMEOUT_MS,
      // Resolve fetch at call time so tests (and runtime polyfills) can swap it.
      fetch: (input, init) => globalThis.fetch(input, init),
    }),
  };
}

function isSupportedImageType(
  type: string,
): type is Base64ImageSource["media_type"] {
  return (SUPPORTED_IMAGE_TYPES as ReadonlyArray<string>).includes(type);
}

function buildMessages(request: LLMRequest): MessageParam[] {
  const messages: MessageParam[] = request.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
  if (!request.images?.length) return messages;

  let target = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      target = i;
      break;
    }
  }
  const imageBlocks: ContentBlockParam[] = request.images.map((image) => {
    if (!isSupportedImageType(image.mimeType)) {
      throw new ProviderError(
        `Anthropic does not support ${redact(image.mimeType)} images`,
        ID,
        400,
      );
    }
    return {
      type: "image",
      source: { type: "base64", media_type: image.mimeType, data: image.data },
    };
  });
  if (target === -1) {
    messages.push({ role: "user", content: imageBlocks });
  } else {
    const text = messages[target].content;
    messages[target] = {
      role: "user",
      content: [
        ...imageBlocks,
        ...(typeof text === "string" && text
          ? [{ type: "text" as const, text }]
          : []),
      ],
    };
  }
  return messages;
}

function buildParams(request: LLMRequest): MessageCreateParamsBase {
  let system = request.system ?? "";
  if (request.json)
    system = system ? `${system}\n\n${JSON_INSTRUCTION}` : JSON_INSTRUCTION;
  // Note: the installed SDK (v1.3.0) no longer accepts `temperature`, so it is not forwarded.
  const params: MessageCreateParamsBase = {
    model: request.model,
    max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
    messages: buildMessages(request),
  };
  if (system) params.system = system;
  return params;
}

function toProviderError(
  err: unknown,
  key: string,
  signal?: AbortSignal,
): ProviderError {
  if (err instanceof ProviderError) return err;
  if (err instanceof APIUserAbortError) {
    return signal?.aborted
      ? new ProviderError("Anthropic request was aborted", ID, 499)
      : new ProviderError("Anthropic request timed out", ID, 504);
  }
  if (err instanceof APIConnectionTimeoutError) {
    return new ProviderError("Anthropic request timed out", ID, 504);
  }
  if (err instanceof APIError && typeof err.status === "number") {
    const body = err.error as { error?: { message?: unknown } } | undefined;
    const detail =
      typeof body?.error?.message === "string"
        ? redact(body.error.message, [key])
        : "";
    return new ProviderError(
      `Anthropic request failed (${err.status})${detail ? `: ${detail}` : ""}`,
      ID,
      err.status,
    );
  }
  return errorFromException(ID, LABEL, err, signal);
}

export const anthropicProvider: LLMProvider = {
  id: ID,
  label: LABEL,

  async isConfigured() {
    return Boolean(apiKey());
  },

  async listModels() {
    const { client: anthropic, key } = client();
    const models: string[] = [];
    try {
      for await (const model of anthropic.models.list(
        { limit: 100 },
        { signal: withTimeout(undefined, 10_000) },
      )) {
        models.push(model.id);
        if (models.length >= 200) break;
      }
    } catch (err) {
      throw toProviderError(err, key);
    }
    return models;
  },

  async defaultModel() {
    return process.env.ANTHROPIC_MODEL?.trim() || FALLBACK_MODEL;
  },

  async generate(request): Promise<LLMResult> {
    const { client: anthropic, key } = client();
    const params = buildParams(request);
    const start = performance.now();
    try {
      const message = await anthropic.messages.create(
        { ...params, stream: false },
        { signal: withTimeout(request.signal) },
      );
      const text = message.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("");
      if (!text) {
        throw new ProviderError(
          `Anthropic returned no text${message.stop_reason ? ` (${message.stop_reason})` : ""}`,
          ID,
          502,
        );
      }
      const result: LLMResult = {
        text,
        latencyMs: elapsedSince(start),
        model: message.model || request.model,
        provider: ID,
      };
      if (message.usage && typeof message.usage.input_tokens === "number") {
        result.usage = {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
        };
      }
      return result;
    } catch (err) {
      throw toProviderError(err, key, request.signal);
    }
  },

  async *stream(request) {
    const { client: anthropic, key } = client();
    const params = buildParams(request);
    try {
      const events = await anthropic.messages.create(
        { ...params, stream: true },
        { signal: withTimeout(request.signal) },
      );
      for await (const event of events) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield event.delta.text;
        }
      }
    } catch (err) {
      throw toProviderError(err, key, request.signal);
    }
  },
};
