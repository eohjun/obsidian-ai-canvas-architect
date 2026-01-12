/**
 * Anthropic Provider
 * LLM provider implementation for Anthropic Claude API
 */

import { BaseProvider, type LLMConfig } from './base-provider.js';
import type { LLMResponse, LLMOptions, LLMMessage } from '../../domain/interfaces/llm-provider.interface.js';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicConfig extends LLMConfig {
  model?: string;
}

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_BASE_URL = 'https://api.anthropic.com/v1';
const API_VERSION = '2023-06-01';

export class AnthropicProvider extends BaseProvider {
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(config: AnthropicConfig) {
    super(config);
    this.model = config.model || DEFAULT_MODEL;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  }

  /**
   * Generate text completion using Anthropic API
   */
  async generate(
    prompt: string,
    systemPrompt?: string,
    options?: LLMOptions
  ): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Anthropic API key not configured',
      };
    }

    try {
      const messages: AnthropicMessage[] = [
        {
          role: 'user',
          content: prompt,
        },
      ];

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': API_VERSION,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: options?.maxTokens ?? 1000,
          system: systemPrompt,
          messages,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        return {
          success: false,
          error: `Anthropic API error: ${error.error?.message || response.statusText}`,
        };
      }

      const data: AnthropicResponse = await response.json();

      if (!data.content || data.content.length === 0) {
        return {
          success: false,
          error: 'No response from Anthropic',
        };
      }

      const textContent = data.content.find((c) => c.type === 'text');
      if (!textContent) {
        return {
          success: false,
          error: 'No text content in response',
        };
      }

      return {
        success: true,
        content: textContent.text,
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Anthropic request failed: ${(error as Error).message}`,
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
        error: 'Anthropic API key not configured',
      };
    }

    try {
      // Separate system message from user/assistant messages
      const systemMessage = messages.find((m) => m.role === 'system');
      const anthropicMessages: AnthropicMessage[] = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': API_VERSION,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: options?.maxTokens ?? 1000,
          system: systemMessage?.content,
          messages: anthropicMessages,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        return {
          success: false,
          error: `Anthropic API error: ${error.error?.message || response.statusText}`,
        };
      }

      const data: AnthropicResponse = await response.json();

      if (!data.content || data.content.length === 0) {
        return {
          success: false,
          error: 'No response from Anthropic',
        };
      }

      const textContent = data.content.find((c) => c.type === 'text');
      if (!textContent) {
        return {
          success: false,
          error: 'No text content in response',
        };
      }

      return {
        success: true,
        content: textContent.text,
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Anthropic chat request failed: ${(error as Error).message}`,
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
      // Anthropic doesn't have a simple validation endpoint,
      // so we make a minimal request
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': API_VERSION,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
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
    return 'Anthropic';
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return [
      'claude-sonnet-4-20250514',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
    ];
  }
}
