'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

/** One entry of GET /api/v1/models (see docs/team/SPRINT2.md). */
export interface ModelEntry {
  /** "provider:model", e.g. "anthropic:claude-sonnet-5-5". */
  id: string;
  provider: string;
  model: string;
  ownedBy: string;
  isDefault: boolean;
}

export type ModelsStatus = 'loading' | 'ready' | 'error';

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Gemini',
  anthropic: 'Claude',
  openai: 'OpenAI',
  ollama: 'Ollama',
};

export function providerLabel(provider: string, ownedBy?: string): string {
  return PROVIDER_LABELS[provider] ?? (ownedBy || provider);
}

/** Splits a "provider:model" id. Model names may themselves contain ':' (e.g. Ollama tags). */
export function splitModelId(id: string): { provider: string; model: string } | null {
  const idx = id.indexOf(':');
  if (idx <= 0 || idx === id.length - 1) return null;
  return { provider: id.slice(0, idx), model: id.slice(idx + 1) };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function parseModelsResponse(body: unknown): ModelEntry[] {
  if (!isRecord(body) || !Array.isArray(body.data)) {
    throw new Error('Unexpected response from /api/v1/models');
  }
  const entries: ModelEntry[] = [];
  for (const raw of body.data) {
    if (!isRecord(raw) || typeof raw.id !== 'string') continue;
    const split = splitModelId(raw.id);
    const provider = typeof raw.provider === 'string' ? raw.provider : split?.provider;
    const model = typeof raw.model === 'string' ? raw.model : split?.model;
    if (!provider || !model) continue;
    entries.push({
      id: raw.id,
      provider,
      model,
      ownedBy: typeof raw.owned_by === 'string' ? raw.owned_by : '',
      isDefault: raw.is_default === true,
    });
  }
  return entries;
}

/** Fetches the configured models. An empty list means no provider is configured. */
export function useModels() {
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [status, setStatus] = useState<ModelsStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/models', { cache: 'no-store' })
      .then(async res => {
        const body: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const msg = isRecord(body) && typeof body.error === 'string' ? body.error : `HTTP ${res.status}`;
          throw new Error(msg);
        }
        return parseModelsResponse(body);
      })
      .then(list => {
        if (cancelled) return;
        setModels(list);
        setError(null);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load models');
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const refetch = useCallback(() => {
    setStatus('loading');
    setNonce(n => n + 1);
  }, []);

  return { models, status, error, refetch };
}

const STORAGE_KEY = 'nova_model';

function readStoredModel(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

/**
 * Picks the active model id: the user's saved choice if it is still offered,
 * otherwise the server default, otherwise the first entry. '' when the list is empty.
 */
export function pickModel(models: ModelEntry[], preferred: string): string {
  if (preferred && models.some(m => m.id === preferred)) return preferred;
  return (models.find(m => m.isDefault) ?? models[0])?.id ?? '';
}

export function useModelSelection(models: ModelEntry[]) {
  const [preferred, setPreferred] = useState<string>(readStoredModel);

  const selected = useMemo(() => pickModel(models, preferred), [models, preferred]);

  const select = useCallback((id: string) => {
    setPreferred(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  }, []);

  return [selected, select] as const;
}
