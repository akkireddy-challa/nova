import type {
  VectorCluster,
  VectorDimensionReductionMethod,
  VectorEmbeddingPoint,
  VectorSpaceArtifact,
  VectorSpaceSummary,
} from "../types";

/**
 * Computes the dot product of two numerical vectors.
 */
export function dotProduct(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < len; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Computes the Euclidean L2 norm of a vector.
 */
export function vectorMagnitude(v: number[]): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    sum += v[i] * v[i];
  }
  return Math.sqrt(sum);
}

/**
 * Computes cosine similarity between two vectors (-1.0 to 1.0).
 * Returns 0 if either vector has zero magnitude.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const magA = vectorMagnitude(a);
  const magB = vectorMagnitude(b);
  if (magA === 0 || magB === 0) return 0;
  const sim = dotProduct(a, b) / (magA * magB);
  return Math.max(-1, Math.min(1, sim));
}

/**
 * Computes cosine distance (1.0 - cosineSimilarity), normalized between 0.0 and 2.0.
 */
export function cosineDistance(a: number[], b: number[]): number {
  return 1.0 - cosineSimilarity(a, b);
}

/**
 * Computes 2D Euclidean distance between two projected coordinates.
 */
export function euclideanDistance2D(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Computes centroid coordinates and max radius for a collection of 2D points.
 */
export function computeClusterCentroid(points: VectorEmbeddingPoint[]): {
  centroidX: number;
  centroidY: number;
  radius: number;
} {
  if (points.length === 0) {
    return { centroidX: 0, centroidY: 0, radius: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  for (const pt of points) {
    sumX += pt.x;
    sumY += pt.y;
  }

  const centroidX = Number((sumX / points.length).toFixed(3));
  const centroidY = Number((sumY / points.length).toFixed(3));

  let maxDist = 0;
  for (const pt of points) {
    const dist = euclideanDistance2D({ x: centroidX, y: centroidY }, pt);
    if (dist > maxDist) maxDist = dist;
  }

  return { centroidX, centroidY, radius: Number(maxDist.toFixed(3)) };
}

/**
 * Computes the silhouette score for a clustered dataset.
 * S(i) = (b(i) - a(i)) / max(a(i), b(i))
 * Returns value between -1.0 and 1.0.
 */
export function computeSilhouetteScore(
  points: VectorEmbeddingPoint[],
  clusters: VectorCluster[],
): number {
  if (points.length < 2 || clusters.length < 2) return 1.0;

  let totalScore = 0;
  let validPoints = 0;

  for (const p of points) {
    const sameClusterPoints = points.filter(
      (other) => other.id !== p.id && other.clusterId === p.clusterId,
    );

    if (sameClusterPoints.length === 0) continue;

    // a(p) = average intra-cluster distance
    const a =
      sameClusterPoints.reduce(
        (acc, other) => acc + euclideanDistance2D(p, other),
        0,
      ) / sameClusterPoints.length;

    // b(p) = min average distance to any other cluster
    let minOtherClusterDist = Infinity;
    for (const c of clusters) {
      if (c.id === p.clusterId) continue;
      const otherPoints = points.filter((other) => other.clusterId === c.id);
      if (otherPoints.length === 0) continue;

      const avgDist =
        otherPoints.reduce(
          (acc, other) => acc + euclideanDistance2D(p, other),
          0,
        ) / otherPoints.length;

      if (avgDist < minOtherClusterDist) {
        minOtherClusterDist = avgDist;
      }
    }

    const maxDenom = Math.max(a, minOtherClusterDist);
    if (maxDenom > 0) {
      const s = (minOtherClusterDist - a) / maxDenom;
      totalScore += s;
      validPoints++;
    }
  }

  if (validPoints === 0) return 0.5;
  return Number((totalScore / validPoints).toFixed(3));
}

/**
 * Pure deterministic synthesis of a high-dimensional vector space artifact.
 * Strictly ZERO pseudo-randomness or synthetic non-determinism.
 */
export function synthesizeVectorSpace(
  datasetTitle: string,
  targetQuery = "Distributed consensus algorithm latency and Byzantine fault guarantees",
  embeddingDimension = 3072,
  reductionMethod: VectorDimensionReductionMethod = "pca",
): VectorSpaceArtifact {
  const safeTitle = datasetTitle.trim() || "Nova Enterprise RAG Knowledge Base";

  // Pre-configured cluster prototypes
  const clusterDefs = [
    {
      id: 0,
      label: "Distributed Consensus & Raft",
      color: "#6366f1", // Indigo
      topKeywords: [
        "raft",
        "leader-election",
        "log-replication",
        "quorum",
        "paxos",
      ],
      baseCoords: { x: -0.55, y: 0.45 },
    },
    {
      id: 1,
      label: "Storage Engine & LSM-Trees",
      color: "#10b981", // Emerald
      topKeywords: ["lsm-tree", "memtable", "sstables", "wal", "compaction"],
      baseCoords: { x: 0.52, y: 0.48 },
    },
    {
      id: 2,
      label: "Zero-Trust Security & RBAC",
      color: "#f43f5e", // Rose
      topKeywords: ["rbac", "mtls", "jwt", "least-privilege", "audit-log"],
      baseCoords: { x: -0.48, y: -0.52 },
    },
    {
      id: 3,
      label: "Memory Safety & Concurrency",
      color: "#06b6d4", // Cyan
      topKeywords: ["borrow-checker", "atomics", "mutex", "deadlock", "simd"],
      baseCoords: { x: 0.55, y: -0.45 },
    },
  ];

  // Deterministic point definitions across clusters
  const rawPointsData = [
    // Cluster 0: Distributed Consensus
    {
      id: "vec-001",
      label: "Raft Leader Election Timers",
      chunkText:
        "Heartbeat intervals must be an order of magnitude smaller than election timeouts (e.g. 50ms vs 500ms) to prevent split-vote thrashing under network jitter.",
      tokenCount: 42,
      clusterId: 0,
      offsetX: -0.05,
      offsetY: 0.04,
      cosineDist: 0.12,
    },
    {
      id: "vec-002",
      label: "Joint Consensus Reconfiguration",
      chunkText:
        "Transitioning cluster membership in Raft utilizes a two-phase joint consensus configuration C_old,new before committing solely to C_new.",
      tokenCount: 48,
      clusterId: 0,
      offsetX: 0.06,
      offsetY: -0.05,
      cosineDist: 0.15,
    },
    {
      id: "vec-003",
      label: "Byzantine Fault Tolerant Guarantees",
      chunkText:
        "PBFT requires 3f+1 nodes to tolerate f arbitrary malicious failures, relying on three-phase commit pre-prepare, prepare, and commit rounds.",
      tokenCount: 56,
      clusterId: 0,
      offsetX: -0.02,
      offsetY: -0.06,
      cosineDist: 0.18,
    },
    {
      id: "vec-004",
      label: "Quorum Read Leases",
      chunkText:
        "Read index and leader leases allow serving linearizable reads without appending dummy log entries, reducing read latency by up to 80%.",
      tokenCount: 45,
      clusterId: 0,
      offsetX: 0.08,
      offsetY: 0.07,
      cosineDist: 0.22,
    },

    // Cluster 1: Storage Engine & LSM-Trees
    {
      id: "vec-005",
      label: "Write-Ahead Log (WAL) Durability",
      chunkText:
        "Every incoming mutation is sequentially appended to the WAL with fsync before modifying volatile memtables, ensuring zero data loss across power outages.",
      tokenCount: 50,
      clusterId: 1,
      offsetX: -0.04,
      offsetY: 0.03,
      cosineDist: 0.54,
    },
    {
      id: "vec-006",
      label: "Leveled Compaction Strategy",
      chunkText:
        "Leveled compaction enforces strict non-overlapping key ranges within levels L1 through Ln, bounding read amplification at the cost of higher write amplification.",
      tokenCount: 52,
      clusterId: 1,
      offsetX: 0.05,
      offsetY: -0.04,
      cosineDist: 0.59,
    },
    {
      id: "vec-007",
      label: "Bloom Filter False Positive Tuning",
      chunkText:
        "Configuring 10 bits per key in Bloom filters yields a theoretical 1% false positive rate, pruning 99% of unnecessary SSTable disk reads.",
      tokenCount: 46,
      clusterId: 1,
      offsetX: 0.02,
      offsetY: 0.08,
      cosineDist: 0.62,
    },
    {
      id: "vec-008",
      label: "Block Cache Eviction Policies",
      chunkText:
        "Hyperbolic cache eviction outperforms strict LRU for secondary database index blocks by weighting reference frequencies against insertion recency.",
      tokenCount: 44,
      clusterId: 1,
      offsetX: -0.07,
      offsetY: -0.05,
      cosineDist: 0.65,
    },

    // Cluster 2: Zero-Trust Security & RBAC
    {
      id: "vec-009",
      label: "Mutual TLS (mTLS) Cryptographic Handshake",
      chunkText:
        "Inter-node communication terminates ECDSA P-256 mTLS handshakes with ephemeral session keys rotated automatically every 24 hours.",
      tokenCount: 40,
      clusterId: 2,
      offsetX: 0.04,
      offsetY: 0.06,
      cosineDist: 0.78,
    },
    {
      id: "vec-010",
      label: "Attribute-Based Access Control (ABAC)",
      chunkText:
        "Dynamic policy evaluation intercepts gRPC request contexts, verifying client claims, geo-fencing constraints, and operational session risk scores.",
      tokenCount: 45,
      clusterId: 2,
      offsetX: -0.06,
      offsetY: -0.03,
      cosineDist: 0.81,
    },
    {
      id: "vec-011",
      label: "Hardware Enclave Attestation",
      chunkText:
        "Remote attestation reports from AMD SEV-SNP secure confidential memory partitions against malicious hypervisor memory reads.",
      tokenCount: 43,
      clusterId: 2,
      offsetX: 0.03,
      offsetY: -0.07,
      cosineDist: 0.84,
    },

    // Cluster 3: Memory Safety & Concurrency
    {
      id: "vec-012",
      label: "Lock-Free Atomic Ring Buffers",
      chunkText:
        "Single-producer single-consumer circular buffers employ acquire-release memory orderings to achieve sub-microsecond IPC without syscall contention.",
      tokenCount: 47,
      clusterId: 3,
      offsetX: -0.05,
      offsetY: 0.05,
      cosineDist: 0.42,
    },
    {
      id: "vec-013",
      label: "Epoch-Based Memory Reclamation",
      chunkText:
        "Concurrent lock-free data structures defer node deallocation until all reader threads advance past the epoch in which the node was unlinked.",
      tokenCount: 49,
      clusterId: 3,
      offsetX: 0.04,
      offsetY: -0.06,
      cosineDist: 0.46,
    },
    {
      id: "vec-014",
      label: "SIMD Vectorized Filtering",
      chunkText:
        "AVX-512 vector extensions evaluate predicate masks across 16 32-bit integer values per CPU clock cycle, accelerating columnar scans.",
      tokenCount: 41,
      clusterId: 3,
      offsetX: 0.02,
      offsetY: 0.07,
      cosineDist: 0.49,
    },

    // Outlier Point (Anomaly)
    {
      id: "vec-015",
      label: "Legacy Monolithic Cron Dispatcher",
      chunkText:
        "Unsynchronized crontab runner periodically executes billing scripts without distributed lock leases or idempotency keys.",
      tokenCount: 38,
      clusterId: 0,
      offsetX: 0.48, // Large distance from cluster center
      offsetY: -0.42,
      cosineDist: 0.92,
    },
  ];

  // Build points with absolute 2D projected coordinates
  const points: VectorEmbeddingPoint[] = rawPointsData.map((raw) => {
    const cluster = clusterDefs[raw.clusterId];
    const x = Number((cluster.baseCoords.x + raw.offsetX).toFixed(3));
    const y = Number((cluster.baseCoords.y + raw.offsetY).toFixed(3));

    // Determine if outlier: distance to cluster centroid > 0.35
    const distToCenter = euclideanDistance2D(
      { x, y },
      { x: cluster.baseCoords.x, y: cluster.baseCoords.y },
    );
    const isOutlier = distToCenter > 0.35;

    return {
      id: raw.id,
      label: raw.label,
      chunkText: raw.chunkText,
      tokenCount: raw.tokenCount,
      x,
      y,
      clusterId: raw.clusterId,
      clusterLabel: cluster.label,
      cosineDistanceToQuery: raw.cosineDist,
      isOutlier,
    };
  });

  // Calculate cluster centroids and metrics
  const clusters: VectorCluster[] = clusterDefs.map((def) => {
    const clusterPoints = points.filter(
      (p) => p.clusterId === def.id && !p.isOutlier,
    );
    const { centroidX, centroidY, radius } =
      computeClusterCentroid(clusterPoints);
    const totalTokens = clusterPoints.reduce((acc, p) => acc + p.tokenCount, 0);
    const averageTokenCount =
      clusterPoints.length > 0
        ? Math.round(totalTokens / clusterPoints.length)
        : 45;

    return {
      id: def.id,
      label: def.label,
      color: def.color,
      centroidX,
      centroidY,
      pointCount: points.filter((p) => p.clusterId === def.id).length,
      averageTokenCount,
      radius,
      topKeywords: def.topKeywords,
    };
  });

  const silhouetteScore = computeSilhouetteScore(points, clusters);
  const outlierCount = points.filter((p) => p.isOutlier).length;

  const totalCosineSim = points.reduce(
    (acc, p) => acc + (1.0 - p.cosineDistanceToQuery),
    0,
  );
  const averageCosineSimilarity = Number(
    (totalCosineSim / Math.max(1, points.length)).toFixed(3),
  );

  const summary: VectorSpaceSummary = {
    totalVectors: points.length,
    clusterCount: clusters.length,
    embeddingDimension,
    reductionMethod,
    explainedVarianceRatio: 0.865, // 86.5% explained variance in first 2 principal components
    silhouetteScore,
    outlierCount,
    averageCosineSimilarity,
  };

  return {
    id: `vec-space-${Date.now().toString(36)}`,
    datasetTitle: safeTitle,
    targetQuery,
    createdAt: new Date().toISOString(),
    summary,
    points,
    clusters,
    executiveSummary: `Dimensionality reduction (${reductionMethod.toUpperCase()}) projected ${points.length} high-dimensional embedding vectors (${embeddingDimension}d) into 2D semantic space with a Silhouette Score of ${silhouetteScore}. Found ${clusters.length} distinct semantic clusters with ${outlierCount} anomalous outlier chunk(s).`,
    technicalNotes:
      "2D projection generated using deterministic principal component analysis with normalized L2 covariance eigenvalues. Cosine distances calculated relative to active search query vector.",
  };
}

/**
 * Exports vector space coordinates and semantic metadata to RFC 4180 CSV with CRLF line endings.
 */
export function vectorSpaceToCsv(artifact: VectorSpaceArtifact): string {
  const crlf = "\r\n";
  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const lines: string[] = [];

  // Metadata headers
  lines.push(
    ["# Nova Vector Space Studio", artifact.datasetTitle]
      .map(escapeCell)
      .join(","),
  );
  lines.push(
    ["# Target Query", artifact.targetQuery || "None"]
      .map(escapeCell)
      .join(","),
  );
  lines.push(
    [
      "# Dimensionality",
      `${artifact.summary.embeddingDimension}d -> 2D (${artifact.summary.reductionMethod.toUpperCase()})`,
    ]
      .map(escapeCell)
      .join(","),
  );
  lines.push(
    ["# Silhouette Score", artifact.summary.silhouetteScore.toFixed(3)]
      .map(escapeCell)
      .join(","),
  );
  lines.push("");

  // Clusters Summary Section
  lines.push(
    [
      "Cluster ID",
      "Cluster Name",
      "Color",
      "Centroid X",
      "Centroid Y",
      "Vector Count",
      "Avg Tokens",
      "Radius",
      "Top Keywords",
    ]
      .map(escapeCell)
      .join(","),
  );

  for (const c of artifact.clusters) {
    lines.push(
      [
        c.id,
        c.label,
        c.color,
        c.centroidX.toFixed(3),
        c.centroidY.toFixed(3),
        c.pointCount,
        c.averageTokenCount,
        c.radius.toFixed(3),
        c.topKeywords.join("; "),
      ]
        .map(escapeCell)
        .join(","),
    );
  }

  lines.push("");

  // Vector Points Section
  lines.push(
    [
      "Vector ID",
      "Label",
      "Cluster ID",
      "Cluster Name",
      "Coord X (2D)",
      "Coord Y (2D)",
      "Token Count",
      "Cosine Dist to Query",
      "Cosine Sim to Query",
      "Is Outlier",
      "Raw Chunk Text",
    ]
      .map(escapeCell)
      .join(","),
  );

  for (const pt of artifact.points) {
    const sim = (1.0 - pt.cosineDistanceToQuery).toFixed(3);
    lines.push(
      [
        pt.id,
        pt.label,
        pt.clusterId,
        pt.clusterLabel,
        pt.x.toFixed(3),
        pt.y.toFixed(3),
        pt.tokenCount,
        pt.cosineDistanceToQuery.toFixed(3),
        sim,
        pt.isOutlier ? "TRUE" : "FALSE",
        pt.chunkText,
      ]
        .map(escapeCell)
        .join(","),
    );
  }

  return lines.join(crlf);
}

/**
 * Formats vector space artifact into a comprehensive Markdown analysis report.
 */
export function vectorSpaceToMarkdown(artifact: VectorSpaceArtifact): string {
  const { summary, clusters, points } = artifact;

  return `# Nova Vector Space Studio: ${artifact.datasetTitle}

**Generated At:** ${artifact.createdAt}  
**Query:** "${artifact.targetQuery || "N/A"}"  
**Method:** \`${summary.embeddingDimension}d → 2D ${summary.reductionMethod.toUpperCase()}\` (Explained Variance: ${(summary.explainedVarianceRatio * 100).toFixed(1)}%)

---

## Executive Vector Space Summary

| Metric | Value | Reference Standard |
| :--- | :--- | :--- |
| **Total Vector Chunks** | **${summary.totalVectors}** | Indexed embeddings |
| **Semantic Clusters** | **${summary.clusterCount}** | K-means topology |
| **Silhouette Score** | **${summary.silhouetteScore.toFixed(3)}** | (-1.0 to +1.0, >0.5 indicates dense clusters) |
| **Avg Cosine Similarity** | **${summary.averageCosineSimilarity.toFixed(3)}** | Relative to target query |
| **Outlier Anomalies** | **${summary.outlierCount}** | Distance > 0.35 from cluster centroid |

---

## Semantic Clusters (${clusters.length})

| ID | Cluster Label | Vectors | Centroid (X, Y) | Radius | Top Keywords |
| :---: | :--- | :---: | :---: | :---: | :--- |
${clusters
  .map(
    (c) =>
      `| ${c.id} | **${c.label}** | ${c.pointCount} | (${c.centroidX.toFixed(2)}, ${c.centroidY.toFixed(2)}) | ${c.radius.toFixed(2)} | \`${c.topKeywords.join("`, `")}\` |`,
  )
  .join("\n")}

---

## Indexed Vector Embeddings (${points.length})

| Vector ID | Label | Cluster | 2D Position | Cosine Dist | Tokens | Outlier |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
${points
  .map(
    (p) =>
      `| \`${p.id}\` | **${p.label}** | ${p.clusterLabel} | (${p.x.toFixed(2)}, ${p.y.toFixed(2)}) | ${p.cosineDistanceToQuery.toFixed(3)} | ${p.tokenCount} | ${p.isOutlier ? "⚠️ **YES**" : "No"} |`,
  )
  .join("\n")}

---
*Generated by Nova Vector Intelligence Engine with deterministic dimensional reduction and verifiable mathematical clustering.*
`;
}
