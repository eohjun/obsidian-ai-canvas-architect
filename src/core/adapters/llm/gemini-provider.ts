/**
 * Gemini Provider — 공유 빌더/파서 사용
 *
 * 수정: fetch() → requestUrl(), 공유 빌더/파서 전환
 */

import { BaseProvider, type LLMConfig } from './base-provider.js';
import type { LLMResponse, LLMOptions, LLMMessage } from '../../domain/interfaces/llm-provider.interface.js';
import { buildGeminiBody, parseGeminiResponse, getGeminiGenerateUrl } from 'obsidian-llm-shared';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export class GeminiProvider extends BaseProvider {
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(config: LLMConfig) {
    super(config);
    this.model = config.model || DEFAULT_MODEL;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  }

  async generate(prompt: string, systemPrompt?: string, options?: LLMOptions): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Gemini API key not configured' };
    }

    try {
      const messages: LLMMessage[] = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });

      return await this.doRequest(messages, options);
    } catch (error) {
      return { success: false, error: `Gemini request failed: ${(error as Error).message}` };
    }
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Gemini API key not configured' };
    }

    try {
      return await this.doRequest(messages, options);
    } catch (error) {
      return { success: false, error: `Gemini chat request failed: ${(error as Error).message}` };
    }
  }

  async validateApiKey(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const json = await this.makeRequest<{ models?: unknown[] }>({
        url: `${this.baseUrl}/models?key=${this.config.apiKey}`,
        method: 'GET',
      });
      return Array.isArray(json.models);
    } catch {
      return false;
    }
  }

  getName(): string { return 'Gemini'; }
  getAvailableModels(): string[] {
    return ['gemini-3.1-pro-preview', 'gemini-2.5-flash', 'gemini-2.0-flash'];
  }

  private async doRequest(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const body = buildGeminiBody(messages, this.model, {
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
    });

    const url = getGeminiGenerateUrl(this.model, this.config.apiKey, this.baseUrl);

    const json = await this.makeRequest<Record<string, unknown>>({
      url,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = parseGeminiResponse(json);
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
