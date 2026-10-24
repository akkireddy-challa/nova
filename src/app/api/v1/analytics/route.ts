import { NextRequest, NextResponse } from 'next/server';
import {
  generateSampleTelemetry,
  profileTokenAndLatency,
  generateSampleMemoryVectors,
  clusterAndProjectEmbeddings,
  generateMockCalibrationDataset,
  calculateCalibrationCurve,
  generateChurnPredictiveSimulation,
  generateAgenticLatencyBreakdown,
  generateMultiVariableVarianceAnalysis,
} from '@/lib/data-science';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'all';

    if (view === 'profiling') {
      const telemetry = generateSampleTelemetry(50);
      const profile = profileTokenAndLatency(telemetry);
      return NextResponse.json({ profile, rawSamples: telemetry });
    }

    if (view === 'clustering') {
      const k = parseInt(searchParams.get('k') || '4', 10);
      const algorithm = (searchParams.get('algorithm') as 'PCA' | 't-SNE') || 'PCA';
      const dimensions = (parseInt(searchParams.get('dims') || '2', 10) as 2 | 3);
      const vectors = generateSampleMemoryVectors();
      const clustering = clusterAndProjectEmbeddings(vectors, { k, algorithm, dimensions });
      return NextResponse.json(clustering);
    }

    if (view === 'calibration') {
      const bias = (searchParams.get('bias') as any) || 'overconfident';
      const predictions = generateMockCalibrationDataset(80, bias);
      const calibration = calculateCalibrationCurve(predictions, 10);
      return NextResponse.json(calibration);
    }

    if (view === 'churn') {
      const churn = generateChurnPredictiveSimulation();
      return NextResponse.json(churn);
    }

    if (view === 'latency') {
      const breakdown = generateAgenticLatencyBreakdown();
      return NextResponse.json(breakdown);
    }

    if (view === 'anova') {
      const anova = generateMultiVariableVarianceAnalysis();
      return NextResponse.json(anova);
    }

    // Default 'all' bundle
    const telemetry = generateSampleTelemetry(50);
    const profile = profileTokenAndLatency(telemetry);
    const vectors = generateSampleMemoryVectors();
    const clustering = clusterAndProjectEmbeddings(vectors, { k: 4, algorithm: 'PCA', dimensions: 2 });
    const predictions = generateMockCalibrationDataset(80, 'overconfident');
    const calibration = calculateCalibrationCurve(predictions, 10);
    const churn = generateChurnPredictiveSimulation();
    const latencyBreakdown = generateAgenticLatencyBreakdown();
    const anova = generateMultiVariableVarianceAnalysis();

    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      profiling: profile,
      clustering,
      calibration,
      useCases: {
        churn,
        latencyBreakdown,
        anova,
      },
    });
  } catch (error: any) {
    console.error('API v1 Analytics error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate analytics workbench data' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'profile';

    if (action === 'profile') {
      const samples = Array.isArray(body.samples) ? body.samples : generateSampleTelemetry(30);
      const profile = profileTokenAndLatency(samples);
      return NextResponse.json(profile);
    }

    if (action === 'cluster') {
      const nodes = Array.isArray(body.nodes) ? body.nodes : generateSampleMemoryVectors();
      const k = body.k || 4;
      const algorithm = body.algorithm || 'PCA';
      const dimensions = body.dimensions || 2;
      const result = clusterAndProjectEmbeddings(nodes, { k, algorithm, dimensions });
      return NextResponse.json(result);
    }

    if (action === 'calibrate') {
      const predictions = Array.isArray(body.predictions)
        ? body.predictions
        : generateMockCalibrationDataset(80, body.bias || 'overconfident');
      const numBins = body.numBins || 10;
      const result = calculateCalibrationCurve(predictions, numBins);
      return NextResponse.json(result);
    }

    if (action === 'churn_simulation') {
      const records = Array.isArray(body.records) ? body.records : undefined;
      const result = generateChurnPredictiveSimulation(records);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('API v1 Analytics POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process analytics request' },
      { status: 500 }
    );
  }
}
