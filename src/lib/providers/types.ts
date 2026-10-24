export type ProviderId = 'gemini' | 'anthropic' | 'openai' | 'ollama';

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMImage {
  mimeType: string;
  /** Base64-encoded image bytes, without a data: prefix. */
  data: string;
}

export interface LLMRequest {
  model: string;
  system?: string;
  messages: LLMMessage[];
  /** Images attached to the last user message. Providers without vision support ignore them. */
  images?: LLMImage[];
  /** Ask the provider for a JSON object response when it supports a JSON mode. */
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LLMResult {
  text: string;
  /** Present only when the provider reported token usage. Never estimated. */
  usage?: LLMUsage;
  latencyMs: number;
  model: string;
  provider: ProviderId;
}

export interface LLMProvider {
  id: ProviderId;
  /** Human-readable name for the UI, e.g. "Anthropic". */
  label: string;
  /** True when credentials/endpoint are present (and, for Ollama, the server is reachable). */
  isConfigured(): Promise<boolean>;
  /** Models the configured account can actually call. */
  listModels(): Promise<string[]>;
  /** Model used when the caller does not choose one. */
  defaultModel(): Promise<string>;
  generate(request: LLMRequest): Promise<LLMResult>;
  stream?(request: LLMRequest): AsyncIterable<string>;
}

/** A provider/model pair, serialized for the UI and API as "provider:model". */
export interface ModelSelection {
  provider: ProviderId;
  model: string;
}

export interface AvailableModel extends ModelSelection {
  /** "provider:model", e.g. "anthropic:claude-sonnet-5-5". */
  id: string;
  providerLabel: string;
  isDefault: boolean;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: ProviderId,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class NoProviderConfiguredError extends Error {
  constructor() {
    super('No LLM provider is configured. Set an API key or start Ollama.');
    this.name = 'NoProviderConfiguredError';
  }
}
