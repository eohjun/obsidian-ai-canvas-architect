/**
 * Label Clusters Use Case
 * P1: Generates labels for clusters in an existing canvas using LLM
 */

import type { ILLMProvider } from '../../domain/interfaces/llm-provider.interface.js';
import type { CanvasGraph } from '../../domain/entities/canvas-graph.js';

export interface LabelClustersRequest {
  /** Canvas graph to label */
  graph: CanvasGraph;
  /** Map from file path to note title */
  pathToTitle: Map<string, string>;
  /** Map from file path to note summary (optional) */
  pathToSummary?: Map<string, string>;
}

export interface LabelClustersResponse {
  success: boolean;
  /** Number of clusters labeled */
  labelsGenerated: number;
  error?: string;
}

export interface LabelClustersDependencies {
  llmProvider: ILLMProvider;
}

export class LabelClustersUseCase {
  constructor(private deps: LabelClustersDependencies) {}

  /**
   * Execute the use case
   */
  async execute(request: LabelClustersRequest): Promise<LabelClustersResponse> {
    try {
      if (!this.deps.llmProvider.isConfigured()) {
        return {
          success: false,
          labelsGenerated: 0,
          error: 'LLM provider not configured. Please add an API key in settings.',
        };
      }

      const { graph, pathToTitle, pathToSummary } = request;
      const groupNodes = graph.getGroupNodes();
      const fileNodes = graph.getFileNodes();

      if (groupNodes.length === 0) {
        return {
          success: true,
          labelsGenerated: 0,
        };
      }

      let labelsGenerated = 0;

      for (const group of groupNodes) {
        // Find file nodes within this group
        const containedNodes = fileNodes.filter((file) => group.containsNode(file));

        // Get titles for contained nodes
        const titles = containedNodes
          .map((node) => pathToTitle.get(node.filePath))
          .filter((t): t is string => t !== undefined);

        if (titles.length === 0) continue;

        // Get summaries if available
        const summaries = pathToSummary
          ? containedNodes
              .map((node) => pathToSummary.get(node.filePath))
              .filter((s): s is string => s !== undefined)
          : undefined;

        // Generate label using LLM
        const response = await this.deps.llmProvider.generateClusterLabel(titles, summaries);

        if (response.success && response.content) {
          group.label = response.content.trim();
          labelsGenerated++;
        }
      }

      return {
        success: true,
        labelsGenerated,
      };
    } catch (error) {
      return {
        success: false,
        labelsGenerated: 0,
        error: `Failed to label clusters: ${(error as Error).message}`,
      };
    }
  }
}
