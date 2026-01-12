/**
 * Gemini Provider
 * LLM provider implementation for Google Gemini API
 */

import { BaseProvider, type LLMConfig } from './base-provider.js';
import type { LLMResponse, LLMOptions, LLMMessage } from '../../domain/interfaces/llm-provider.interface.js';

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface GeminiConfig extends LLMConfig {
  model?: string;
}

const DEFAULT_MODEL = 'gemini-3-flash-preview';
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export class GeminiProvider extends BaseProvider {
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(config: GeminiConfig) {
    super(config);
    this.model = config.model || DEFAULT_MODEL;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  }

  /**
   * Generate text completion using Gemini API
   */
  async generate(
    prompt: string,
    systemPrompt?: string,
    options?: LLMOptions
  ): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Gemini API key not configured',
      };
    }

    try {
      const contents: GeminiContent[] = [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ];

      const body: Record<string, unknown> = {
        contents,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 1000,
        },
      };

      if (systemPrompt) {
        body.systemInstruction = { parts: [{ text: systemPrompt }] };
      }

      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        return {
          success: false,
          error: `Gemini API error: ${error.error?.message || response.statusText}`,
        };
      }

      const data: GeminiResponse = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        return {
          success: false,
          error: 'No response from Gemini',
        };
      }

      const text = data.candidates[0].content.parts[0]?.text;
      if (!text) {
        return {
          success: false,
          error: 'No text content in response',
        };
      }

      return {
        success: true,
        content: text,
        usage: data.usageMetadata
          ? {
              promptTokens: data.usageMetadata.promptTokenCount,
              completionTokens: data.usageMetadata.candidatesTokenCount,
              totalTokens: data.usageMetadata.totalTokenCount,
            }
          : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: `Gemini request failed: ${(error as Error).message}`,
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
        error: 'Gemini API key not configured',
      };
    }

    try {
      // Separate system message
      const systemMessage = messages.find((m) => m.role === 'system');
      const geminiContents: GeminiContent[] = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const body: Record<string, unknown> = {
        contents: geminiContents,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 1000,
        },
      };

      if (systemMessage) {
        body.systemInstruction = { parts: [{ text: systemMessage.content }] };
      }

      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        return {
          success: false,
          error: `Gemini API error: ${error.error?.message || response.statusText}`,
        };
      }

      const data: GeminiResponse = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        return {
          success: false,
          error: 'No response from Gemini',
        };
      }

      const text = data.candidates[0].content.parts[0]?.text;
      if (!text) {
        return {
          success: false,
          error: 'No text content in response',
        };
      }

      return {
        success: true,
        content: text,
        usage: data.usageMetadata
          ? {
              promptTokens: data.usageMetadata.promptTokenCount,
              completionTokens: data.usageMetadata.candidatesTokenCount,
              totalTokens: data.usageMetadata.totalTokenCount,
            }
          : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: `Gemini chat request failed: ${(error as Error).message}`,
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
      const response = await fetch(
        `${this.baseUrl}/models?key=${this.config.apiKey}`,
        { method: 'GET' }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get provider name
   */
  getName(): string {
    return 'Gemini';
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return ['gemini-3-pro-preview', 'gemini-3-flash-preview', 'gemini-2.0-flash'];
  }
}
