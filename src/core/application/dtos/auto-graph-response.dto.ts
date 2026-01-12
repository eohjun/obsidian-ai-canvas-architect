/**
 * Auto Graph Response DTO
 * Result of canvas generation
 */

import type { CanvasGraph } from '../../domain/entities/canvas-graph.js';

export interface AutoGraphResponse {
  /** Whether the operation was successful */
  success: boolean;
  /** Generated canvas graph (if successful) */
  graph?: CanvasGraph;
  /** Path where canvas was saved */
  canvasPath?: string;
  /** Error message (if failed) */
  error?: string;
  /** Statistics about the generated canvas */
  stats?: AutoGraphStats;
}

export interface AutoGraphStats {
  /** Total number of notes found */
  totalNotesFound: number;
  /** Number of notes included in canvas */
  notesIncluded: number;
  /** Number of clusters formed */
  numClusters: number;
  /** Number of edges created */
  numEdges: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}
