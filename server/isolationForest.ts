/**
 * Isolation Forest (iForest) multivariate anomaly detection algorithm.
 * Implements the isolation tree ensemble based on Liu, Ting, and Zhou (2008).
 * Scored anomalies reflect how easily a data point is isolated in random hyperplane partitions.
 */

export interface FeaturePoint {
  id?: number | string;
  values: number[]; // e.g. [hour_deviation, log_bytes, auth_failures, sensitive_flag, travel_velocity, event_frequency]
}

interface TreeNode {
  isLeaf: boolean;
  size: number;
  splitFeature?: number;
  splitValue?: number;
  left?: TreeNode;
  right?: TreeNode;
}

/**
 * Euler-Mascheroni constant approximation for average path length c(n)
 */
function averagePathLength(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  const eulerMascheroni = 0.5772156649;
  return 2 * (Math.log(n - 1) + eulerMascheroni) - (2 * (n - 1)) / n;
}

export class IsolationForest {
  private trees: TreeNode[] = [];
  private numTrees: number;
  private subSampleSize: number;
  private maxDepth: number;
  private numFeatures: number = 0;

  constructor(numTrees: number = 60, subSampleSize: number = 128) {
    this.numTrees = numTrees;
    this.subSampleSize = subSampleSize;
    this.maxDepth = Math.ceil(Math.log2(Math.max(subSampleSize, 2)));
  }

  public fit(data: number[][]): void {
    if (data.length === 0) return;
    this.numFeatures = data[0].length;
    this.trees = [];

    const effectiveSampleSize = Math.min(this.subSampleSize, data.length);
    this.maxDepth = Math.ceil(Math.log2(Math.max(effectiveSampleSize, 2)));

    for (let t = 0; t < this.numTrees; t++) {
      // Subsample with replacement or without
      const sample = this.getRandomSubsample(data, effectiveSampleSize);
      const tree = this.buildITree(sample, 0, this.maxDepth);
      this.trees.push(tree);
    }
  }

  private getRandomSubsample(data: number[][], size: number): number[][] {
    const indices = new Set<number>();
    const n = data.length;
    const sampleSize = Math.min(size, n);
    while (indices.size < sampleSize) {
      indices.add(Math.floor(Math.random() * n));
    }
    return Array.from(indices).map((i) => data[i]);
  }

  private buildITree(X: number[][], currentDepth: number, maxDepth: number): TreeNode {
    const n = X.length;
    if (currentDepth >= maxDepth || n <= 1) {
      return { isLeaf: true, size: n };
    }

    // Check if all rows are identical
    let allSame = true;
    for (let i = 1; i < n; i++) {
      for (let f = 0; f < this.numFeatures; f++) {
        if (X[i][f] !== X[0][f]) {
          allSame = false;
          break;
        }
      }
      if (!allSame) break;
    }
    if (allSame) {
      return { isLeaf: true, size: n };
    }

    // Pick a random feature with variance
    const validFeatures: number[] = [];
    const minMax: Array<{ min: number; max: number }> = [];

    for (let f = 0; f < this.numFeatures; f++) {
      let min = X[0][f];
      let max = X[0][f];
      for (let i = 1; i < n; i++) {
        const val = X[i][f];
        if (val < min) min = val;
        if (val > max) max = val;
      }
      if (max > min) {
        validFeatures.push(f);
        minMax[f] = { min, max };
      }
    }

    if (validFeatures.length === 0) {
      return { isLeaf: true, size: n };
    }

    const featureIdx = validFeatures[Math.floor(Math.random() * validFeatures.length)];
    const { min, max } = minMax[featureIdx];
    const splitVal = min + Math.random() * (max - min);

    const leftData: number[][] = [];
    const rightData: number[][] = [];

    for (let i = 0; i < n; i++) {
      if (X[i][featureIdx] < splitVal) {
        leftData.push(X[i]);
      } else {
        rightData.push(X[i]);
      }
    }

    return {
      isLeaf: false,
      size: n,
      splitFeature: featureIdx,
      splitValue: splitVal,
      left: this.buildITree(leftData, currentDepth + 1, maxDepth),
      right: this.buildITree(rightData, currentDepth + 1, maxDepth),
    };
  }

  private pathLength(x: number[], node: TreeNode, currentDepth: number): number {
    if (node.isLeaf) {
      return currentDepth + averagePathLength(node.size);
    }
    const splitFeat = node.splitFeature!;
    const splitVal = node.splitValue!;
    if (x[splitFeat] < splitVal) {
      return this.pathLength(x, node.left!, currentDepth + 1);
    } else {
      return this.pathLength(x, node.right!, currentDepth + 1);
    }
  }

  /**
   * Scores a single multivariate vector.
   * Returns:
   * - rawScore: 0 to 1 (values > 0.58 indicate anomalies, > 0.70 extreme anomalies)
   * - normalizedScore: 0 to 100 scaled for security dashboards
   * - avgPathLength: average depth before isolation
   */
  public score(x: number[]): { rawScore: number; normalizedScore: number; avgPathLength: number } {
    if (this.trees.length === 0) {
      return { rawScore: 0.5, normalizedScore: 50, avgPathLength: 0 };
    }

    let totalPath = 0;
    for (const tree of this.trees) {
      totalPath += this.pathLength(x, tree, 0);
    }
    const avgPath = totalPath / this.trees.length;
    const cN = averagePathLength(this.subSampleSize);
    
    // Anomaly score s = 2 ^ (-E(h) / c(n))
    const rawScore = Math.pow(2, -avgPath / cN);

    // Rescale s from [0, 1] into a calibrated 0-100 risk score
    // In typical iForest, normal points are around 0.35-0.52. Points > 0.55 are anomalous.
    // We calibrate so:
    // s <= 0.40 -> 0-30
    // s = 0.55 -> ~65
    // s >= 0.70 -> 90-100
    let normalized = 0;
    if (rawScore <= 0.45) {
      normalized = (rawScore / 0.45) * 35;
    } else if (rawScore <= 0.60) {
      normalized = 35 + ((rawScore - 0.45) / 0.15) * 35; // 35 -> 70
    } else {
      normalized = 70 + Math.min(30, ((rawScore - 0.60) / 0.20) * 30); // 70 -> 100
    }

    return {
      rawScore: Math.round(rawScore * 1000) / 1000,
      normalizedScore: Math.round(Math.min(100, Math.max(0, normalized))),
      avgPathLength: Math.round(avgPath * 100) / 100,
    };
  }

  /**
   * Explains which features contributed most to isolation
   */
  public explain(x: number[], featureNames: string[]): Array<{ feature: string; contribution: number; value: number }> {
    const featureSplitsCount: number[] = new Array(this.numFeatures).fill(0);
    const featureDepthSum: number[] = new Array(this.numFeatures).fill(0);

    for (const tree of this.trees) {
      let curr: TreeNode | undefined = tree;
      let depth = 0;
      while (curr && !curr.isLeaf) {
        const feat: number = curr.splitFeature!;
        featureSplitsCount[feat]++;
        featureDepthSum[feat] += depth;
        curr = x[feat] < curr.splitValue! ? curr.left : curr.right;
        depth++;
      }
    }

    const results = featureNames.map((name, i) => {
      // Features split closer to the root (low average depth) on points that isolated quickly have higher impact
      const count = featureSplitsCount[i] || 1;
      const avgDepth = featureDepthSum[i] / count;
      const impact = (featureSplitsCount[i] / (this.trees.length || 1)) * (1 / (1 + avgDepth * 0.4));
      return {
        feature: name,
        contribution: Math.round(impact * 100),
        value: x[i],
      };
    });

    results.sort((a, b) => b.contribution - a.contribution);
    return results;
  }
}
