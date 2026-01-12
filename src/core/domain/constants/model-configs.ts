/**
 * Model Configurations
 * AI Provider and model settings (consistent with other PKM plugins)
 */

export type AIProviderType = 'claude' | 'openai' | 'gemini' | 'grok';

export interface AIProviderConfig {
  id: AIProviderType;
  name: string;
  displayName: string;
  endpoint: string;
  defaultModel: string;
  apiKeyPrefix?: string;
}

export interface ModelConfig {
  id: string;
  displayName: string;
  provider: AIProviderType;
  maxTokens: number;
  inputCostPer1M?: number;
  outputCostPer1M?: number;
}

export const AI_PROVIDERS: Record<AIProviderType, AIProviderConfig> = {
  claude: {
    id: 'claude',
    name: 'Claude',
    displayName: 'Anthropic Claude',
    endpoint: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-5-20250929',
    apiKeyPrefix: 'sk-ant-',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    displayName: 'OpenAI GPT',
    endpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    apiKeyPrefix: 'sk-',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    displayName: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash',
    apiKeyPrefix: 'AIza',
  },
  grok: {
    id: 'grok',
    name: 'Grok',
    displayName: 'xAI Grok',
    endpoint: 'https://api.x.ai/v1',
    defaultModel: 'grok-4-1-fast-non-reasoning',
  },
};

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // Claude models
  'claude-sonnet-4-5-20250929': {
    id: 'claude-sonnet-4-5-20250929',
    displayName: 'Claude Sonnet 4.5',
    provider: 'claude',
    maxTokens: 16384,
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
  },
  'claude-opus-4-5-20251101': {
    id: 'claude-opus-4-5-20251101',
    displayName: 'Claude Opus 4.5',
    provider: 'claude',
    maxTokens: 32768,
    inputCostPer1M: 15.0,
    outputCostPer1M: 75.0,
  },
  'claude-3-5-haiku-20241022': {
    id: 'claude-3-5-haiku-20241022',
    displayName: 'Claude 3.5 Haiku',
    provider: 'claude',
    maxTokens: 8192,
    inputCostPer1M: 0.8,
    outputCostPer1M: 4.0,
  },

  // OpenAI models
  'gpt-4o': {
    id: 'gpt-4o',
    displayName: 'GPT-4o',
    provider: 'openai',
    maxTokens: 16384,
    inputCostPer1M: 2.5,
    outputCostPer1M: 10.0,
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    provider: 'openai',
    maxTokens: 16384,
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.6,
  },

  // Gemini models
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    provider: 'gemini',
    maxTokens: 8192,
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.3,
  },
  'gemini-1.5-flash': {
    id: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash',
    provider: 'gemini',
    maxTokens: 8192,
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.3,
  },
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    provider: 'gemini',
    maxTokens: 8192,
    inputCostPer1M: 1.25,
    outputCostPer1M: 5.0,
  },

  // Grok models
  'grok-4-1-fast': {
    id: 'grok-4-1-fast',
    displayName: 'Grok 4.1 Fast',
    provider: 'grok',
    maxTokens: 16384,
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
  },
  'grok-4-1-fast-non-reasoning': {
    id: 'grok-4-1-fast-non-reasoning',
    displayName: 'Grok 4.1 Fast (Non-Reasoning)',
    provider: 'grok',
    maxTokens: 16384,
    inputCostPer1M: 0.6,
    outputCostPer1M: 4.0,
  },
};

export function getModelsByProvider(provider: AIProviderType): ModelConfig[] {
  return Object.values(MODEL_CONFIGS).filter((m) => m.provider === provider);
}

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return MODEL_CONFIGS[modelId];
}
