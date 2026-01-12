/**
 * Canvas Control Modal
 * UI for configuring canvas generation options
 */

import { App, Modal, Setting, Notice } from 'obsidian';
import type { PluginSettings } from '../types.js';

export interface CanvasGenerationOptions {
  topic?: string;
  seedNotePath?: string;
  maxNodes: number;
  minSimilarity: number;
  includeClusterLabels: boolean;
  showEdges: boolean;
  outputFolder: string;
}

export class CanvasControlModal extends Modal {
  private options: CanvasGenerationOptions;
  private onSubmit: (options: CanvasGenerationOptions) => void;

  constructor(
    app: App,
    settings: PluginSettings,
    onSubmit: (options: CanvasGenerationOptions) => void,
    initialTopic?: string,
    seedNotePath?: string
  ) {
    super(app);
    this.onSubmit = onSubmit;

    // Initialize with default options from settings
    this.options = {
      topic: initialTopic || '',
      seedNotePath: seedNotePath,
      maxNodes: settings.canvas.maxNodes,
      minSimilarity: settings.canvas.edgeThreshold,
      includeClusterLabels: true,
      showEdges: true,
      outputFolder: settings.canvas.outputFolder || '',
    };
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('aca-modal');

    contentEl.createEl('h2', { text: 'Generate Knowledge Canvas' });

    // Topic or seed note
    if (this.options.seedNotePath) {
      contentEl.createEl('p', {
        text: `Creating canvas based on: ${this.options.seedNotePath}`,
        cls: 'aca-modal-seed-info',
      });
    } else {
      new Setting(contentEl)
        .setName('Topic')
        .setDesc('Enter a topic to explore. Related notes will be found automatically.')
        .addText((text) => {
          text
            .setPlaceholder('e.g., Systems Thinking')
            .setValue(this.options.topic || '')
            .onChange((value) => {
              this.options.topic = value;
            });
          text.inputEl.focus();
        });
    }

    // Max nodes
    new Setting(contentEl)
      .setName('Maximum notes')
      .setDesc('Number of related notes to include.')
      .addSlider((slider) => {
        slider
          .setLimits(5, 50, 5)
          .setValue(this.options.maxNodes)
          .setDynamicTooltip()
          .onChange((value) => {
            this.options.maxNodes = value;
          });
      });

    // Similarity threshold
    new Setting(contentEl)
      .setName('Similarity threshold')
      .setDesc('Minimum similarity for creating connections (0.5-1.0).')
      .addSlider((slider) => {
        slider
          .setLimits(0.5, 1.0, 0.05)
          .setValue(this.options.minSimilarity)
          .setDynamicTooltip()
          .onChange((value) => {
            this.options.minSimilarity = value;
          });
      });

    // Cluster labels toggle
    new Setting(contentEl)
      .setName('Generate cluster labels')
      .setDesc('Use AI to generate labels for note clusters.')
      .addToggle((toggle) => {
        toggle.setValue(this.options.includeClusterLabels).onChange((value) => {
          this.options.includeClusterLabels = value;
        });
      });

    // Show edges toggle
    new Setting(contentEl)
      .setName('Show connections')
      .setDesc('Draw lines between similar notes.')
      .addToggle((toggle) => {
        toggle.setValue(this.options.showEdges).onChange((value) => {
          this.options.showEdges = value;
        });
      });

    // Output folder
    new Setting(contentEl)
      .setName('Output folder')
      .setDesc('Where to save the generated canvas (leave empty for vault root).')
      .addText((text) => {
        text
          .setPlaceholder('e.g., Canvas')
          .setValue(this.options.outputFolder)
          .onChange((value) => {
            this.options.outputFolder = value;
          });
      });

    // Action buttons
    const buttonContainer = contentEl.createDiv({ cls: 'aca-modal-buttons' });

    const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelButton.addEventListener('click', () => this.close());

    const generateButton = buttonContainer.createEl('button', {
      text: 'Generate Canvas',
      cls: 'mod-cta',
    });
    generateButton.addEventListener('click', () => {
      if (!this.options.topic && !this.options.seedNotePath) {
        new Notice('Please enter a topic or select a seed note.');
        return;
      }
      this.onSubmit(this.options);
      this.close();
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
