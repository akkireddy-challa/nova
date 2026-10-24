import { NextRequest, NextResponse } from 'next/server';
import { runEvalSuite, CANONICAL_EVAL_SCENARIOS } from '@/lib/eval-engine';

export async function GET() {
  return NextResponse.json({
    totalScenarios: CANONICAL_EVAL_SCENARIOS.length,
    scenarios: CANONICAL_EVAL_SCENARIOS,
    benchmarkStandards: [
      { name: 'Harness² (Recursive Propose-Probe-Compose)', reference: 'arXiv:2610.14224' },
      { name: 'CLASHarness (Multi-Agent Conflict Resolution)', reference: 'arXiv:2610.19128' },
      { name: 'GeoKTools (K=1..4 Tool Composition)', reference: 'Google Earth AI 2026' },
      { name: 'Prefix Caching Optimization', reference: 'OpenAI / Anthropic Engineering' },
    ],
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const model = body.model || 'gemini-3-flash-preview';

    const evalReport = await runEvalSuite(model);
    return NextResponse.json(evalReport);
  } catch (error: any) {
    console.error('API v1 Evals error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute eval benchmark suite' },
      { status: 500 }
    );
  }
}
