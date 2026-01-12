/**
 * OpenAI Provider
 * LLM provider implementation for OpenAI API
 */

import { BaseProvider, type LLMConfig } from './base-provider.js';
import type { LLMResponse, LLMOptions, LLMMessage } from '../../domain/interfaces/llm-provider.interface.js';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIConfig extends LLMConfig {
  model?: string;
}

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

export class OpenAIProvider extends BaseProvider {
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(config: OpenAIConfig) {
    super(config);
    this.model = config.model || DEFAULT_MODEL;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  }

  /**
   * Generate text completion using OpenAI API
   */
  async generate(
    prompt: string,
    systemPrompt?: string,
    options?: LLMOptions
  ): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'OpenAI API key not configured',
      };
    }

    try {
      const messages: OpenAIMessage[] = [];

      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt,
        });
      }

      messages.push({
        role: 'user',
        content: prompt,
      });

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        return {
          success: false,
          error: `OpenAI API error: ${error.error?.message || response.statusText}`,
        };
      }

      const data: OpenAIResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        return {
          success: false,
          error: 'No response from OpenAI',
        };
      }

      return {
        success: true,
        content: data.choices[0].message.content,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `OpenAI request failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Chat with message history
   */
  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'OpenAI API key not configured',
      };
    }

    try {
      const openAIMessages: OpenAIMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: openAIMessages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        return {
          success: false,
          error: `OpenAI API error: ${error.error?.message || response.statusText}`,
        };
      }

      const data: OpenAIResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        return {
          success: false,
          error: 'No response from OpenAI',
        };
      }

      return {
        success: true,
        content: data.choices[0].message.content,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `OpenAI chat request failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get provider name
   */
  getName(): string {
    return 'OpenAI';
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
  }
}
