import { NextRequest, NextResponse } from 'next/server';
import { runAutonomousSelfImprovement } from '@/lib/self-evolution';

export async function GET() {
  return NextResponse.json({
    status: 'active',
    agent: 'Nova Self-Evolution & Doc-Gardening Agent',
    capabilities: [
      'Verifiable regression testing',
      'Doc-gardening & API route sync',
      'HyperSkill hypergraph memory pruning',
      'EVOLUTION.md autonomous changelog',
      'Git post-commit autonomous hook',
      'GitHub Actions CI continuous self-evolution',
    ],
  });
}

export async function POST(req: NextRequest) {
  try {
    const repoRoot = process.cwd();
    const report = await runAutonomousSelfImprovement(repoRoot);
    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Self-improvement API error:', error);
    return NextResponse.json(
      { error: error.message || 'Error executing self-improvement cycle' },
      { status: 500 }
    );
  }
}
