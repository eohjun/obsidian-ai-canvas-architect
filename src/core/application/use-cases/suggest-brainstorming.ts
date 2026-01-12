/**
 * Suggest Brainstorming Use Case
 * P2: Generates brainstorming question cards for empty canvas areas
 */

import type { ILLMProvider } from '../../domain/interfaces/llm-provider.interface.js';
import type { CanvasGraph } from '../../domain/entities/canvas-graph.js';
import { TextNode } from '../../domain/entities/canvas-node.js';
import { Coordinate } from '../../domain/value-objects/coordinate.js';
import { Dimension } from '../../domain/value-objects/dimension.js';
import { NodeColor } from '../../domain/value-objects/node-color.js';

export interface SuggestBrainstormingRequest {
  /** Canvas graph to add brainstorming cards to */
  graph: CanvasGraph;
  /** Topic or context for brainstorming questions */
  topic: string;
  /** Number of questions to generate */
  numQuestions?: number;
  /** Titles of existing notes for context */
  existingNoteTitles?: string[];
}

export interface SuggestBrainstormingResponse {
  success: boolean;
  /** Generated question cards */
  questionCards: TextNode[];
  error?: string;
}

export interface SuggestBrainstormingDependencies {
  llmProvider: ILLMProvider;
}

const DEFAULT_NUM_QUESTIONS = 5;
const QUESTION_CARD_WIDTH = 300;
const QUESTION_CARD_HEIGHT = 150;

export class SuggestBrainstormingUseCase {
  constructor(private deps: SuggestBrainstormingDependencies) {}

  /**
   * Execute the use case
   */
  async execute(request: SuggestBrainstormingRequest): Promise<SuggestBrainstormingResponse> {
    try {
      if (!this.deps.llmProvider.isConfigured()) {
        return {
          success: false,
          questionCards: [],
          error: 'LLM provider not configured. Please add an API key in settings.',
        };
      }

      const { graph, topic, numQuestions = DEFAULT_NUM_QUESTIONS, existingNoteTitles } = request;

      // Generate brainstorming questions using LLM
      const questions = await this.generateQuestions(topic, numQuestions, existingNoteTitles);

      if (questions.length === 0) {
        return {
          success: false,
          questionCards: [],
          error: 'Failed to generate brainstorming questions',
        };
      }

      // Find empty areas in the canvas to place question cards
      const positions = this.findEmptyPositions(graph, questions.length);

      // Create text nodes for each question
      const questionCards: TextNode[] = questions.map((question, index) => {
        const position = positions[index];
        const card = TextNode.create(
          `❓ ${question}`,
          position,
          new Dimension(QUESTION_CARD_WIDTH, QUESTION_CARD_HEIGHT),
          NodeColor.preset('5') // Cyan for questions
        );
        return card;
      });

      // Add question cards to the graph
      graph.addNodes(questionCards);

      return {
        success: true,
        questionCards,
      };
    } catch (error) {
      return {
        success: false,
        questionCards: [],
        error: `Failed to suggest brainstorming questions: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Generate brainstorming questions using LLM
   */
  private async generateQuestions(
    topic: string,
    numQuestions: number,
    existingNoteTitles?: string[]
  ): Promise<string[]> {
    const contextPart = existingNoteTitles?.length
      ? `\n\nExisting notes on this topic:\n${existingNoteTitles.slice(0, 10).map((t) => `- ${t}`).join('\n')}`
      : '';

    const prompt = `Generate ${numQuestions} thought-provoking brainstorming questions about "${topic}" that would help explore this topic more deeply. Each question should encourage critical thinking and lead to new insights.${contextPart}

Return only the questions, one per line, without numbering or bullet points.`;

    const systemPrompt = `You are a Socratic thinking assistant that helps generate insightful questions for knowledge exploration. Generate questions that:
1. Challenge assumptions
2. Explore connections to other domains
3. Investigate causes and effects
4. Consider different perspectives
5. Identify gaps in understanding`;

    const response = await this.deps.llmProvider.generate(prompt, systemPrompt, {
      temperature: 0.8,
      maxTokens: 500,
    });

    if (!response.success || !response.content) {
      return [];
    }

    // Parse questions from response
    const questions = response.content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.endsWith('?'));

    return questions.slice(0, numQuestions);
  }

  /**
   * Find empty positions in the canvas for placing new cards
   */
  private findEmptyPositions(graph: CanvasGraph, count: number): Coordinate[] {
    const bounds = graph.getBounds();
    const positions: Coordinate[] = [];

    if (!bounds) {
      // Empty canvas - place in a grid starting from origin
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        positions.push(
          new Coordinate(
            col * (QUESTION_CARD_WIDTH + 50),
            row * (QUESTION_CARD_HEIGHT + 50)
          )
        );
      }
      return positions;
    }

    // Place below the existing content
    const startY = bounds.max.y + 100;
    const startX = bounds.min.x;

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      positions.push(
        new Coordinate(
          startX + col * (QUESTION_CARD_WIDTH + 50),
          startY + row * (QUESTION_CARD_HEIGHT + 50)
        )
      );
    }

    return positions;
  }
}
