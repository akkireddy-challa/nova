import { anthropicProvider } from './anthropic';
import { geminiProvider, resetGeminiCache } from './gemini';
import { ollamaProvider, resetOllamaCache } from './ollama';
import { openaiProvider } from './openai';
import {
  NoEmbeddingProviderError,
  NoProviderConfiguredError,
  type AvailableModel,
  type EmbedResult,
  type LLMProvider,
  type LLMRequest,
  type LLMResult,
  type ModelSelection,
  type ProviderId,
} from './types';

export * from './types';

/** Order used to pick the default provider. */
export const PROVIDER_ORDER: readonly ProviderId[] = ['anthropic', 'openai', 'gemini', 'ollama'];

const PROVIDERS: Record<ProviderId, LLMProvider> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  gemini: geminiProvider,
  ollama: ollamaProvider,
};

/** Thrown when a requested model id is malformed or names an unusable provider. */
export class ModelSelectionError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = 'ModelSelectionError';
  }
}

export function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_ORDER as readonly string[]).includes(value);
}

export function getProvider(id: ProviderId): LLMProvider {
  return PROVIDERS[id];
}

export async function getConfiguredProviders(): Promise<LLMProvider[]> {
  const providers = PROVIDER_ORDER.map(id => PROVIDERS[id]);
  const flags = await Promise.all(providers.map(provider => provider.isConfigured().catch(() => false)));
  return providers.filter((_, index) => flags[index]);
}

export function toModelId(selection: ModelSelection): string {
  return `${selection.provider}:${selection.model}`;
}

/** "anthropic:claude-sonnet-5-5" -> {provider, model}. Model ids may themselves contain ':' (Ollama tags). */
export function parseModelId(id: string): ModelSelection | null {
  if (typeof id !== 'string') return null;
  const trimmed = id.trim();
  const separator = trimmed.indexOf(':');
  if (separator <= 0) return null;
  const provider = trimmed.slice(0, separator);
  const model = trimmed.slice(separator + 1).trim();
  if (!isProviderId(provider) || !model) return null;
  return { provider, model };
}

async function safeDefault(provider: LLMProvider): Promise<string | null> {
  try {
    const model = await provider.defaultModel();
    return model || null;
  } catch {
    return null;
  }
}

export async function listAvailableModels(): Promise<AvailableModel[]> {
  const providers = await getConfiguredProviders();
  const perProvider = await Promise.all(
    providers.map(async provider => {
      const [listed, defaultModel] = await Promise.all([
        provider.listModels().catch((): string[] | null => null),
        safeDefault(provider),
      ]);
      const models = new Set<string>();
      if (defaultModel) models.add(defaultModel);
      for (const model of listed ?? []) models.add(model);
      return { provider, defaultModel, models: [...models] };
    }),
  );

  const result: AvailableModel[] = [];
  let defaultAssigned = false;
  for (const { provider, defaultModel, models } of perProvider) {
    for (const model of models) {
      const isDefault = !defaultAssigned && model === defaultModel;
      if (isDefault) defaultAssigned = true;
      result.push({
        id: toModelId({ provider: provider.id, model }),
        provider: provider.id,
        model,
        providerLabel: provider.label,
        isDefault,
      });
    }
  }
  return result;
}

export async function resolveModel(id?: string): Promise<ModelSelection> {
  const providers = await getConfiguredProviders();
  if (providers.length === 0) throw new NoProviderConfiguredError();

  const requested = id?.trim();
  if (requested) {
    const parsed = parseModelId(requested);
    if (parsed) {
      if (!providers.some(provider => provider.id === parsed.provider)) {
        throw new ModelSelectionError(`Provider "${parsed.provider}" is not configured`);
      }
      return parsed;
    }
    // Accept a bare model name if a configured provider offers it (first in provider order).
    const matches = (await listAvailableModels()).filter(model => model.model === requested);
    if (matches.length > 0) return { provider: matches[0].provider, model: matches[0].model };
    throw new ModelSelectionError(
      'Unknown model. Use a "provider:model" id from GET /api/v1/models.',
    );
  }

  for (const provider of providers) {
    const model = await safeDefault(provider);
    if (model) return { provider: provider.id, model };
  }
  throw new NoProviderConfiguredError();
}

export async function generate(
  selection: ModelSelection,
  request: Omit<LLMRequest, 'model'>,
): Promise<LLMResult> {
  return getProvider(selection.provider).generate({ ...request, model: selection.model });
}

/** Stream text deltas; providers without native streaming yield the full text once. */
export async function* streamText(
  selection: ModelSelection,
  request: Omit<LLMRequest, 'model'>,
): AsyncGenerator<string> {
  const provider = getProvider(selection.provider);
  const full: LLMRequest = { ...request, model: selection.model };
  if (provider.stream) {
    yield* provider.stream(full);
    return;
  }
  const result = await provider.generate(full);
  if (result.text) yield result.text;
}

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

/** A configured provider that can embed text, with the embedding model it uses by default. */
export interface EmbeddingProviderInfo extends ModelSelection {
  /** "provider:model", e.g. "openai:text-embedding-3-small". */
  id: string;
  providerLabel: string;
}

export interface EmbedTextsResult extends EmbedResult {
  provider: ProviderId;
  /** "provider:model" of the model that produced the vectors. */
  id: string;
}

/** Configured providers with an embeddings API and a usable default embedding model, in provider order. */
export async function listEmbeddingProviders(): Promise<EmbeddingProviderInfo[]> {
  const providers = (await getConfiguredProviders()).filter(provider => provider.embed);
  const models = await Promise.all(
    providers.map(provider => provider.defaultEmbeddingModel?.().catch(() => null) ?? Promise.resolve(null)),
  );
  const result: EmbeddingProviderInfo[] = [];
  providers.forEach((provider, index) => {
    const model = models[index];
    if (!model) return;
    result.push({ id: toModelId({ provider: provider.id, model }), provider: provider.id, model, providerLabel: provider.label });
  });
  return result;
}

/**
 * Pick the embedding model for a request. Accepts "provider:model", a bare model name (sent to the
 * provider whose default it is, else the first embedding provider), or nothing (first default).
 */
export async function resolveEmbeddingModel(id?: string): Promise<ModelSelection> {
  const requested = id?.trim();
  if (requested) {
    const parsed = parseModelId(requested);
    if (parsed) {
      const provider = getProvider(parsed.provider);
      if (!provider.embed) {
        throw new ModelSelectionError(`${provider.label} does not offer an embeddings API`);
      }
      if (!(await provider.isConfigured().catch(() => false))) {
        throw new ModelSelectionError(`Provider "${parsed.provider}" is not configured`);
      }
      return parsed;
    }
    const available = await listEmbeddingProviders();
    if (available.length === 0) throw new NoEmbeddingProviderError();
    const match = available.find(info => info.model === requested) ?? available[0];
    return { provider: match.provider, model: requested };
  }
  const available = await listEmbeddingProviders();
  if (available.length === 0) throw new NoEmbeddingProviderError();
  return { provider: available[0].provider, model: available[0].model };
}

/** Embed texts with the chosen (or default) embedding model. Throws NoEmbeddingProviderError when none exists. */
export async function embedTexts(
  texts: string[],
  modelId?: string,
  signal?: AbortSignal,
): Promise<EmbedTextsResult> {
  const selection = await resolveEmbeddingModel(modelId);
  const provider = getProvider(selection.provider);
  if (!provider.embed) throw new NoEmbeddingProviderError();
  const result = await provider.embed({ model: selection.model, texts, signal });
  return { ...result, provider: provider.id, id: toModelId({ provider: provider.id, model: result.model }) };
}

/** Clear cached model lists / reachability probes (used by tests). */
export function resetProviderCaches(): void {
  resetGeminiCache();
  resetOllamaCache();
}
