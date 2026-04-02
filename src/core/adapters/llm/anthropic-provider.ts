/**
 * Anthropic Provider — 공유 빌더/파서 사용
 *
 * 수정: fetch() → requestUrl(), 공유 빌더/파서 전환
 * 추가: Extended thinking 지원 (Opus 4.6, Sonnet 4.6)
 */

import { BaseProvider, type LLMConfig } from './base-provider.js';
import type { LLMResponse, LLMOptions, LLMMessage } from '../../domain/interfaces/llm-provider.interface.js';
import { buildAnthropicBody, parseAnthropicResponse } from 'obsidian-llm-shared';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_BASE_URL = 'https://api.anthropic.com/v1';

export class AnthropicProvider extends BaseProvider {
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(config: LLMConfig) {
    super(config);
    this.model = config.model || DEFAULT_MODEL;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  }

  async generate(prompt: string, systemPrompt?: string, options?: LLMOptions): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Anthropic API key not configured' };
    }

    try {
      const messages: LLMMessage[] = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });

      return await this.doRequest(messages, options);
    } catch (error) {
      return { success: false, error: `Anthropic request failed: ${(error as Error).message}` };
    }
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Anthropic API key not configured' };
    }

    try {
      return await this.doRequest(messages, options);
    } catch (error) {
      return { success: false, error: `Anthropic chat request failed: ${(error as Error).message}` };
    }
  }

  async validateApiKey(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const body = buildAnthropicBody(
        [{ role: 'user', content: 'Hello' }],
        this.model,
        { maxTokens: 4096 }
      );
      const json = await this.makeRequest<Record<string, unknown>>({
        url: `${this.baseUrl}/messages`,
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      return parseAnthropicResponse(json).success;
    } catch {
      return false;
    }
  }

  getName(): string { return 'Anthropic'; }
  getAvailableModels(): string[] {
    return ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'];
  }

  private async doRequest(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const body = buildAnthropicBody(messages, this.model, {
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
    });

    const json = await this.makeRequest<Record<string, unknown>>({
      url: `${this.baseUrl}/messages`,
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = parseAnthropicResponse(json);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      content: result.text,
      usage: {
        promptTokens: result.usage.inputTokens,
        completionTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
      },
    };
  }
}
