import { NextRequest, NextResponse } from "next/server";
import {
  BENCHMARK_STANDARDIZATION_PROMPT,
  calculateLocalCostSavings,
  countTokens,
  discoverLocalEngines,
  probeLocalEngine,
  streamBenchmarkModel,
} from "@/lib/providers/local-engine-probe";

/**
 * GET /api/v1/providers/benchmark
 * Auto-discovers local inference runtimes or probes a specific endpoint.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint");

    if (endpoint) {
      const probe = await probeLocalEngine(endpoint);
      return NextResponse.json({ probe });
    }

    const engines = await discoverLocalEngines();
    return NextResponse.json({ engines });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/v1/providers/benchmark
 * Runs a live standardized inference benchmark against a local or configured model.
 * Streams response chunks, measures real TTFT and TPS via performance.now(), and calculates cost savings.
 */
export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 },
      );
    }

    const model = typeof body.model === "string" ? body.model.trim() : "";
    const provider =
      typeof body.provider === "string" ? body.provider.trim() : undefined;
    const endpoint =
      typeof body.endpoint === "string" ? body.endpoint.trim() : undefined;

    if (!model) {
      return NextResponse.json(
        { error: "Model name is required for benchmarking" },
        { status: 400 },
      );
    }

    const prompt = BENCHMARK_STANDARDIZATION_PROMPT;
    const promptTokens = countTokens(prompt);

    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    let fullText = "";

    try {
      const stream = streamBenchmarkModel({
        model,
        provider,
        endpoint,
        prompt,
      });

      for await (const chunk of stream) {
        if (typeof chunk === "string" && chunk.length > 0) {
          if (firstTokenTime === null) {
            firstTokenTime = performance.now();
          }
          fullText += chunk;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        {
          error: `Benchmark failed: ${message}`,
          model,
        },
        { status: 502 },
      );
    }

    const endTime = performance.now();
    const totalTimeMs = Math.round(endTime - startTime);
    const ttftMs =
      firstTokenTime !== null
        ? Math.round(firstTokenTime - startTime)
        : totalTimeMs;

    const tokenCount = countTokens(fullText);
    const generationTimeMs = totalTimeMs - ttftMs;
    const tokensPerSecond =
      generationTimeMs > 0
        ? Math.round((tokenCount / generationTimeMs) * 1000)
        : 0;

    const costSavings = calculateLocalCostSavings(promptTokens, tokenCount);

    return NextResponse.json({
      model,
      ttftMs,
      totalTimeMs,
      tokenCount,
      tokensPerSecond,
      costSavings,
      text: fullText,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
