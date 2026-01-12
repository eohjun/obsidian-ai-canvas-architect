/**
 * MDS (Multidimensional Scaling) Algorithm
 * Reduces high-dimensional embeddings to 2D coordinates for canvas layout
 *
 * Classical MDS implementation:
 * 1. Compute distance matrix from similarity matrix
 * 2. Apply double centering
 * 3. Extract top 2 eigenvectors via power iteration
 * 4. Scale to canvas dimensions
 */

import { Coordinate } from '../value-objects/coordinate.js';

export interface MDSInput {
  /** Array of embedding vectors */
  vectors: number[][];
  /** IDs corresponding to each vector */
  ids: string[];
}

export interface MDSOutput {
  /** 2D coordinates for each ID */
  coordinates: Map<string, Coordinate>;
}

export interface MDSOptions {
  /** Canvas width for scaling */
  canvasWidth?: number;
  /** Canvas height for scaling */
  canvasHeight?: number;
  /** Padding from canvas edges */
  padding?: number;
  /** Maximum iterations for power iteration */
  maxIterations?: number;
  /** Convergence tolerance */
  tolerance?: number;
}

const DEFAULT_OPTIONS: Required<MDSOptions> = {
  canvasWidth: 2000,
  canvasHeight: 1500,
  padding: 100,
  maxIterations: 100,
  tolerance: 1e-6,
};

/**
 * MDS Algorithm Service
 * Pure domain service - no external dependencies
 */
export class MDSAlgorithm {
  private options: Required<MDSOptions>;

  constructor(options?: MDSOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Compute cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
  }

  /**
   * Compute distance matrix from vectors
   * Uses D = 1 - cosine_similarity to convert similarity to distance
   */
  private computeDistanceMatrix(vectors: number[][]): number[][] {
    const n = vectors.length;
    const D: number[][] = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const similarity = this.cosineSimilarity(vectors[i], vectors[j]);
        // Convert similarity to distance
        const distance = Math.sqrt(2 * (1 - similarity));
        D[i][j] = distance;
        D[j][i] = distance;
      }
    }

    return D;
  }

  /**
   * Apply double centering to convert distance matrix to inner product matrix
   * B = -0.5 * J * D^2 * J where J = I - (1/n) * 1 * 1^T
   */
  private doubleCentering(D: number[][]): number[][] {
    const n = D.length;
    const B: number[][] = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0));

    // Compute D^2 (squared distances)
    const D2: number[][] = D.map((row) => row.map((d) => d * d));

    // Compute row means, column means, and grand mean
    const rowMeans: number[] = new Array(n).fill(0);
    const colMeans: number[] = new Array(n).fill(0);
    let grandMean = 0;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        rowMeans[i] += D2[i][j];
        colMeans[j] += D2[i][j];
        grandMean += D2[i][j];
      }
    }

    for (let i = 0; i < n; i++) {
      rowMeans[i] /= n;
      colMeans[i] /= n;
    }
    grandMean /= n * n;

    // Apply double centering formula
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        B[i][j] = -0.5 * (D2[i][j] - rowMeans[i] - colMeans[j] + grandMean);
      }
    }

    return B;
  }

  /**
   * Power iteration to find top eigenvector
   */
  private powerIteration(
    matrix: number[][],
    deflatedMatrix?: number[][]
  ): { eigenvalue: number; eigenvector: number[] } {
    const n = matrix.length;
    const M = deflatedMatrix ?? matrix;

    // Start with random vector
    let v = new Array(n).fill(0).map(() => Math.random() - 0.5);

    // Normalize
    let norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
    v = v.map((x) => x / norm);

    let eigenvalue = 0;

    for (let iter = 0; iter < this.options.maxIterations; iter++) {
      // Matrix-vector multiplication: Mv
      const Mv = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          Mv[i] += M[i][j] * v[j];
        }
      }

      // Compute new eigenvalue estimate
      const newEigenvalue = Mv.reduce((sum, x, i) => sum + x * v[i], 0);

      // Normalize new eigenvector
      norm = Math.sqrt(Mv.reduce((sum, x) => sum + x * x, 0));
      if (norm === 0) break;

      const newV = Mv.map((x) => x / norm);

      // Check convergence
      if (Math.abs(newEigenvalue - eigenvalue) < this.options.tolerance) {
        return { eigenvalue: newEigenvalue, eigenvector: newV };
      }

      eigenvalue = newEigenvalue;
      v = newV;
    }

    return { eigenvalue, eigenvector: v };
  }

  /**
   * Deflate matrix by removing contribution of found eigenvector
   */
  private deflateMatrix(
    matrix: number[][],
    eigenvalue: number,
    eigenvector: number[]
  ): number[][] {
    const n = matrix.length;
    const deflated: number[][] = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        deflated[i][j] =
          matrix[i][j] - eigenvalue * eigenvector[i] * eigenvector[j];
      }
    }

    return deflated;
  }

  /**
   * Extract top 2 eigenvectors for 2D coordinates
   */
  private extractCoordinates(B: number[][]): { x: number[]; y: number[] } {
    // Find first eigenvector
    const result1 = this.powerIteration(B);

    // Deflate matrix and find second eigenvector
    const deflated = this.deflateMatrix(B, result1.eigenvalue, result1.eigenvector);
    const result2 = this.powerIteration(B, deflated);

    // Scale eigenvectors by sqrt of eigenvalues
    const scale1 = Math.sqrt(Math.max(0, result1.eigenvalue));
    const scale2 = Math.sqrt(Math.max(0, result2.eigenvalue));

    const x = result1.eigenvector.map((v) => v * scale1);
    const y = result2.eigenvector.map((v) => v * scale2);

    return { x, y };
  }

  /**
   * Scale coordinates to fit canvas dimensions
   */
  private scaleToCanvas(x: number[], y: number[]): Coordinate[] {
    const { canvasWidth, canvasHeight, padding } = this.options;

    // Find bounds
    let minX = Math.min(...x);
    let maxX = Math.max(...x);
    let minY = Math.min(...y);
    let maxY = Math.max(...y);

    // Handle edge case of all same values
    if (maxX === minX) {
      minX -= 1;
      maxX += 1;
    }
    if (maxY === minY) {
      minY -= 1;
      maxY += 1;
    }

    // Scale to canvas dimensions with padding
    const effectiveWidth = canvasWidth - 2 * padding;
    const effectiveHeight = canvasHeight - 2 * padding;

    return x.map((xi, i) => {
      const scaledX = padding + ((xi - minX) / (maxX - minX)) * effectiveWidth;
      const scaledY = padding + ((y[i] - minY) / (maxY - minY)) * effectiveHeight;
      return new Coordinate(Math.round(scaledX), Math.round(scaledY));
    });
  }

  /**
   * Run MDS algorithm
   * @param input Input vectors with IDs
   * @returns Map of IDs to 2D coordinates
   */
  run(input: MDSInput): MDSOutput {
    const { vectors, ids } = input;

    if (vectors.length !== ids.length) {
      throw new Error('Number of vectors must match number of IDs');
    }

    if (vectors.length === 0) {
      return { coordinates: new Map() };
    }

    if (vectors.length === 1) {
      // Single point: place at center
      const centerX = this.options.canvasWidth / 2;
      const centerY = this.options.canvasHeight / 2;
      return {
        coordinates: new Map([[ids[0], new Coordinate(centerX, centerY)]]),
      };
    }

    // Step 1: Compute distance matrix
    const D = this.computeDistanceMatrix(vectors);

    // Step 2: Apply double centering
    const B = this.doubleCentering(D);

    // Step 3: Extract top 2 eigenvectors
    const { x, y } = this.extractCoordinates(B);

    // Step 4: Scale to canvas dimensions
    const scaledCoords = this.scaleToCanvas(x, y);

    // Build result map
    const coordinates = new Map<string, Coordinate>();
    ids.forEach((id, i) => {
      coordinates.set(id, scaledCoords[i]);
    });

    return { coordinates };
  }
}
