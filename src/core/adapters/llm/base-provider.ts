/**
 * Base LLM Provider
 * Abstract base class for LLM providers
 */

import type {
  ILLMProvider,
  LLMResponse,
  LLMOptions,
  LLMMessage,
} from '../../domain/interfaces/llm-provider.interface.js';

export interface LLMConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  timeout?: number;
}

export abstract class BaseProvider implements ILLMProvider {
  protected config: LLMConfig;
  protected readonly defaultTimeout = 30000;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  /**
   * Check if provider is configured with API key
   */
  isConfigured(): boolean {
    return !!this.config.apiKey && this.config.apiKey.trim().length > 0;
  }

  /**
   * Generate text completion - implemented by subclasses
   */
  abstract generate(
    prompt: string,
    systemPrompt?: string,
    options?: LLMOptions
  ): Promise<LLMResponse>;

  /**
   * Chat with message history - implemented by subclasses
   */
  abstract chat(
    messages: LLMMessage[],
    options?: LLMOptions
  ): Promise<LLMResponse>;

  /**
   * Generate cluster label using a predefined prompt
   */
  async generateClusterLabel(
    noteTitles: string[],
    noteSummaries?: string[]
  ): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'LLM provider not configured',
      };
    }

    const context = noteSummaries
      ? noteTitles
          .map((title, i) => `- ${title}${noteSummaries[i] ? `: ${noteSummaries[i]}` : ''}`)
          .join('\n')
      : noteTitles.map((t) => `- ${t}`).join('\n');

    const prompt = `Generate a short, descriptive label (2-4 words) for a cluster of notes with these titles/summaries:

${context}

Requirements:
- The label should capture the common theme
- Keep it concise (2-4 words)
- Use title case
- Do not use punctuation

Return only the label, nothing else.`;

    const systemPrompt = `You are a knowledge organization assistant that creates concise, descriptive labels for groups of related notes.`;

    return this.generate(prompt, systemPrompt, {
      temperature: 0.3,
      maxTokens: 50,
    });
  }

  /**
   * Validate API key by making a test request
   */
  abstract validateApiKey(): Promise<boolean>;

  /**
   * Get the provider name
   */
  abstract getName(): string;

  /**
   * Get available models for this provider
   */
  abstract getAvailableModels(): string[];
}
