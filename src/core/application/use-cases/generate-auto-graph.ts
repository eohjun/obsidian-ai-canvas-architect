/**
 * Generate Auto Graph Use Case
 * P0 (MVP): Generates a canvas from a topic or seed note
 *
 * Flow:
 * 1. Search related notes from seed topic/note (embedding similarity)
 * 2. Compute 2D coordinates with MDS
 * 3. Create FileNodes (notes → nodes)
 * 4. Cluster with DBSCAN → create GroupNodes
 * 5. Generate similarity-based edges
 * 6. Save canvas to file
 */

import type { AutoGraphRequest, AutoGraphResponse, AutoGraphStats } from '../dtos/index.js';
import { DEFAULT_AUTO_GRAPH_REQUEST } from '../dtos/index.js';
import type { ICanvasRepository } from '../../domain/interfaces/canvas-repository.interface.js';
import type { IEmbeddingProvider, NoteEmbedding } from '../../domain/interfaces/embedding-provider.interface.js';
import type { ILLMProvider } from '../../domain/interfaces/llm-provider.interface.js';
import { CanvasBuilderService } from '../services/canvas-builder.service.js';

export interface GenerateAutoGraphDependencies {
  canvasRepository: ICanvasRepository;
  embeddingProvider: IEmbeddingProvider;
  llmProvider?: ILLMProvider;
}

export class GenerateAutoGraphUseCase {
  private canvasBuilder: CanvasBuilderService;

  constructor(private deps: GenerateAutoGraphDependencies) {
    this.canvasBuilder = new CanvasBuilderService();
  }

  /**
   * Execute the use case
   */
  async execute(request: AutoGraphRequest): Promise<AutoGraphResponse> {
    const startTime = performance.now();

    // Merge with defaults
    const params = { ...DEFAULT_AUTO_GRAPH_REQUEST, ...request };

    try {
      // Validate request
      if (!params.topic && !params.seedNoteId) {
        return {
          success: false,
          error: 'Either topic or seedNoteId must be provided',
        };
      }

      // Check if embeddings are available
      const embeddingsAvailable = await this.deps.embeddingProvider.isAvailable();
      if (!embeddingsAvailable) {
        return {
          success: false,
          error: 'Vault Embeddings not available. Please install and configure the Vault Embeddings plugin.',
        };
      }

      // Step 1: Find related notes
      let notes: NoteEmbedding[];

      if (params.seedNoteId) {
        // Find similar notes to the seed note
        const similarNotes = await this.deps.embeddingProvider.findSimilar(
          params.seedNoteId,
          params.maxNodes,
          params.minSimilarity
        );

        // Get embeddings for the similar notes
        const noteIds = similarNotes.map((n) => n.noteId);

        // Also include the seed note itself
        const seedEmbedding = await this.deps.embeddingProvider.getEmbedding(params.seedNoteId);
        if (seedEmbedding) {
          noteIds.unshift(params.seedNoteId);
        }

        notes = await this.deps.embeddingProvider.getEmbeddings(noteIds);
      } else if (params.topic) {
        // For topic search, we need to get all embeddings and filter by topic relevance
        // This is a simplified approach - a more sophisticated implementation would use
        // topic embedding and similarity search
        const allNotes = await this.deps.embeddingProvider.getAllEmbeddings();

        // Filter notes by topic in title (simple heuristic)
        const topicLower = params.topic.toLowerCase();
        notes = allNotes
          .filter((note) => note.title.toLowerCase().includes(topicLower))
          .slice(0, params.maxNodes ?? 30);

        // If no direct matches, get all notes up to limit
        if (notes.length === 0) {
          notes = allNotes.slice(0, params.maxNodes ?? 30);
        }
      } else {
        notes = [];
      }

      if (notes.length === 0) {
        return {
          success: false,
          error: 'No notes found matching the criteria',
        };
      }

      // Step 2-5: Build canvas using CanvasBuilderService
      const graph = this.canvasBuilder.buildCanvas(notes, {
        includeClusterLabels: params.includeClusterLabels,
        showEdges: params.showEdges,
        edgeThreshold: params.edgeThreshold,
      });

      // Step 6: Generate cluster labels using LLM (if available and requested)
      if (params.includeClusterLabels && this.deps.llmProvider?.isConfigured()) {
        await this.labelClusters(graph, notes);
      }

      // Step 7: Determine output path
      const outputPath = params.outputPath ?? this.generateCanvasPath(params.topic ?? 'graph');

      // Step 8: Save canvas
      await this.deps.canvasRepository.save(outputPath, graph);

      // Calculate stats
      const endTime = performance.now();
      const stats: AutoGraphStats = {
        totalNotesFound: notes.length,
        notesIncluded: graph.getFileNodes().length,
        numClusters: graph.getGroupNodes().length,
        numEdges: graph.edgeCount,
        processingTimeMs: Math.round(endTime - startTime),
      };

      return {
        success: true,
        graph,
        canvasPath: outputPath,
        stats,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to generate canvas: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Label clusters using LLM
   */
  private async labelClusters(
    graph: ReturnType<CanvasBuilderService['buildCanvas']>,
    notes: NoteEmbedding[]
  ): Promise<void> {
    if (!this.deps.llmProvider) return;

    const groupNodes = graph.getGroupNodes();
    const fileNodes = graph.getFileNodes();

    // Map file paths to note titles
    const pathToTitle = new Map(notes.map((n) => [n.path, n.title]));

    for (const group of groupNodes) {
      // Find file nodes within this group
      const containedNodes = fileNodes.filter((file) => group.containsNode(file));
      const titles = containedNodes
        .map((node) => pathToTitle.get(node.filePath))
        .filter((t): t is string => t !== undefined);

      if (titles.length > 0) {
        const response = await this.deps.llmProvider.generateClusterLabel(titles);
        if (response.success && response.content) {
          group.label = response.content;
        }
      }
    }
  }

  /**
   * Generate a canvas file path from topic
   */
  private generateCanvasPath(topic: string): string {
    const safeTopic = topic
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

    const timestamp = new Date().toISOString().slice(0, 10);
    return `Canvas_${safeTopic}_${timestamp}.canvas`;
  }
}
