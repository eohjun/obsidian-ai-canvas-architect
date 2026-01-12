/**
 * AI Canvas Architect Settings Tab
 * All UI text is in English
 */

import { App, PluginSettingTab, Setting, normalizePath, Notice } from 'obsidian';
import type AICanvasArchitectPlugin from '../main.js';
import {
  type AIProviderType,
  AI_PROVIDERS,
  getModelsByProvider,
} from '../core/domain/constants/model-configs.js';

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

    const currentProvider = this.plugin.settings.ai.provider;
    const providerConfig = AI_PROVIDERS[currentProvider];

    // Provider selection
    new Setting(containerEl)
      .setName('Provider')
      .setDesc('Select the AI provider for generating cluster labels.')
      .addDropdown((dropdown) => {
        // Add all providers from AI_PROVIDERS
        Object.entries(AI_PROVIDERS).forEach(([id, config]) => {
          dropdown.addOption(id, config.displayName);
        });

        dropdown.setValue(currentProvider).onChange(async (value) => {
          const newProvider = value as AIProviderType;
          this.plugin.settings.ai.provider = newProvider;
          // Set default model for new provider
          this.plugin.settings.ai.model = AI_PROVIDERS[newProvider].defaultModel;
          await this.plugin.saveSettings();
          this.display(); // Refresh to show appropriate API key field
        });
      });

    // API Key with Test button
    const apiKeySetting = new Setting(containerEl)
      .setName(`${providerConfig.displayName} API Key`)
      .setDesc(`Enter your ${providerConfig.displayName} API key for AI features.`)
      .addText((text) => {
        text
          .setPlaceholder(providerConfig.apiKeyPrefix ? `${providerConfig.apiKeyPrefix}...` : 'Enter API key...')
          .setValue(this.plugin.settings.ai.apiKeys[currentProvider])
          .onChange(async (value) => {
            this.plugin.settings.ai.apiKeys[currentProvider] = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = 'password';
        text.inputEl.style.width = '250px';
      })
      .addButton((button) => {
        button.setButtonText('Test').onClick(async () => {
          const apiKey = this.plugin.settings.ai.apiKeys[currentProvider];
          if (!apiKey) {
            new Notice(`Please enter your ${providerConfig.displayName} API key first.`);
            return;
          }

          button.setDisabled(true);
          button.setButtonText('Testing...');

          try {
            const isValid = await this.plugin.testApiKey(currentProvider, apiKey);
            if (isValid) {
              new Notice(`✅ ${providerConfig.displayName} API key is valid!`);
            } else {
              new Notice(`❌ ${providerConfig.displayName} API key is invalid.`);
            }
          } catch (error) {
            new Notice(`❌ Failed to test API key: ${(error as Error).message}`);
          } finally {
            button.setDisabled(false);
            button.setButtonText('Test');
          }
        });
      });

    // Add "Get API Key" link
    const linkEl = apiKeySetting.descEl.createEl('a', {
      text: `Get ${providerConfig.name} API Key`,
      href: this.getApiKeyUrl(currentProvider),
    });
    linkEl.style.display = 'block';
    linkEl.style.marginTop = '4px';

    // Model selection (dynamic based on provider)
    const models = getModelsByProvider(currentProvider);
    const currentModel = this.plugin.settings.ai.model;

    new Setting(containerEl)
      .setName('Model')
      .setDesc('Select the AI model for generating labels.')
      .addDropdown((dropdown) => {
        models.forEach((model) => {
          dropdown.addOption(model.id, model.displayName);
        });

        // If current model not in list, add it
        if (!models.find((m) => m.id === currentModel)) {
          dropdown.addOption(currentModel, currentModel);
        }

        dropdown.setValue(currentModel).onChange(async (value) => {
          this.plugin.settings.ai.model = value;
          await this.plugin.saveSettings();
        });
      });
  }

  private getApiKeyUrl(provider: AIProviderType): string {
    const urls: Record<AIProviderType, string> = {
      claude: 'https://console.anthropic.com/settings/keys',
      openai: 'https://platform.openai.com/api-keys',
      gemini: 'https://aistudio.google.com/app/apikey',
      grok: 'https://console.x.ai/',
    };
    return urls[provider];
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
