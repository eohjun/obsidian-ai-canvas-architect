/**
 * Grok Provider — 공유 빌더/파서 사용
 *
 * 수정: fetch() → requestUrl(), 공유 빌더/파서 전환
 * 추가: Reasoning 모델 지원 (grok-4-1-fast)
 */

import { BaseProvider, type LLMConfig } from './base-provider.js';
import type { LLMResponse, LLMOptions, LLMMessage } from '../../domain/interfaces/llm-provider.interface.js';
import { buildGrokBody, parseGrokResponse } from 'obsidian-llm-shared';

const DEFAULT_MODEL = 'grok-4-1-fast-non-reasoning';
const DEFAULT_BASE_URL = 'https://api.x.ai/v1';

export class GrokProvider extends BaseProvider {
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(config: LLMConfig) {
    super(config);
    this.model = config.model || DEFAULT_MODEL;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  }

  async generate(prompt: string, systemPrompt?: string, options?: LLMOptions): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Grok API key not configured' };
    }

    try {
      const messages: LLMMessage[] = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });

      return await this.doRequest(messages, options);
    } catch (error) {
      return { success: false, error: `Grok request failed: ${(error as Error).message}` };
    }
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Grok API key not configured' };
    }

    try {
      return await this.doRequest(messages, options);
    } catch (error) {
      return { success: false, error: `Grok chat request failed: ${(error as Error).message}` };
    }
  }

  async validateApiKey(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const json = await this.makeRequest<{ data?: unknown[] }>({
        url: `${this.baseUrl}/models`,
        method: 'GET',
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
      });
      return Array.isArray(json.data);
    } catch {
      return false;
    }
  }

  getName(): string { return 'Grok'; }
  getAvailableModels(): string[] {
    return ['grok-4-1-fast', 'grok-4-1-fast-non-reasoning'];
  }

  private async doRequest(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const body = buildGrokBody(messages, this.model, {
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
    });

    const json = await this.makeRequest<Record<string, unknown>>({
      url: `${this.baseUrl}/chat/completions`,
      method: 'POST',
      headers: { Authorization: `Bearer ${this.config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = parseGrokResponse(json);
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
