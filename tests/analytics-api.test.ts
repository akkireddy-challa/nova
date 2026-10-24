import { describe, expect, it } from 'bun:test';
import { GET, POST } from '../src/app/api/v1/analytics/route';
import { NextRequest } from 'next/server';

describe('Analytics API Route (/api/v1/analytics)', () => {
  it('should return complete analytics bundle for GET without query params', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/analytics');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('success');
    expect(data.profiling).toBeDefined();
    expect(data.clustering).toBeDefined();
    expect(data.calibration).toBeDefined();
    expect(data.useCases.churn).toBeDefined();
    expect(data.useCases.latencyBreakdown).toBeDefined();
    expect(data.useCases.anova).toBeDefined();
  });

  it('should return view-specific payloads when requested via query param', async () => {
    // Profiling view
    const profReq = new NextRequest('http://localhost:3000/api/v1/analytics?view=profiling');
    const profRes = await GET(profReq);
    const profData = await profRes.json();
    expect(profData.profile.sampleCount).toBeGreaterThan(0);

    // Clustering view (with custom k & algorithm)
    const clustReq = new NextRequest('http://localhost:3000/api/v1/analytics?view=clustering&k=3&algorithm=PCA&dims=2');
    const clustRes = await GET(clustReq);
    const clustData = await clustRes.json();
    expect(clustData.clusters.length).toBe(3);
    expect(clustData.nodes.length).toBeGreaterThan(0);

    // Calibration view
    const calibReq = new NextRequest('http://localhost:3000/api/v1/analytics?view=calibration&bias=overconfident');
    const calibRes = await GET(calibReq);
    const calibData = await calibRes.json();
    expect(calibData.bins.length).toBe(10);
    expect(calibData.verdict).toBeDefined();

    // Churn view
    const churnReq = new NextRequest('http://localhost:3000/api/v1/analytics?view=churn');
    const churnRes = await GET(churnReq);
    const churnData = await churnRes.json();
    expect(churnData.cohortCount).toBeGreaterThan(0);

    // Latency view
    const latReq = new NextRequest('http://localhost:3000/api/v1/analytics?view=latency');
    const latRes = await GET(latReq);
    const latData = await latRes.json();
    expect(latData.stages.length).toBe(11);

    // ANOVA view
    const anovaReq = new NextRequest('http://localhost:3000/api/v1/analytics?view=anova');
    const anovaRes = await GET(anovaReq);
    const anovaData = await anovaRes.json();
    expect(anovaData.anovaTable.length).toBe(4);
  });

  it('should process custom POST calculations for profiling, clustering, and calibration', async () => {
    // Custom profile
    const postProfReq = new NextRequest('http://localhost:3000/api/v1/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'profile' }),
    });
    const postProfRes = await POST(postProfReq);
    expect(postProfRes.status).toBe(200);
    const profResult = await postProfRes.json();
    expect(profResult.sampleCount).toBeGreaterThan(0);

    // Custom clustering
    const postClustReq = new NextRequest('http://localhost:3000/api/v1/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cluster', k: 2, algorithm: 't-SNE', dimensions: 2 }),
    });
    const postClustRes = await POST(postClustReq);
    expect(postClustRes.status).toBe(200);
    const clustResult = await postClustRes.json();
    expect(clustResult.nodes.length).toBeGreaterThan(0);

    // Custom calibration
    const postCalibReq = new NextRequest('http://localhost:3000/api/v1/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'calibrate', numBins: 5 }),
    });
    const postCalibRes = await POST(postCalibReq);
    expect(postCalibRes.status).toBe(200);
    const calibResult = await postCalibRes.json();
    expect(calibResult.bins.length).toBe(5);
  });
});
