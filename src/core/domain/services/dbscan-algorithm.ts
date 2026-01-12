/**
 * DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
 * Clusters canvas nodes based on their 2D coordinates
 *
 * Advantages for canvas layout:
 * - No need to pre-specify number of clusters
 * - Naturally handles noise (isolated notes)
 * - Works well with coordinate-based proximity
 */

import { Coordinate } from '../value-objects/coordinate.js';

export interface DBSCANPoint {
  id: string;
  coordinate: Coordinate;
}

export interface DBSCANCluster {
  /** Cluster ID (-1 for noise) */
  clusterId: number;
  /** Points in this cluster */
  points: DBSCANPoint[];
  /** Centroid of the cluster */
  centroid: Coordinate;
}

export interface DBSCANResult {
  /** All clusters (excluding noise) */
  clusters: DBSCANCluster[];
  /** Noise points (not in any cluster) */
  noise: DBSCANPoint[];
  /** Map from point ID to cluster ID (-1 for noise) */
  assignments: Map<string, number>;
}

export interface DBSCANOptions {
  /** Epsilon: maximum distance between two points to be considered neighbors */
  eps: number;
  /** Minimum points required to form a dense region (cluster) */
  minPts: number;
}

const DEFAULT_OPTIONS: DBSCANOptions = {
  eps: 200, // 200 pixels
  minPts: 2,
};

/**
 * DBSCAN Algorithm Service
 * Pure domain service - no external dependencies
 */
export class DBSCANAlgorithm {
  private options: DBSCANOptions;

  constructor(options?: Partial<DBSCANOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Calculate Euclidean distance between two coordinates
   */
  private distance(a: Coordinate, b: Coordinate): number {
    return a.distanceTo(b);
  }

  /**
   * Find all neighbors of a point within eps distance
   */
  private regionQuery(
    points: DBSCANPoint[],
    pointIndex: number
  ): number[] {
    const neighbors: number[] = [];
    const point = points[pointIndex];

    for (let i = 0; i < points.length; i++) {
      if (this.distance(point.coordinate, points[i].coordinate) <= this.options.eps) {
        neighbors.push(i);
      }
    }

    return neighbors;
  }

  /**
   * Expand cluster by adding all density-reachable points
   */
  private expandCluster(
    points: DBSCANPoint[],
    labels: number[],
    pointIndex: number,
    neighbors: number[],
    clusterId: number
  ): void {
    labels[pointIndex] = clusterId;

    const queue = [...neighbors];
    const visited = new Set<number>([pointIndex]);

    while (queue.length > 0) {
      const currentIndex = queue.shift()!;

      if (visited.has(currentIndex)) continue;
      visited.add(currentIndex);

      // If point was labeled as noise, change to border point
      if (labels[currentIndex] === -1) {
        labels[currentIndex] = clusterId;
      }

      // If point was unvisited
      if (labels[currentIndex] === undefined) {
        labels[currentIndex] = clusterId;

        const currentNeighbors = this.regionQuery(points, currentIndex);

        // If this point is a core point, add its neighbors to the queue
        if (currentNeighbors.length >= this.options.minPts) {
          for (const neighbor of currentNeighbors) {
            if (!visited.has(neighbor)) {
              queue.push(neighbor);
            }
          }
        }
      }
    }
  }

  /**
   * Calculate centroid of a set of points
   */
  private calculateCentroid(points: DBSCANPoint[]): Coordinate {
    if (points.length === 0) {
      return Coordinate.origin();
    }

    let sumX = 0;
    let sumY = 0;

    for (const point of points) {
      sumX += point.coordinate.x;
      sumY += point.coordinate.y;
    }

    return new Coordinate(
      Math.round(sumX / points.length),
      Math.round(sumY / points.length)
    );
  }

  /**
   * Run DBSCAN clustering
   * @param points Array of points to cluster
   * @returns Clustering result
   */
  run(points: DBSCANPoint[]): DBSCANResult {
    if (points.length === 0) {
      return {
        clusters: [],
        noise: [],
        assignments: new Map(),
      };
    }

    const labels: (number | undefined)[] = new Array(points.length);
    let clusterId = 0;

    for (let i = 0; i < points.length; i++) {
      // Skip if already processed
      if (labels[i] !== undefined) continue;

      const neighbors = this.regionQuery(points, i);

      if (neighbors.length < this.options.minPts) {
        // Mark as noise
        labels[i] = -1;
      } else {
        // Start a new cluster
        this.expandCluster(points, labels as number[], i, neighbors, clusterId);
        clusterId++;
      }
    }

    // Build result
    const assignments = new Map<string, number>();
    const clusterPoints: Map<number, DBSCANPoint[]> = new Map();
    const noisePoints: DBSCANPoint[] = [];

    for (let i = 0; i < points.length; i++) {
      const label = labels[i] ?? -1;
      assignments.set(points[i].id, label);

      if (label === -1) {
        noisePoints.push(points[i]);
      } else {
        if (!clusterPoints.has(label)) {
          clusterPoints.set(label, []);
        }
        clusterPoints.get(label)!.push(points[i]);
      }
    }

    // Build cluster objects
    const clusters: DBSCANCluster[] = [];
    for (const [cid, pts] of clusterPoints) {
      clusters.push({
        clusterId: cid,
        points: pts,
        centroid: this.calculateCentroid(pts),
      });
    }

    // Sort clusters by ID for consistent ordering
    clusters.sort((a, b) => a.clusterId - b.clusterId);

    return {
      clusters,
      noise: noisePoints,
      assignments,
    };
  }

  /**
   * Get statistics about the clustering
   */
  getStatistics(result: DBSCANResult): {
    numClusters: number;
    numNoise: number;
    avgClusterSize: number;
    maxClusterSize: number;
    minClusterSize: number;
  } {
    const sizes = result.clusters.map((c) => c.points.length);

    return {
      numClusters: result.clusters.length,
      numNoise: result.noise.length,
      avgClusterSize:
        sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0,
      maxClusterSize: sizes.length > 0 ? Math.max(...sizes) : 0,
      minClusterSize: sizes.length > 0 ? Math.min(...sizes) : 0,
    };
  }
}
