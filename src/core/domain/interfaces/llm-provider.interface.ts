/**
 * LLM Provider Interface
 * Port for AI text generation (cluster labeling, etc.)
 */

export interface LLMResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface ILLMProvider {
  /**
   * Check if the provider is configured and ready
   */
  isConfigured(): boolean;

  /**
   * Generate text from a simple prompt
   * @param prompt User prompt
   * @param systemPrompt Optional system prompt
   * @param options Generation options
   */
  generate(
    prompt: string,
    systemPrompt?: string,
    options?: LLMOptions
  ): Promise<LLMResponse>;

  /**
   * Generate text from a message history
   * @param messages Message history
   * @param options Generation options
   */
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;

  /**
   * Generate a cluster label from note titles/content
   * @param noteTitles Array of note titles in the cluster
   * @param noteSummaries Optional array of note summaries
   */
  generateClusterLabel(
    noteTitles: string[],
    noteSummaries?: string[]
  ): Promise<LLMResponse>;
}
