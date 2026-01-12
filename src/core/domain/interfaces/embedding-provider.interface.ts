/**
 * Embedding Provider Interface
 * Port for accessing note embeddings (Vault Embeddings integration)
 */

export interface NoteEmbedding {
  /** Note ID (hash-based from path) */
  noteId: string;
  /** Note title */
  title: string;
  /** File path relative to vault root */
  path: string;
  /** Embedding vector (typically 1536 dimensions for OpenAI) */
  vector: number[];
}

export interface SimilarNote {
  /** Note ID */
  noteId: string;
  /** Note title */
  title: string;
  /** File path */
  path: string;
  /** Similarity score (0-1, higher is more similar) */
  similarity: number;
}

export interface IEmbeddingProvider {
  /**
   * Check if embeddings are available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get embedding for a specific note
   * @param noteId Note ID (hash-based)
   */
  getEmbedding(noteId: string): Promise<NoteEmbedding | null>;

  /**
   * Get embeddings for multiple notes
   * @param noteIds Array of note IDs
   */
  getEmbeddings(noteIds: string[]): Promise<NoteEmbedding[]>;

  /**
   * Get all available note embeddings
   */
  getAllEmbeddings(): Promise<NoteEmbedding[]>;

  /**
   * Find similar notes by embedding similarity
   * @param noteId Note ID to find similar notes for
   * @param limit Maximum number of results
   * @param minSimilarity Minimum similarity threshold (0-1)
   */
  findSimilar(
    noteId: string,
    limit?: number,
    minSimilarity?: number
  ): Promise<SimilarNote[]>;

  /**
   * Find notes similar to a query vector
   * @param vector Query embedding vector
   * @param limit Maximum number of results
   * @param minSimilarity Minimum similarity threshold (0-1)
   */
  findSimilarByVector(
    vector: number[],
    limit?: number,
    minSimilarity?: number
  ): Promise<SimilarNote[]>;

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vectorA: number[], vectorB: number[]): number;
}
