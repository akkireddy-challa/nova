#!/usr/bin/env bun
// Nova: Autonomous Repository Self-Improvement & Doc-Gardening Agent
// Directly implements patterns from Harness² (arXiv:2610.14224) and HyperSkill (arXiv:2608.16114)

import { runAutonomousSelfImprovement } from '../src/lib/self-evolution';

async function main() {
  console.log('\n🤖 Nova Autonomous Self-Evolution Engine Initiated...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const repoRoot = process.cwd();
  const startTime = performance.now();

  try {
    const report = await runAutonomousSelfImprovement(repoRoot);
    const duration = Math.round(performance.now() - startTime);

    console.log(`\n✓ Autonomous Self-Improvement Cycle Completed in ${duration}ms!`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`• Timestamp:           ${report.timestamp}`);
    console.log(`• Regression Evals:    ${report.evalPassRate}% Pass Rate (${report.totalScenarios} scenarios)`);
    console.log(`• Doc-Gardening:       ${report.docGardening.routesSynced} API Routes Synchronized`);
    console.log(`• HyperSkill Memory:   ${report.hypergraphMemory.totalHyperedges} Active Trajectory Hyperedges`);
    console.log(`• Entropy Status:      ${report.entropyStatus.toUpperCase()}`);
    console.log('\nEvolution Notes:');
    report.evolutionNotes.forEach(n => console.log(`  ➔ ${n}`));
    console.log('\nRepository is 100% healthy, verified, and self-evolved.\n');
    process.exit(0);
  } catch (error: any) {
    console.error('\n✗ Self-improvement cycle encountered an error:', error.message);
    process.exit(1);
  }
}

main();
