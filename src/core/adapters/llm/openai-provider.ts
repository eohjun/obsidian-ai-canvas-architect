/**
 * OpenAI Provider — 공유 빌더/파서 사용
 *
 * 수정: fetch() → requestUrl(), 공유 빌더/파서 전환
 * 수정된 버그: temperature가 reasoning 모델에도 전송되던 문제 해결
 */

import { BaseProvider, type LLMConfig } from './base-provider.js';
import type { LLMResponse, LLMOptions, LLMMessage } from '../../domain/interfaces/llm-provider.interface.js';
import { buildOpenAIBody, parseOpenAIResponse } from 'obsidian-llm-shared';

const DEFAULT_MODEL = 'gpt-5.4-nano';
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

export class OpenAIProvider extends BaseProvider {
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(config: LLMConfig) {
    super(config);
    this.model = config.model || DEFAULT_MODEL;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  }

  async generate(prompt: string, systemPrompt?: string, options?: LLMOptions): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      return { success: false, error: 'OpenAI API key not configured' };
    }

    try {
      const messages: LLMMessage[] = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });

      return await this.doRequest(messages, options);
    } catch (error) {
      return { success: false, error: `OpenAI request failed: ${(error as Error).message}` };
    }
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      return { success: false, error: 'OpenAI API key not configured' };
    }

    try {
      return await this.doRequest(messages, options);
    } catch (error) {
      return { success: false, error: `OpenAI chat request failed: ${(error as Error).message}` };
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

  getName(): string { return 'OpenAI'; }
  getAvailableModels(): string[] { return ['gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano']; }

  private async doRequest(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const body = buildOpenAIBody(messages, this.model, {
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
    });

    const json = await this.makeRequest<Record<string, unknown>>({
      url: `${this.baseUrl}/chat/completions`,
      method: 'POST',
      headers: { Authorization: `Bearer ${this.config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = parseOpenAIResponse(json);
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
