/**
 * OpenAI Provider
 * LLM provider implementation for OpenAI API
 *
 * IMPORTANT: Reasoning models (gpt-5.x, o1, o3) require special handling:
 * - Use max_completion_tokens instead of max_tokens
 * - Do NOT send temperature parameter
 * - Require higher token budget (4096+ minimum)
 */

import { BaseProvider, type LLMConfig } from './base-provider.js';
import type { LLMResponse, LLMOptions, LLMMessage } from '../../domain/interfaces/llm-provider.interface.js';
import { isReasoningModel } from '../../domain/constants/model-configs.js';

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
   * Build request body with proper handling for reasoning vs standard models
   */
  private buildRequestBody(
    messages: OpenAIMessage[],
    options?: LLMOptions
  ): Record<string, unknown> {
    const isReasoning = isReasoningModel(this.model);
    const maxTokens = options?.maxTokens ?? (isReasoning ? 4096 : 1000);

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
    };

    // Reasoning models: use max_completion_tokens, NO temperature
    // Standard models: use max_tokens, temperature OK
    if (isReasoning) {
      body.max_completion_tokens = maxTokens;
      // Do NOT set temperature for reasoning models - it causes 400 errors
    } else {
      body.max_tokens = maxTokens;
      body.temperature = options?.temperature ?? 0.7;
    }

    return body;
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

      const requestBody = this.buildRequestBody(messages, options);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
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

      // Check for empty response (reasoning model token budget exhausted)
      const content = data.choices[0].message.content;
      if (!content && data.choices[0].finish_reason === 'length') {
        return {
          success: false,
          error: 'Response truncated - reasoning model may need higher token budget',
        };
      }

      return {
        success: true,
        content: content || '',
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

      const requestBody = this.buildRequestBody(openAIMessages, options);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
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

      const content = data.choices[0].message.content;
      if (!content && data.choices[0].finish_reason === 'length') {
        return {
          success: false,
          error: 'Response truncated - reasoning model may need higher token budget',
        };
      }

      return {
        success: true,
        content: content || '',
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
      // Use a minimal request to validate - handle reasoning models properly
      const isReasoning = isReasoningModel(this.model);

      const body: Record<string, unknown> = {
        model: this.model,
        messages: [{ role: 'user', content: 'Hello' }],
      };

      if (isReasoning) {
        body.max_completion_tokens = 10;
      } else {
        body.max_tokens = 10;
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
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
    return ['gpt-5.2', 'o3-mini', 'gpt-4o', 'gpt-4o-mini'];
  }
}
