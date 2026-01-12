/**
 * Vault Embeddings Adapter
 * Reads embeddings from the Vault Embeddings plugin (09_Embedded folder)
 */

import { App, normalizePath } from 'obsidian';
import type {
  IEmbeddingProvider,
  NoteEmbedding,
  SimilarNote,
} from '../../domain/interfaces/embedding-provider.interface.js';

interface EmbeddingIndex {
  version: string;
  updated: string;
  notes: {
    [noteId: string]: {
      path: string;
      hash: string;
      updated: string;
    };
  };
}

interface EmbeddingFile {
  noteId: string;
  path: string;
  vector: number[];
  hash: string;
  updated: string;
}

export interface VaultEmbeddingsConfig {
  /** Path to embeddings folder (default: 09_Embedded) */
  embeddingsFolder: string;
  /** Similarity threshold for search (default: 0.5) */
  defaultSimilarityThreshold: number;
}

const DEFAULT_CONFIG: VaultEmbeddingsConfig = {
  embeddingsFolder: '09_Embedded',
  defaultSimilarityThreshold: 0.5,
};

/**
 * Generate a hash-based noteId from path
 * Must match Vault Embeddings plugin's algorithm
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function generateNoteId(path: string): string {
  const pathWithoutExt = path.replace(/\.md$/, '');
  return simpleHash(pathWithoutExt);
}

export class VaultEmbeddingsAdapter implements IEmbeddingProvider {
  private config: VaultEmbeddingsConfig;
  private indexCache: EmbeddingIndex | null = null;
  private embeddingsCache: Map<string, EmbeddingFile> = new Map();

  constructor(
    private app: App,
    config?: Partial<VaultEmbeddingsConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if embeddings are available
   */
  async isAvailable(): Promise<boolean> {
    const indexPath = normalizePath(`${this.config.embeddingsFolder}/index.json`);
    return await this.app.vault.adapter.exists(indexPath);
  }

  /**
   * Load the embeddings index
   */
  private async loadIndex(): Promise<EmbeddingIndex | null> {
    if (this.indexCache) {
      return this.indexCache;
    }

    try {
      const indexPath = normalizePath(`${this.config.embeddingsFolder}/index.json`);
      const content = await this.app.vault.adapter.read(indexPath);
      this.indexCache = JSON.parse(content);
      return this.indexCache;
    } catch {
      return null;
    }
  }

  /**
   * Load embedding file for a single note
   */
  private async loadEmbeddingFile(noteId: string): Promise<EmbeddingFile | null> {
    // Check cache first
    const cached = this.embeddingsCache.get(noteId);
    if (cached) {
      return cached;
    }

    try {
      const embeddingPath = normalizePath(
        `${this.config.embeddingsFolder}/embeddings/${noteId}.json`
      );
      const content = await this.app.vault.adapter.read(embeddingPath);
      const data: EmbeddingFile = JSON.parse(content);

      this.embeddingsCache.set(noteId, data);
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Get title from path (extract basename without extension)
   */
  private getTitleFromPath(path: string): string {
    const basename = path.split('/').pop() || path;
    return basename.replace(/\.md$/, '');
  }

  /**
   * Get embedding for a note by noteId
   */
  async getEmbedding(noteId: string): Promise<NoteEmbedding | null> {
    const embeddingFile = await this.loadEmbeddingFile(noteId);

    if (!embeddingFile) {
      return null;
    }

    return {
      noteId: embeddingFile.noteId,
      title: this.getTitleFromPath(embeddingFile.path),
      path: embeddingFile.path,
      vector: embeddingFile.vector,
    };
  }

  /**
   * Get embeddings for multiple notes by noteIds
   */
  async getEmbeddings(noteIds: string[]): Promise<NoteEmbedding[]> {
    const results: NoteEmbedding[] = [];

    for (const noteId of noteIds) {
      const embedding = await this.getEmbedding(noteId);
      if (embedding) {
        results.push(embedding);
      }
    }

    return results;
  }

  /**
   * Get all available embeddings
   */
  async getAllEmbeddings(): Promise<NoteEmbedding[]> {
    const index = await this.loadIndex();
    if (!index) {
      return [];
    }

    const results: NoteEmbedding[] = [];

    for (const [noteId, info] of Object.entries(index.notes)) {
      const embeddingFile = await this.loadEmbeddingFile(noteId);
      if (embeddingFile) {
        results.push({
          noteId,
          title: this.getTitleFromPath(info.path),
          path: info.path,
          vector: embeddingFile.vector,
        });
      }
    }

    return results;
  }

  /**
   * Find similar notes by noteId
   */
  async findSimilar(
    noteId: string,
    limit: number = 20,
    minSimilarity: number = this.config.defaultSimilarityThreshold
  ): Promise<SimilarNote[]> {
    const sourceEmbedding = await this.getEmbedding(noteId);
    if (!sourceEmbedding) {
      return [];
    }

    const results = await this.findSimilarByVector(
      sourceEmbedding.vector,
      limit + 1, // +1 to account for self
      minSimilarity
    );

    // Filter out the source note itself
    return results.filter((r) => r.noteId !== noteId).slice(0, limit);
  }

  /**
   * Find notes similar to a query vector
   */
  async findSimilarByVector(
    vector: number[],
    limit: number = 20,
    minSimilarity: number = this.config.defaultSimilarityThreshold
  ): Promise<SimilarNote[]> {
    const allEmbeddings = await this.getAllEmbeddings();
    const results: SimilarNote[] = [];

    for (const embedding of allEmbeddings) {
      const similarity = this.cosineSimilarity(vector, embedding.vector);

      if (similarity >= minSimilarity) {
        results.push({
          noteId: embedding.noteId,
          title: embedding.title,
          path: embedding.path,
          similarity,
        });
      }
    }

    // Sort by similarity (descending) and limit results
    return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
  }

  /**
   * Get embedding by file path (utility method)
   */
  async getEmbeddingByPath(path: string): Promise<NoteEmbedding | null> {
    const noteId = generateNoteId(path);
    return this.getEmbedding(noteId);
  }

  /**
   * Find notes similar to a topic (using average of related notes)
   */
  async searchByTopic(
    topic: string,
    options: {
      limit?: number;
      threshold?: number;
    } = {}
  ): Promise<SimilarNote[]> {
    const { limit = 20, threshold = this.config.defaultSimilarityThreshold } = options;
    const allEmbeddings = await this.getAllEmbeddings();

    // Filter by topic in path or title (case-insensitive)
    const normalizedTopic = topic.toLowerCase();
    const matchingEmbeddings = allEmbeddings.filter(
      (e) =>
        e.path.toLowerCase().includes(normalizedTopic) ||
        e.title.toLowerCase().includes(normalizedTopic)
    );

    if (matchingEmbeddings.length === 0) {
      // Return random sample if no direct matches
      return allEmbeddings.slice(0, limit).map((e) => ({
        noteId: e.noteId,
        title: e.title,
        path: e.path,
        similarity: 0.5, // Neutral similarity for non-matching
      }));
    }

    // If we have matches, use the average vector to find similar notes
    const avgVector = this.computeAverageVector(matchingEmbeddings.map((e) => e.vector));

    return this.findSimilarByVector(avgVector, limit, threshold);
  }

  /**
   * Compute average vector from multiple vectors
   */
  private computeAverageVector(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];

    const dimensions = vectors[0].length;
    const avg = new Array(dimensions).fill(0);

    for (const vec of vectors) {
      for (let i = 0; i < dimensions; i++) {
        avg[i] += vec[i];
      }
    }

    for (let i = 0; i < dimensions; i++) {
      avg[i] /= vectors.length;
    }

    return avg;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.indexCache = null;
    this.embeddingsCache.clear();
  }

  /**
   * Get statistics about available embeddings
   */
  async getStats(): Promise<{
    totalNotes: number;
    embeddingsFolder: string;
    indexUpdated: string | null;
  }> {
    const index = await this.loadIndex();

    return {
      totalNotes: index ? Object.keys(index.notes).length : 0,
      embeddingsFolder: this.config.embeddingsFolder,
      indexUpdated: index?.updated ?? null,
    };
  }
}
