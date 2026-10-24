import { NextRequest, NextResponse } from 'next/server';
import { mlopsPipeline, circuitBreaker, vectorCache } from '@/lib/mlops-pipeline';

export async function GET() {
  try {
    const snapshot = mlopsPipeline.getSnapshot();
    return NextResponse.json(snapshot);
  } catch (error: any) {
    console.error('Error fetching MLOps telemetry snapshot:', error);
    return NextResponse.json(
      { error: 'Internal server error in MLOps platform telemetry collector' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;

    if (action === 'reset') {
      mlopsPipeline.reset();
      return NextResponse.json({ success: true, message: 'MLOps telemetry, vector cache, and circuit breakers reset' });
    }

    if (action === 'clear_cache') {
      vectorCache.clear();
      return NextResponse.json({ success: true, message: 'Vector cache cleared' });
    }

    if (action === 'reset_circuit') {
      const model = body.model;
      circuitBreaker.reset(model);
      return NextResponse.json({ success: true, message: `Circuit breaker reset for ${model || 'all models'}` });
    }

    if (action === 'simulate_failure') {
      const model = body.model || 'gemini-3.5-flash-lite';
      const statusCode = body.statusCode || 429;
      const errorMsg = body.error || 'Simulated 429 Rate Limit Exceeded';
      circuitBreaker.recordFailure(model, statusCode, errorMsg);
      mlopsPipeline.collector.recordRequest({
        model,
        latencyMs: 120,
        promptTokens: 50,
        completionTokens: 0,
        success: false,
        statusCode,
        error: errorMsg,
      });

      return NextResponse.json({
        success: true,
        message: `Simulated failure recorded for ${model}`,
        circuit: circuitBreaker.getCircuitInfo(model),
      });
    }

    if (action === 'estimate_cost') {
      const model = body.model || 'gemini-3-flash-preview';
      const promptTokens = body.promptTokens || 1000;
      const completionTokens = body.completionTokens || 500;
      const cost = mlopsPipeline.estimateCost(model, promptTokens, completionTokens);
      return NextResponse.json(cost);
    }

    return NextResponse.json({ error: 'Unknown action parameter' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in MLOps API POST:', error);
    return NextResponse.json(
      { error: 'Internal server error processing MLOps request' },
      { status: 500 }
    );
  }
}
