/**
 * Auto Graph Request DTO
 * Input parameters for generating a canvas from a topic or note
 */

export interface AutoGraphRequest {
  /** Topic string to search for related notes */
  topic?: string;
  /** Seed note ID to find similar notes */
  seedNoteId?: string;
  /** Maximum number of notes to include */
  maxNodes?: number;
  /** Minimum similarity threshold (0-1) */
  minSimilarity?: number;
  /** Whether to include cluster labels */
  includeClusterLabels?: boolean;
  /** Whether to show edges between similar notes */
  showEdges?: boolean;
  /** Edge similarity threshold (0-1) */
  edgeThreshold?: number;
  /** Output file path for the canvas */
  outputPath?: string;
}

export const DEFAULT_AUTO_GRAPH_REQUEST: Partial<AutoGraphRequest> = {
  maxNodes: 30,
  minSimilarity: 0.5,
  includeClusterLabels: true,
  showEdges: true,
  edgeThreshold: 0.7,
};
