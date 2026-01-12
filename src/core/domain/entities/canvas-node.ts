/**
 * Canvas Node Entities
 * Domain entities representing different types of canvas nodes
 */

import { Coordinate } from '../value-objects/coordinate.js';
import { Dimension } from '../value-objects/dimension.js';
import { NodeColor } from '../value-objects/node-color.js';

/**
 * Unique identifier generator for nodes
 */
let nodeIdCounter = 0;
export function generateNodeId(prefix: string = 'node'): string {
  return `${prefix}-${Date.now()}-${++nodeIdCounter}`;
}

/**
 * Base interface for all canvas nodes
 */
export interface ICanvasNode {
  readonly id: string;
  readonly type: 'file' | 'text' | 'group' | 'link';
  position: Coordinate;
  dimension: Dimension;
  color?: NodeColor;
  toCanvasFormat(): object;
}

/**
 * Abstract base class for canvas nodes
 */
export abstract class CanvasNode implements ICanvasNode {
  abstract readonly type: 'file' | 'text' | 'group' | 'link';

  constructor(
    public readonly id: string,
    public position: Coordinate,
    public dimension: Dimension,
    public color?: NodeColor
  ) {}

  /**
   * Get the center coordinate of the node
   */
  get center(): Coordinate {
    return new Coordinate(
      this.position.x + this.dimension.width / 2,
      this.position.y + this.dimension.height / 2
    );
  }

  /**
   * Get bounding box corners
   */
  get bounds(): { topLeft: Coordinate; bottomRight: Coordinate } {
    return {
      topLeft: this.position,
      bottomRight: new Coordinate(
        this.position.x + this.dimension.width,
        this.position.y + this.dimension.height
      ),
    };
  }

  /**
   * Check if this node contains a point
   */
  containsPoint(point: Coordinate): boolean {
    const { topLeft, bottomRight } = this.bounds;
    return (
      point.x >= topLeft.x &&
      point.x <= bottomRight.x &&
      point.y >= topLeft.y &&
      point.y <= bottomRight.y
    );
  }

  /**
   * Check if this node overlaps with another
   */
  overlaps(other: CanvasNode): boolean {
    const a = this.bounds;
    const b = other.bounds;
    return !(
      a.bottomRight.x < b.topLeft.x ||
      b.bottomRight.x < a.topLeft.x ||
      a.bottomRight.y < b.topLeft.y ||
      b.bottomRight.y < a.topLeft.y
    );
  }

  /**
   * Calculate distance to another node (center to center)
   */
  distanceTo(other: CanvasNode): number {
    return this.center.distanceTo(other.center);
  }

  /**
   * Move node to new position
   */
  moveTo(position: Coordinate): void {
    this.position = position;
  }

  /**
   * Move node by offset
   */
  moveBy(dx: number, dy: number): void {
    this.position = this.position.offset(dx, dy);
  }

  /**
   * Convert to Obsidian Canvas JSON format
   */
  abstract toCanvasFormat(): object;
}

/**
 * File Node - represents a note file on the canvas
 */
export class FileNode extends CanvasNode {
  readonly type = 'file' as const;

  constructor(
    id: string,
    position: Coordinate,
    dimension: Dimension,
    public readonly filePath: string,
    color?: NodeColor
  ) {
    super(id, position, dimension, color);
  }

  static create(
    filePath: string,
    position: Coordinate,
    dimension?: Dimension,
    color?: NodeColor
  ): FileNode {
    return new FileNode(
      generateNodeId('file'),
      position,
      dimension ?? Dimension.defaultNode(),
      filePath,
      color
    );
  }

  toCanvasFormat(): object {
    const base: Record<string, unknown> = {
      id: this.id,
      type: this.type,
      x: this.position.x,
      y: this.position.y,
      width: this.dimension.width,
      height: this.dimension.height,
      file: this.filePath,
    };
    if (this.color) {
      base.color = this.color.toString();
    }
    return base;
  }
}

/**
 * Text Node - represents a text card on the canvas
 */
export class TextNode extends CanvasNode {
  readonly type = 'text' as const;

  constructor(
    id: string,
    position: Coordinate,
    dimension: Dimension,
    public text: string,
    color?: NodeColor
  ) {
    super(id, position, dimension, color);
  }

  static create(
    text: string,
    position: Coordinate,
    dimension?: Dimension,
    color?: NodeColor
  ): TextNode {
    return new TextNode(
      generateNodeId('text'),
      position,
      dimension ?? Dimension.defaultNode(),
      text,
      color
    );
  }

  toCanvasFormat(): object {
    const base: Record<string, unknown> = {
      id: this.id,
      type: this.type,
      x: this.position.x,
      y: this.position.y,
      width: this.dimension.width,
      height: this.dimension.height,
      text: this.text,
    };
    if (this.color) {
      base.color = this.color.toString();
    }
    return base;
  }
}

/**
 * Group Node - represents a group container on the canvas
 */
export class GroupNode extends CanvasNode {
  readonly type = 'group' as const;

  constructor(
    id: string,
    position: Coordinate,
    dimension: Dimension,
    public label?: string,
    color?: NodeColor
  ) {
    super(id, position, dimension, color);
  }

  static create(
    position: Coordinate,
    dimension: Dimension,
    label?: string,
    color?: NodeColor
  ): GroupNode {
    return new GroupNode(
      generateNodeId('group'),
      position,
      dimension,
      label,
      color
    );
  }

  /**
   * Create a group that contains the given nodes with padding
   */
  static fromNodes(
    nodes: CanvasNode[],
    padding: number = 50,
    label?: string,
    color?: NodeColor
  ): GroupNode {
    if (nodes.length === 0) {
      return GroupNode.create(Coordinate.origin(), new Dimension(200, 150), label, color);
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
      const { topLeft, bottomRight } = node.bounds;
      minX = Math.min(minX, topLeft.x);
      minY = Math.min(minY, topLeft.y);
      maxX = Math.max(maxX, bottomRight.x);
      maxY = Math.max(maxY, bottomRight.y);
    }

    return GroupNode.create(
      new Coordinate(minX - padding, minY - padding),
      new Dimension(maxX - minX + padding * 2, maxY - minY + padding * 2),
      label,
      color
    );
  }

  /**
   * Check if this group contains a node (based on coordinates)
   */
  containsNode(node: CanvasNode): boolean {
    const { topLeft, bottomRight } = this.bounds;
    const nodeTopLeft = node.bounds.topLeft;
    const nodeBottomRight = node.bounds.bottomRight;

    return (
      nodeTopLeft.x >= topLeft.x &&
      nodeTopLeft.y >= topLeft.y &&
      nodeBottomRight.x <= bottomRight.x &&
      nodeBottomRight.y <= bottomRight.y
    );
  }

  toCanvasFormat(): object {
    const base: Record<string, unknown> = {
      id: this.id,
      type: this.type,
      x: this.position.x,
      y: this.position.y,
      width: this.dimension.width,
      height: this.dimension.height,
    };
    if (this.label) {
      base.label = this.label;
    }
    if (this.color) {
      base.color = this.color.toString();
    }
    return base;
  }
}
