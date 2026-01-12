/**
 * AI Canvas Architect Settings Tab
 * All UI text is in English
 */

import { App, PluginSettingTab, Setting, normalizePath } from 'obsidian';
import type AICanvasArchitectPlugin from '../main.js';
import type { AIProvider } from '../types.js';

export class AICanvasArchitectSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private plugin: AICanvasArchitectPlugin
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h1', { text: 'AI Canvas Architect' });
    containerEl.createEl('p', {
      text: 'Generate visual knowledge maps from your notes using AI-powered spatial reasoning.',
      cls: 'setting-item-description',
    });

    // AI Provider Settings
    this.renderAISettings(containerEl);

    // Canvas Settings
    this.renderCanvasSettings(containerEl);

    // Clustering Settings
    this.renderClusteringSettings(containerEl);

    // Embeddings Settings
    this.renderEmbeddingsSettings(containerEl);
  }

  private renderAISettings(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'AI Provider' });

    // Provider selection
    new Setting(containerEl)
      .setName('Provider')
      .setDesc('Select the AI provider for generating cluster labels.')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('openai', 'OpenAI')
          .addOption('anthropic', 'Anthropic (Claude)')
          .setValue(this.plugin.settings.ai.provider)
          .onChange(async (value) => {
            this.plugin.settings.ai.provider = value as AIProvider;
            await this.plugin.saveSettings();
            this.display(); // Refresh to show appropriate API key field
          });
      });

    // API Key (show based on selected provider)
    const provider = this.plugin.settings.ai.provider;
    const providerName = provider === 'openai' ? 'OpenAI' : 'Anthropic';

    new Setting(containerEl)
      .setName(`${providerName} API Key`)
      .setDesc(`Enter your ${providerName} API key for AI features.`)
      .addText((text) => {
        text
          .setPlaceholder('sk-...')
          .setValue(this.plugin.settings.ai.apiKeys[provider])
          .onChange(async (value) => {
            this.plugin.settings.ai.apiKeys[provider] = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = 'password';
      });

    // Model selection
    const models =
      provider === 'openai'
        ? ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
        : ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'];

    new Setting(containerEl)
      .setName('Model')
      .setDesc('Select the AI model for generating labels.')
      .addDropdown((dropdown) => {
        models.forEach((model) => dropdown.addOption(model, model));
        dropdown.setValue(this.plugin.settings.ai.model).onChange(async (value) => {
          this.plugin.settings.ai.model = value;
          await this.plugin.saveSettings();
        });
      });
  }

  private renderCanvasSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'Canvas' });

    new Setting(containerEl)
      .setName('Maximum nodes')
      .setDesc('Maximum number of notes to include in generated canvas (10-100).')
      .addSlider((slider) => {
        slider
          .setLimits(10, 100, 5)
          .setValue(this.plugin.settings.canvas.maxNodes)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.canvas.maxNodes = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Edge threshold')
      .setDesc('Minimum similarity (0.5-1.0) to create connections between notes.')
      .addSlider((slider) => {
        slider
          .setLimits(0.5, 1.0, 0.05)
          .setValue(this.plugin.settings.canvas.edgeThreshold)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.canvas.edgeThreshold = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Node width')
      .setDesc('Width of note cards in pixels.')
      .addText((text) => {
        text
          .setValue(String(this.plugin.settings.canvas.nodeWidth))
          .onChange(async (value) => {
            const num = parseInt(value);
            if (!isNaN(num) && num > 50 && num < 1000) {
              this.plugin.settings.canvas.nodeWidth = num;
              await this.plugin.saveSettings();
            }
          });
      });

    new Setting(containerEl)
      .setName('Node height')
      .setDesc('Height of note cards in pixels.')
      .addText((text) => {
        text
          .setValue(String(this.plugin.settings.canvas.nodeHeight))
          .onChange(async (value) => {
            const num = parseInt(value);
            if (!isNaN(num) && num > 50 && num < 1000) {
              this.plugin.settings.canvas.nodeHeight = num;
              await this.plugin.saveSettings();
            }
          });
      });
  }

  private renderClusteringSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'Clustering' });

    new Setting(containerEl)
      .setName('Cluster radius (eps)')
      .setDesc('Maximum distance (pixels) between notes to be considered neighbors.')
      .addSlider((slider) => {
        slider
          .setLimits(100, 500, 25)
          .setValue(this.plugin.settings.clustering.eps)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.clustering.eps = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Minimum cluster size')
      .setDesc('Minimum number of notes to form a cluster group.')
      .addSlider((slider) => {
        slider
          .setLimits(2, 10, 1)
          .setValue(this.plugin.settings.clustering.minPts)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.clustering.minPts = value;
            await this.plugin.saveSettings();
          });
      });
  }

  private renderEmbeddingsSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'Embeddings' });

    new Setting(containerEl)
      .setName('Embeddings folder')
      .setDesc('Path to the Vault Embeddings plugin folder.')
      .addText((text) => {
        text
          .setPlaceholder('09_Embedded')
          .setValue(this.plugin.settings.embeddings.folder)
          .onChange(async (value) => {
            this.plugin.settings.embeddings.folder = value;
            await this.plugin.saveSettings();
          });
      });

    // Status indicator
    const statusEl = containerEl.createDiv({ cls: 'aca-embeddings-status' });
    this.checkEmbeddingsStatus(statusEl);
  }

  private async checkEmbeddingsStatus(statusEl: HTMLElement): Promise<void> {
    const folder = this.plugin.settings.embeddings.folder;
    const indexPath = normalizePath(`${folder}/index.json`);
    const exists = await this.app.vault.adapter.exists(indexPath);

    if (exists) {
      try {
        const content = await this.app.vault.adapter.read(indexPath);
        const index = JSON.parse(content);
        const noteCount = Object.keys(index.notes || {}).length;
        statusEl.createEl('div', {
          text: `✓ Connected: ${noteCount} note embeddings available`,
          cls: 'aca-status-success',
        });
      } catch {
        statusEl.createEl('div', {
          text: '⚠ Error reading embeddings index',
          cls: 'aca-status-warning',
        });
      }
    } else {
      statusEl.createEl('div', {
        text: '✗ Vault Embeddings not found. Please install and configure the plugin.',
        cls: 'aca-status-error',
      });
    }
  }
}
