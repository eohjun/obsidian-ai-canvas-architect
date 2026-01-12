/**
 * AI Canvas Architect
 * Generate visual knowledge maps from your notes using AI-powered spatial reasoning
 */

import { Plugin, Notice, normalizePath } from 'obsidian';
import type { PluginSettings } from './types.js';
import { DEFAULT_SETTINGS } from './types.js';
import { AICanvasArchitectSettingTab } from './settings/index.js';
import {
  CanvasControlModal,
  ProgressModal,
  type CanvasGenerationOptions,
} from './views/index.js';

// Application Layer
import { CanvasBuilderService } from './core/application/services/canvas-builder.service.js';
import { LabelClustersUseCase } from './core/application/use-cases/label-clusters.js';

// Adapters
import { ObsidianCanvasRepository } from './core/adapters/obsidian/canvas-repository.js';
import { VaultEmbeddingsAdapter, generateNoteId } from './core/adapters/embedding/index.js';
import {
  OpenAIProvider,
  AnthropicProvider,
  GeminiProvider,
  GrokProvider,
} from './core/adapters/llm/index.js';
import type { BaseProvider } from './core/adapters/llm/base-provider.js';
import type { AIProviderType } from './core/domain/constants/model-configs.js';

export default class AICanvasArchitectPlugin extends Plugin {
  settings!: PluginSettings;
  private canvasRepository!: ObsidianCanvasRepository;
  private embeddingsAdapter!: VaultEmbeddingsAdapter;
  private llmProvider: BaseProvider | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Initialize adapters
    this.canvasRepository = new ObsidianCanvasRepository(this.app);
    this.embeddingsAdapter = new VaultEmbeddingsAdapter(this.app, {
      embeddingsFolder: this.settings.embeddings.folder,
    });

    // Initialize LLM provider
    this.initializeLLMProvider();

    // Register commands
    this.addCommand({
      id: 'generate-canvas-from-topic',
      name: 'Generate Canvas from Topic',
      callback: () => this.openCanvasModal(),
    });

    this.addCommand({
      id: 'generate-canvas-from-note',
      name: 'Generate Canvas from Current Note',
      checkCallback: (checking) => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && activeFile.extension === 'md') {
          if (!checking) {
            this.openCanvasModal(undefined, activeFile.path);
          }
          return true;
        }
        return false;
      },
    });

    // Register settings tab
    this.addSettingTab(new AICanvasArchitectSettingTab(this.app, this));

    // Ribbon icon
    this.addRibbonIcon('network', 'Generate Knowledge Canvas', () => {
      this.openCanvasModal();
    });
  }

  async onunload(): Promise<void> {
    // Cleanup if needed
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.initializeLLMProvider();

    // Update embeddings adapter with new folder
    this.embeddingsAdapter = new VaultEmbeddingsAdapter(this.app, {
      embeddingsFolder: this.settings.embeddings.folder,
    });
  }

  private initializeLLMProvider(): void {
    const { provider, apiKeys, model } = this.settings.ai;
    const apiKey = apiKeys[provider];

    if (!apiKey) {
      this.llmProvider = null;
      return;
    }

    switch (provider) {
      case 'openai':
        this.llmProvider = new OpenAIProvider({ apiKey, model });
        break;
      case 'claude':
        this.llmProvider = new AnthropicProvider({ apiKey, model });
        break;
      case 'gemini':
        this.llmProvider = new GeminiProvider({ apiKey, model });
        break;
      case 'grok':
        this.llmProvider = new GrokProvider({ apiKey, model });
        break;
      default:
        this.llmProvider = null;
    }
  }

  /**
   * Test API key validity for a specific provider
   */
  async testApiKey(provider: AIProviderType, apiKey: string): Promise<boolean> {
    let testProvider: BaseProvider;

    switch (provider) {
      case 'openai':
        testProvider = new OpenAIProvider({ apiKey });
        break;
      case 'claude':
        testProvider = new AnthropicProvider({ apiKey });
        break;
      case 'gemini':
        testProvider = new GeminiProvider({ apiKey });
        break;
      case 'grok':
        testProvider = new GrokProvider({ apiKey });
        break;
      default:
        return false;
    }

    return testProvider.validateApiKey();
  }

  private openCanvasModal(topic?: string, seedNotePath?: string): void {
    const modal = new CanvasControlModal(
      this.app,
      this.settings,
      (options) => this.generateCanvas(options),
      topic,
      seedNotePath
    );
    modal.open();
  }

  private async generateCanvas(options: CanvasGenerationOptions): Promise<void> {
    // Check embeddings availability
    const embeddingsAvailable = await this.embeddingsAdapter.isAvailable();
    if (!embeddingsAvailable) {
      new Notice('Vault Embeddings not found. Please install and configure the plugin.');
      return;
    }

    // Create progress modal
    const progressModal = new ProgressModal(this.app);
    progressModal.open();
    progressModal.initSteps([
      'Finding related notes',
      'Computing spatial layout',
      'Clustering notes',
      'Generating cluster labels',
      'Creating canvas file',
    ]);

    try {
      // Step 1: Find related notes
      progressModal.setCurrentStep(0);
      progressModal.setStatus('Searching for related notes...');

      let noteEmbeddings;

      if (options.seedNotePath) {
        // Use seed note to find similar notes
        const seedNoteId = generateNoteId(options.seedNotePath);
        const similarNotes = await this.embeddingsAdapter.findSimilar(
          seedNoteId,
          options.maxNodes,
          options.minSimilarity
        );

        // Get embeddings for similar notes
        const noteIds = similarNotes.map((n) => n.noteId);
        noteIds.unshift(seedNoteId); // Include seed note
        noteEmbeddings = await this.embeddingsAdapter.getEmbeddings(noteIds);
      } else if (options.topic) {
        // Use topic to find related notes
        const similarNotes = await this.embeddingsAdapter.searchByTopic(options.topic, {
          limit: options.maxNodes,
          threshold: options.minSimilarity,
        });

        const noteIds = similarNotes.map((n) => n.noteId);
        noteEmbeddings = await this.embeddingsAdapter.getEmbeddings(noteIds);
      }

      if (!noteEmbeddings || noteEmbeddings.length === 0) {
        progressModal.setError(0, 'No related notes found');
        return;
      }

      progressModal.updateStep(0, 'completed', `Found ${noteEmbeddings.length} notes`);

      // Step 2: Build canvas using CanvasBuilderService
      progressModal.setCurrentStep(1);
      progressModal.setStatus('Computing spatial layout...');

      const canvasBuilder = new CanvasBuilderService({
        nodeWidth: this.settings.canvas.nodeWidth,
        nodeHeight: this.settings.canvas.nodeHeight,
        clusterEps: this.settings.clustering.eps,
        clusterMinPts: this.settings.clustering.minPts,
        edgeThreshold: options.minSimilarity,
      });

      // Use embeddings directly (already have title)
      const builderNotes = noteEmbeddings;

      const graph = canvasBuilder.buildCanvas(builderNotes, {
        includeClusterLabels: options.includeClusterLabels,
        showEdges: options.showEdges,
        edgeThreshold: options.minSimilarity,
      });

      progressModal.updateStep(1, 'completed');

      // Step 3: Clustering
      progressModal.setCurrentStep(2);
      progressModal.setStatus('Clustering notes...');

      const groupNodes = graph.getGroupNodes();
      progressModal.updateStep(2, 'completed', `${groupNodes.length} clusters`);

      // Step 4: Generate cluster labels (if enabled and LLM configured)
      progressModal.setCurrentStep(3);

      if (options.includeClusterLabels && this.llmProvider && groupNodes.length > 0) {
        progressModal.setStatus('Generating cluster labels...');

        // Create path to title mapping
        const pathToTitle = new Map<string, string>();
        for (const note of noteEmbeddings) {
          pathToTitle.set(note.path, note.title);
        }

        const labelUseCase = new LabelClustersUseCase({
          llmProvider: this.llmProvider,
        });

        const labelResult = await labelUseCase.execute({
          graph,
          pathToTitle,
        });

        if (labelResult.success) {
          progressModal.updateStep(3, 'completed', `${labelResult.labelsGenerated} labels`);
        } else {
          progressModal.updateStep(3, 'completed', 'Skipped (no LLM)');
        }
      } else {
        progressModal.updateStep(3, 'completed', 'Skipped');
      }

      // Step 5: Save canvas
      progressModal.setCurrentStep(4);
      progressModal.setStatus('Creating canvas file...');

      const canvasName =
        options.topic || options.seedNotePath?.split('/').pop()?.replace('.md', '') || 'knowledge-map';
      const canvasPath = this.canvasRepository.generateCanvasPath(canvasName, options.outputFolder);

      // Ensure output folder exists (cross-platform safe)
      if (options.outputFolder) {
        const folderPath = normalizePath(options.outputFolder);
        const folderExists = await this.app.vault.adapter.exists(folderPath);
        if (!folderExists) {
          try {
            await this.app.vault.createFolder(folderPath);
          } catch (error) {
            // Handle "already exists" error from sync race conditions as success
            if (!(error instanceof Error && error.message.includes('already exists'))) {
              throw error;
            }
          }
        }
      }

      await this.canvasRepository.save(canvasPath, graph);
      progressModal.updateStep(4, 'completed');

      // Complete
      progressModal.complete('Canvas generated successfully!');

      // Open the canvas after a short delay
      setTimeout(async () => {
        progressModal.close();
        await this.canvasRepository.open(canvasPath);
        new Notice(`Canvas created: ${canvasPath}`);
      }, 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      new Notice(`Failed to generate canvas: ${message}`);
      progressModal.setError(0, message);
    }
  }
}
