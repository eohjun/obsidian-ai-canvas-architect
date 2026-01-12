/**
 * Canvas Graph Entity
 * Collection of nodes and edges representing a complete canvas
 */

import { CanvasNode, FileNode, TextNode, GroupNode } from './canvas-node.js';
import { CanvasEdge } from './canvas-edge.js';
import { Coordinate } from '../value-objects/coordinate.js';
import { Dimension } from '../value-objects/dimension.js';

export interface CanvasGraphData {
  nodes: object[];
  edges: object[];
}

export class CanvasGraph {
  private nodes: Map<string, CanvasNode> = new Map();
  private edges: Map<string, CanvasEdge> = new Map();

  constructor() {}

  /**
   * Add a node to the graph
   */
  addNode(node: CanvasNode): void {
    this.nodes.set(node.id, node);
  }

  /**
   * Add multiple nodes
   */
  addNodes(nodes: CanvasNode[]): void {
    for (const node of nodes) {
      this.addNode(node);
    }
  }

  /**
   * Remove a node and its connected edges
   */
  removeNode(nodeId: string): boolean {
    if (!this.nodes.has(nodeId)) return false;

    // Remove all edges connected to this node
    for (const [edgeId, edge] of this.edges) {
      if (edge.involves(nodeId)) {
        this.edges.delete(edgeId);
      }
    }

    return this.nodes.delete(nodeId);
  }

  /**
   * Get a node by ID
   */
  getNode(nodeId: string): CanvasNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): CanvasNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get nodes by type
   */
  getNodesByType<T extends CanvasNode>(type: 'file' | 'text' | 'group'): T[] {
    return Array.from(this.nodes.values()).filter(
      (node) => node.type === type
    ) as T[];
  }

  /**
   * Get file nodes
   */
  getFileNodes(): FileNode[] {
    return this.getNodesByType<FileNode>('file');
  }

  /**
   * Get text nodes
   */
  getTextNodes(): TextNode[] {
    return this.getNodesByType<TextNode>('text');
  }

  /**
   * Get group nodes
   */
  getGroupNodes(): GroupNode[] {
    return this.getNodesByType<GroupNode>('group');
  }

  /**
   * Add an edge to the graph
   */
  addEdge(edge: CanvasEdge): void {
    // Validate that both nodes exist
    if (!this.nodes.has(edge.fromNode) || !this.nodes.has(edge.toNode)) {
      throw new Error(
        `Cannot add edge: nodes ${edge.fromNode} or ${edge.toNode} not found`
      );
    }
    this.edges.set(edge.id, edge);
  }

  /**
   * Add multiple edges
   */
  addEdges(edges: CanvasEdge[]): void {
    for (const edge of edges) {
      this.addEdge(edge);
    }
  }

  /**
   * Remove an edge
   */
  removeEdge(edgeId: string): boolean {
    return this.edges.delete(edgeId);
  }

  /**
   * Get an edge by ID
   */
  getEdge(edgeId: string): CanvasEdge | undefined {
    return this.edges.get(edgeId);
  }

  /**
   * Get all edges
   */
  getAllEdges(): CanvasEdge[] {
    return Array.from(this.edges.values());
  }

  /**
   * Get edges connected to a node
   */
  getEdgesForNode(nodeId: string): CanvasEdge[] {
    return Array.from(this.edges.values()).filter((edge) =>
      edge.involves(nodeId)
    );
  }

  /**
   * Get the total number of nodes
   */
  get nodeCount(): number {
    return this.nodes.size;
  }

  /**
   * Get the total number of edges
   */
  get edgeCount(): number {
    return this.edges.size;
  }

  /**
   * Calculate bounding box of all nodes
   */
  getBounds(): { min: Coordinate; max: Coordinate; dimension: Dimension } | null {
    const nodes = this.getAllNodes();
    if (nodes.length === 0) return null;

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

    return {
      min: new Coordinate(minX, minY),
      max: new Coordinate(maxX, maxY),
      dimension: new Dimension(maxX - minX, maxY - minY),
    };
  }

  /**
   * Get center of all nodes
   */
  getCenter(): Coordinate {
    const bounds = this.getBounds();
    if (!bounds) return Coordinate.origin();
    return bounds.min.midpoint(bounds.max);
  }

  /**
   * Check if an edge already exists between two nodes
   */
  hasEdgeBetween(nodeA: string, nodeB: string): boolean {
    for (const edge of this.edges.values()) {
      if (edge.connects(nodeA, nodeB)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get neighbors of a node (connected via edges)
   */
  getNeighbors(nodeId: string): CanvasNode[] {
    const neighbors: CanvasNode[] = [];
    for (const edge of this.edges.values()) {
      const otherId = edge.getOtherNode(nodeId);
      if (otherId) {
        const node = this.nodes.get(otherId);
        if (node) neighbors.push(node);
      }
    }
    return neighbors;
  }

  /**
   * Convert to Obsidian Canvas JSON format
   */
  toCanvasFormat(): CanvasGraphData {
    // Groups should come first in the nodes array for proper rendering
    const groups = this.getGroupNodes();
    const otherNodes = this.getAllNodes().filter((n) => n.type !== 'group');

    return {
      nodes: [...groups, ...otherNodes].map((node) => node.toCanvasFormat()),
      edges: this.getAllEdges().map((edge) => edge.toCanvasFormat()),
    };
  }

  /**
   * Serialize to JSON string
   */
  toJSON(): string {
    return JSON.stringify(this.toCanvasFormat(), null, 2);
  }

  /**
   * Clear all nodes and edges
   */
  clear(): void {
    this.nodes.clear();
    this.edges.clear();
  }
}
