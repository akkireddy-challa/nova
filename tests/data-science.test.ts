import { describe, expect, it } from 'bun:test';
import {
  computeDescriptiveStatistics,
  computeHistogram,
  profileTokenAndLatency,
  generateSampleTelemetry,
  euclideanDistance,
  kMeansCluster,
  computeSilhouetteScores,
  projectVectorsPCA,
  projectVectorstSNE,
  clusterAndProjectEmbeddings,
  generateSampleMemoryVectors,
  calculateCalibrationCurve,
  applyTemperatureScaling,
  generateMockCalibrationDataset,
  generateChurnPredictiveSimulation,
  generateAgenticLatencyBreakdown,
  approximateFPValue,
  generateMultiVariableVarianceAnalysis,
  createDataScienceArtifact,
} from '../src/lib/data-science';

describe('Data Science & Analytics Workbench Engine', () => {
  describe('1. Statistical Token & Latency Profiling', () => {
    it('should compute descriptive statistics with accurate percentiles and moments', () => {
      const data = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const stats = computeDescriptiveStatistics(data);

      expect(stats.count).toBe(10);
      expect(stats.mean).toBe(55);
      expect(stats.median).toBe(55);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(100);
      expect(stats.p90).toBe(91);
      expect(stats.p95).toBe(95.5);
      expect(stats.variance).toBeGreaterThan(0);
      expect(stats.stdDev).toBeGreaterThan(0);
      expect(stats.iqr).toBe(45);
    });

    it('should handle empty or single-item arrays gracefully', () => {
      const empty = computeDescriptiveStatistics([]);
      expect(empty.count).toBe(0);
      expect(empty.mean).toBe(0);

      const single = computeDescriptiveStatistics([42]);
      expect(single.count).toBe(1);
      expect(single.mean).toBe(42);
      expect(single.median).toBe(42);
      expect(single.stdDev).toBe(0);
    });

    it('should partition values into equal-width frequency histogram bins', () => {
      const values = [12, 18, 25, 45, 62, 78, 88, 95];
      const bins = computeHistogram(values, 4, 'ms');

      expect(bins.length).toBe(4);
      const totalCount = bins.reduce((sum, b) => sum + b.count, 0);
      expect(totalCount).toBe(values.length);
      const totalFreq = bins.reduce((sum, b) => sum + b.frequency, 0);
      expect(Math.round(totalFreq)).toBe(1);
    });

    it('should profile token efficiency, throughput, and model breakdowns', () => {
      const telemetry = generateSampleTelemetry(40);
      expect(telemetry.length).toBe(40);

      const profile = profileTokenAndLatency(telemetry);
      expect(profile.sampleCount).toBe(40);
      expect(profile.totalTokens).toBeGreaterThan(0);
      expect(profile.avgThroughputTokensPerSec).toBeGreaterThan(0);
      expect(profile.p95ThroughputTokensPerSec).toBeGreaterThanOrEqual(profile.avgThroughputTokensPerSec);
      expect(profile.efficiencyRatio).toBeGreaterThan(0);
      expect(profile.latencyHistogram.length).toBeGreaterThan(0);
      expect(profile.modelBreakdown.length).toBeGreaterThan(0);
    });
  });

  describe('2. Semantic Embedding Vector Clustering & Dimensionality Projection', () => {
    it('should calculate Euclidean distance and perform K-Means++ clustering', () => {
      const vecs = [
        [1, 1, 0],
        [1.2, 0.9, 0.1],
        [10, 10, 10],
        [10.2, 9.8, 10.1],
      ];

      const res = kMeansCluster(vecs, 2, 20);
      expect(res.assignments.length).toBe(4);
      expect(res.assignments[0]).toBe(res.assignments[1]);
      expect(res.assignments[2]).toBe(res.assignments[3]);
      expect(res.assignments[0]).not.toBe(res.assignments[2]);
      expect(res.wcss).toBeGreaterThanOrEqual(0);
    });

    it('should compute Silhouette scores correctly', () => {
      const vecs = [
        [1, 1],
        [1.1, 0.9],
        [8, 8],
        [8.1, 7.9],
      ];
      const assignments = [0, 0, 1, 1];
      const { scores, mean } = computeSilhouetteScores(vecs, assignments, 2);

      expect(scores.length).toBe(4);
      expect(mean).toBeGreaterThan(0.7); // Strongly separated clusters
    });

    it('should project vectors to 2D and 3D via PCA and t-SNE', () => {
      const memoryVectors = generateSampleMemoryVectors();
      expect(memoryVectors.length).toBe(12);

      // PCA 2D
      const pcaResult = clusterAndProjectEmbeddings(memoryVectors, {
        k: 4,
        algorithm: 'PCA',
        dimensions: 2,
      });
      expect(pcaResult.nodes.length).toBe(12);
      expect(pcaResult.clusters.length).toBe(4);
      expect(pcaResult.explainedVarianceRatio?.length).toBe(2);

      for (const node of pcaResult.nodes) {
        expect(typeof node.x).toBe('number');
        expect(typeof node.y).toBe('number');
        expect(node.z).toBeUndefined();
        expect(node.clusterColor).toBeDefined();
        expect(node.silhouetteScore).toBeDefined();
      }

      // t-SNE 3D
      const tsneResult = clusterAndProjectEmbeddings(memoryVectors, {
        k: 3,
        algorithm: 't-SNE',
        dimensions: 3,
      });
      expect(tsneResult.nodes.length).toBe(12);
      for (const node of tsneResult.nodes) {
        expect(node.z).toBeDefined();
      }
    });
  });

  describe('3. Proctor Confidence Calibration Curve', () => {
    it('should calculate binned calibration curve, ECE, MCE, and Brier score', () => {
      const dataset = generateMockCalibrationDataset(80, 'overconfident');
      expect(dataset.length).toBe(80);

      const report = calculateCalibrationCurve(dataset, 10);
      expect(report.totalPredictions).toBe(80);
      expect(report.bins.length).toBe(10);
      expect(report.ece).toBeGreaterThanOrEqual(0);
      expect(report.mce).toBeGreaterThanOrEqual(0);
      expect(report.brierScore).toBeGreaterThanOrEqual(0);
      expect(report.reliabilityIndex).toBeGreaterThanOrEqual(0);
      expect(report.reliabilityIndex).toBeLessThanOrEqual(100);
      expect(report.chartData.length).toBe(10);
      expect(report.diagnosis).toBeTruthy();
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should apply temperature scaling calibration transformation', () => {
      const rawProbs = [0.1, 0.5, 0.9];
      const scaled = applyTemperatureScaling(rawProbs, 1.5);

      expect(scaled.length).toBe(3);
      // Temperature > 1 softens probabilities toward 0.5
      expect(scaled[0]).toBeGreaterThan(rawProbs[0]);
      expect(scaled[1]).toBeCloseTo(0.5, 2);
      expect(scaled[2]).toBeLessThan(rawProbs[2]);
    });
  });

  describe('4. Real-world Data Science Use Cases', () => {
    it('should execute Churn Predictive Simulation with Kaplan-Meier curve and SHAP attributions', () => {
      const result = generateChurnPredictiveSimulation();

      expect(result.cohortCount).toBeGreaterThan(0);
      expect(result.avgChurnRate).toBeGreaterThan(0);
      expect(result.avgChurnRate).toBeLessThan(1);
      expect(result.featureImportance.length).toBeGreaterThan(0);
      expect(result.survivalCurve.length).toBe(12);
      expect(result.customerProfiles.length).toBe(result.cohortCount);

      for (const profile of result.customerProfiles) {
        expect(profile.churnProbability).toBeGreaterThanOrEqual(0);
        expect(profile.churnProbability).toBeLessThanOrEqual(1);
        expect(profile.topRiskFactors.length).toBeGreaterThan(0);
        expect(profile.prescriptiveMitigation).toBeTruthy();
      }
    });

    it('should generate Agentic Latency Breakdown with critical path and M/M/c queueing load model', () => {
      const breakdown = generateAgenticLatencyBreakdown();

      expect(breakdown.totalTurnaroundMs).toBeGreaterThan(0);
      expect(breakdown.stages.length).toBe(11);
      expect(breakdown.criticalPathMs).toBeLessThanOrEqual(breakdown.totalTurnaroundMs);
      expect(breakdown.concurrencyScaling.length).toBeGreaterThan(0);
      expect(breakdown.primaryBottleneck).toBeTruthy();
      expect(breakdown.recommendedArchitectureImprovements.length).toBeGreaterThan(0);

      // Verify concurrency latency increases monotonically with queue saturation
      const first = breakdown.concurrencyScaling[0];
      const last = breakdown.concurrencyScaling[breakdown.concurrencyScaling.length - 1];
      expect(last.avgLatencyMs).toBeGreaterThan(first.avgLatencyMs);
      expect(last.queueWaitMs).toBeGreaterThan(first.queueWaitMs);
    });

    it('should conduct Factorial ANOVA variance analysis with F-test and p-values', () => {
      const anova = generateMultiVariableVarianceAnalysis();

      expect(anova.totalObservations).toBe(72);
      expect(anova.anovaTable.length).toBe(4);
      expect(anova.dependentVariable).toBe('Task Benchmark Accuracy (%)');

      const modelRow = anova.anovaTable.find(r => r.source.includes('Model Architecture'));
      expect(modelRow).toBeDefined();
      expect(modelRow?.fStatistic).toBeGreaterThan(0);
      expect(modelRow?.isSignificant).toBe(true);

      const budgetRow = anova.anovaTable.find(r => r.source.includes('Thinking Budget'));
      expect(budgetRow).toBeDefined();
      expect(budgetRow?.fStatistic).toBeGreaterThan(0);
      expect(budgetRow?.isSignificant).toBe(true);

      expect(anova.statisticalVerdict).toBeTruthy();
      expect(anova.actionableInsights.length).toBe(3);
    });

    it('should build a complete DataScienceArtifact compatible with generative cards', () => {
      const artifact = createDataScienceArtifact('Autonomous Model Routing Benchmark');
      expect(artifact.title).toContain('Autonomous Model Routing');
      expect(artifact.overview).toBeTruthy();
      expect(artifact.tokenAnalysis.totalTokens).toBeGreaterThan(0);
      expect(artifact.tokenAnalysis.topTokensByEntropy.length).toBeGreaterThan(0);
      expect(artifact.vectorClustering.clusterCount).toBeGreaterThan(0);
      expect(artifact.vectorClustering.points.length).toBeGreaterThan(0);
      expect(artifact.vectorClustering.centroids.length).toBeGreaterThan(0);
      expect(artifact.confidenceCalibration.reliabilityCurve.length).toBeGreaterThan(0);
      expect(artifact.statisticalVerdict).toBeTruthy();
    });
  });
});
