/**
 * AI Canvas Architect - Type Definitions
 */

import type { AIProviderType } from './core/domain/constants/model-configs.js';
import { AI_PROVIDERS } from './core/domain/constants/model-configs.js';

export interface PluginSettings {
  ai: {
    provider: AIProviderType;
    apiKeys: Record<AIProviderType, string>;
    model: string;
  };
  canvas: {
    maxNodes: number;
    edgeThreshold: number;
    nodeWidth: number;
    nodeHeight: number;
  };
  clustering: {
    eps: number; // neighborhood radius in pixels
    minPts: number; // minimum points to form cluster
  };
  embeddings: {
    folder: string; // Vault Embeddings folder path
  };
}

export const DEFAULT_SETTINGS: PluginSettings = {
  ai: {
    provider: 'openai',
    apiKeys: {
      claude: '',
      openai: '',
      gemini: '',
      grok: '',
    },
    model: AI_PROVIDERS.openai.defaultModel,
  },
  canvas: {
    maxNodes: 50,
    edgeThreshold: 0.7,
    nodeWidth: 250,
    nodeHeight: 150,
  },
  clustering: {
    eps: 200,
    minPts: 2,
  },
  embeddings: {
    folder: '09_Embedded',
  },
};

/**
 * Canvas JSON Format Types (Obsidian Canvas)
 */
export type CanvasNodeType = 'file' | 'text' | 'group' | 'link';

export interface CanvasFileNode {
  id: string;
  type: 'file';
  x: number;
  y: number;
  width: number;
  height: number;
  file: string;
  color?: string;
}

export interface CanvasTextNode {
  id: string;
  type: 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color?: string;
}

export interface CanvasGroupNode {
  id: string;
  type: 'group';
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  color?: string;
}

export interface CanvasLinkNode {
  id: string;
  type: 'link';
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
}

export type CanvasNode = CanvasFileNode | CanvasTextNode | CanvasGroupNode | CanvasLinkNode;

export interface CanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide?: 'top' | 'right' | 'bottom' | 'left';
  toSide?: 'top' | 'right' | 'bottom' | 'left';
  fromEnd?: 'none' | 'arrow';
  toEnd?: 'none' | 'arrow';
  color?: string;
  label?: string;
}

export interface CanvasData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}
