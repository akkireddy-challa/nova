import { NextResponse } from 'next/server';
import { circuitBreaker } from '@/lib/mlops-pipeline';

export async function GET() {
  const baseModels = [
    {
      id: 'gemini-3-flash-preview',
      object: 'model',
      created: 1740000000,
      owned_by: 'google',
      permission: [],
      root: 'gemini-3-flash-preview',
      parent: null,
      description: 'Frontier 2026 reasoning model with ultra-low latency (~3.2s) and adaptive thinking depth.',
      context_window: 1048576,
    },
    {
      id: 'gemini-2.5-flash',
      object: 'model',
      created: 1739000000,
      owned_by: 'google',
      permission: [],
      root: 'gemini-2.5-flash',
      parent: null,
      description: 'Production-grade fast multi-turn conversational model.',
      context_window: 1048576,
    },
    {
      id: 'gemini-embedding-2',
      object: 'model',
      created: 1740000000,
      owned_by: 'google',
      permission: [],
      root: 'gemini-embedding-2',
      parent: null,
      description: 'Dense 3072-dimensional vector embedding model for Embeddings v2.',
      context_window: 8192,
    },
    {
      id: 'claude-3-7-sonnet',
      object: 'model',
      created: 1740000000,
      owned_by: 'anthropic',
      permission: [],
      root: 'claude-3-7-sonnet',
      parent: null,
      description: 'Hybrid reasoning and instant-response frontier model.',
      context_window: 200000,
    },
    {
      id: 'deepseek-r1',
      object: 'model',
      created: 1738000000,
      owned_by: 'deepseek',
      permission: [],
      root: 'deepseek-r1',
      parent: null,
      description: 'Open-weights reasoning model with explicit verification traces.',
      context_window: 128000,
    },
    {
      id: 'llama-3.3-70b-instruct',
      object: 'model',
      created: 1735000000,
      owned_by: 'meta',
      permission: [],
      root: 'llama-3.3-70b-instruct',
      parent: null,
      description: 'State-of-the-art open model with native function calling.',
      context_window: 128000,
    },
    {
      id: 'ollama-local',
      object: 'model',
      created: 1730000000,
      owned_by: 'local',
      permission: [],
      root: 'ollama-local',
      parent: null,
      description: 'Zero-cost offline local model running via Ollama / Apple MLX.',
      context_window: 32768,
    },
  ];

  const modelsWithHealth = baseModels.map(m => {
    const circuit = circuitBreaker.getCircuitInfo(m.id);
    return {
      ...m,
      circuit_breaker: {
        state: circuit.state,
        consecutive_failures: circuit.consecutiveFailures,
        active_standby: circuit.activeStandby || null,
        standby_chain: circuit.standbyChain,
      },
    };
  });

  return NextResponse.json({
    object: 'list',
    data: modelsWithHealth,
  });
}
