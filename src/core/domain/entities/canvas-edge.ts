/**
 * Canvas Edge Entity
 * Represents a connection between two canvas nodes
 */

export type EdgeSide = 'top' | 'right' | 'bottom' | 'left';
export type EdgeEnd = 'none' | 'arrow';

let edgeIdCounter = 0;
export function generateEdgeId(): string {
  return `edge-${Date.now()}-${++edgeIdCounter}`;
}

export interface EdgeOptions {
  fromSide?: EdgeSide;
  toSide?: EdgeSide;
  fromEnd?: EdgeEnd;
  toEnd?: EdgeEnd;
  color?: string;
  label?: string;
}

export class CanvasEdge {
  constructor(
    public readonly id: string,
    public readonly fromNode: string,
    public readonly toNode: string,
    public readonly fromSide?: EdgeSide,
    public readonly toSide?: EdgeSide,
    public readonly fromEnd?: EdgeEnd,
    public readonly toEnd?: EdgeEnd,
    public readonly color?: string,
    public readonly label?: string
  ) {}

  /**
   * Create a new edge with default arrow
   */
  static create(
    fromNode: string,
    toNode: string,
    options?: EdgeOptions
  ): CanvasEdge {
    return new CanvasEdge(
      generateEdgeId(),
      fromNode,
      toNode,
      options?.fromSide,
      options?.toSide,
      options?.fromEnd,
      options?.toEnd ?? 'arrow',
      options?.color,
      options?.label
    );
  }

  /**
   * Create a bidirectional edge (arrows on both ends)
   */
  static createBidirectional(
    fromNode: string,
    toNode: string,
    options?: Omit<EdgeOptions, 'fromEnd' | 'toEnd'>
  ): CanvasEdge {
    return new CanvasEdge(
      generateEdgeId(),
      fromNode,
      toNode,
      options?.fromSide,
      options?.toSide,
      'arrow',
      'arrow',
      options?.color,
      options?.label
    );
  }

  /**
   * Create an unlabeled connection (no arrows)
   */
  static createConnection(
    fromNode: string,
    toNode: string,
    options?: Omit<EdgeOptions, 'fromEnd' | 'toEnd'>
  ): CanvasEdge {
    return new CanvasEdge(
      generateEdgeId(),
      fromNode,
      toNode,
      options?.fromSide,
      options?.toSide,
      'none',
      'none',
      options?.color,
      options?.label
    );
  }

  /**
   * Check if this edge connects the given nodes (in either direction)
   */
  connects(nodeA: string, nodeB: string): boolean {
    return (
      (this.fromNode === nodeA && this.toNode === nodeB) ||
      (this.fromNode === nodeB && this.toNode === nodeA)
    );
  }

  /**
   * Check if this edge involves a specific node
   */
  involves(nodeId: string): boolean {
    return this.fromNode === nodeId || this.toNode === nodeId;
  }

  /**
   * Get the other node in the edge
   */
  getOtherNode(nodeId: string): string | null {
    if (this.fromNode === nodeId) return this.toNode;
    if (this.toNode === nodeId) return this.fromNode;
    return null;
  }

  /**
   * Convert to Obsidian Canvas JSON format
   */
  toCanvasFormat(): object {
    const base: Record<string, unknown> = {
      id: this.id,
      fromNode: this.fromNode,
      toNode: this.toNode,
    };

    if (this.fromSide) base.fromSide = this.fromSide;
    if (this.toSide) base.toSide = this.toSide;
    if (this.fromEnd) base.fromEnd = this.fromEnd;
    if (this.toEnd) base.toEnd = this.toEnd;
    if (this.color) base.color = this.color;
    if (this.label) base.label = this.label;

    return base;
  }
}
