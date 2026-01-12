/**
 * Canvas Builder Service
 * Assembles canvas components (nodes, edges, groups) into a complete CanvasGraph
 */

import { CanvasGraph } from '../../domain/entities/canvas-graph.js';
import { FileNode, GroupNode } from '../../domain/entities/canvas-node.js';
import { CanvasEdge } from '../../domain/entities/canvas-edge.js';
import { Coordinate } from '../../domain/value-objects/coordinate.js';
import { Dimension } from '../../domain/value-objects/dimension.js';
import { NodeColor } from '../../domain/value-objects/node-color.js';
import { MDSAlgorithm } from '../../domain/services/mds-algorithm.js';
import { DBSCANAlgorithm } from '../../domain/services/dbscan-algorithm.js';
import type { DBSCANCluster } from '../../domain/services/dbscan-algorithm.js';
import type { NoteEmbedding } from '../../domain/interfaces/embedding-provider.interface.js';

export interface CanvasBuilderOptions {
  /** Canvas width in pixels */
  canvasWidth: number;
  /** Canvas height in pixels */
  canvasHeight: number;
  /** Node width */
  nodeWidth: number;
  /** Node height */
  nodeHeight: number;
  /** Padding from canvas edges */
  padding: number;
  /** DBSCAN eps (neighborhood radius) */
  clusterEps: number;
  /** DBSCAN minPts */
  clusterMinPts: number;
  /** Minimum similarity for creating edges */
  edgeThreshold: number;
  /** Group padding around clustered nodes */
  groupPadding: number;
}

const DEFAULT_OPTIONS: CanvasBuilderOptions = {
  canvasWidth: 2000,
  canvasHeight: 1500,
  nodeWidth: 250,
  nodeHeight: 150,
  padding: 100,
  clusterEps: 200,
  clusterMinPts: 2,
  edgeThreshold: 0.7,
  groupPadding: 30,
};

export interface NoteWithPosition {
  note: NoteEmbedding;
  position: Coordinate;
}

export interface ClusterWithLabel {
  cluster: DBSCANCluster;
  label?: string;
  nodes: FileNode[];
}

/**
 * Canvas Builder Service
 * Orchestrates the canvas assembly process
 */
export class CanvasBuilderService {
  private options: CanvasBuilderOptions;
  private mdsAlgorithm: MDSAlgorithm;
  private dbscanAlgorithm: DBSCANAlgorithm;

  constructor(options?: Partial<CanvasBuilderOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.mdsAlgorithm = new MDSAlgorithm({
      canvasWidth: this.options.canvasWidth,
      canvasHeight: this.options.canvasHeight,
      padding: this.options.padding,
    });

    this.dbscanAlgorithm = new DBSCANAlgorithm({
      eps: this.options.clusterEps,
      minPts: this.options.clusterMinPts,
    });
  }

  /**
   * Compute 2D positions for notes using MDS
   */
  computePositions(notes: NoteEmbedding[]): Map<string, Coordinate> {
    if (notes.length === 0) {
      return new Map();
    }

    const vectors = notes.map((n) => n.vector);
    const ids = notes.map((n) => n.noteId);

    const result = this.mdsAlgorithm.run({ vectors, ids });
    return result.coordinates;
  }

  /**
   * Create file nodes from notes with positions
   */
  createFileNodes(notes: NoteEmbedding[], positions: Map<string, Coordinate>): FileNode[] {
    const nodeDimension = new Dimension(this.options.nodeWidth, this.options.nodeHeight);

    return notes.map((note) => {
      const position = positions.get(note.noteId) ?? Coordinate.origin();
      return FileNode.create(note.path, position, nodeDimension);
    });
  }

  /**
   * Cluster nodes based on their positions
   */
  clusterNodes(nodes: FileNode[]): { clusters: ClusterWithLabel[]; noise: FileNode[] } {
    const points = nodes.map((node) => ({
      id: node.id,
      coordinate: node.position,
    }));

    const result = this.dbscanAlgorithm.run(points);

    // Map cluster results back to nodes
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const clustersWithNodes: ClusterWithLabel[] = [];

    for (const cluster of result.clusters) {
      const clusterNodes: FileNode[] = [];
      for (const point of cluster.points) {
        const node = nodeMap.get(point.id);
        if (node) {
          clusterNodes.push(node);
        }
      }
      clustersWithNodes.push({
        cluster,
        nodes: clusterNodes,
      });
    }

    const noiseNodes = result.noise
      .map((p) => nodeMap.get(p.id))
      .filter((n): n is FileNode => n !== undefined);

    return { clusters: clustersWithNodes, noise: noiseNodes };
  }

  /**
   * Create group nodes for clusters
   */
  createGroupNodes(clusters: ClusterWithLabel[]): GroupNode[] {
    return clusters.map((cluster, index) => {
      const color = NodeColor.byIndex(index);
      const label = cluster.label ?? `Cluster ${index + 1}`;
      return GroupNode.fromNodes(cluster.nodes, this.options.groupPadding, label, color);
    });
  }

  /**
   * Create edges between similar notes
   * @param notes Notes with their embeddings
   * @param nodeMap Map from noteId to node
   * @param threshold Minimum similarity to create edge
   */
  createEdges(
    notes: NoteEmbedding[],
    nodeMap: Map<string, FileNode>,
    threshold: number = this.options.edgeThreshold
  ): CanvasEdge[] {
    const edges: CanvasEdge[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        const similarity = this.cosineSimilarity(notes[i].vector, notes[j].vector);

        if (similarity >= threshold) {
          const nodeA = nodeMap.get(notes[i].noteId);
          const nodeB = nodeMap.get(notes[j].noteId);

          if (nodeA && nodeB) {
            const pairKey = [nodeA.id, nodeB.id].sort().join('-');
            if (!processed.has(pairKey)) {
              edges.push(
                CanvasEdge.createConnection(nodeA.id, nodeB.id, {
                  label: `${(similarity * 100).toFixed(0)}%`,
                })
              );
              processed.add(pairKey);
            }
          }
        }
      }
    }

    return edges;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
  }

  /**
   * Resolve node overlaps by pushing overlapping nodes apart
   */
  resolveOverlaps(nodes: FileNode[], iterations: number = 10): void {
    const minDistance = Math.max(this.options.nodeWidth, this.options.nodeHeight) + 20;

    for (let iter = 0; iter < iterations; iter++) {
      let hasOverlap = false;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeA = nodes[i];
          const nodeB = nodes[j];

          if (nodeA.overlaps(nodeB)) {
            hasOverlap = true;

            // Calculate push direction
            const centerA = nodeA.center;
            const centerB = nodeB.center;
            let dx = centerB.x - centerA.x;
            let dy = centerB.y - centerA.y;

            // Handle exact overlap
            if (dx === 0 && dy === 0) {
              dx = (Math.random() - 0.5) * 10;
              dy = (Math.random() - 0.5) * 10;
            }

            const distance = Math.sqrt(dx * dx + dy * dy);
            const pushDistance = (minDistance - distance) / 2 + 10;

            // Normalize and scale
            const pushX = (dx / distance) * pushDistance;
            const pushY = (dy / distance) * pushDistance;

            // Push nodes apart
            nodeA.moveBy(-pushX, -pushY);
            nodeB.moveBy(pushX, pushY);
          }
        }
      }

      if (!hasOverlap) break;
    }
  }

  /**
   * Build a complete canvas graph from notes
   */
  buildCanvas(
    notes: NoteEmbedding[],
    options: {
      includeClusterLabels?: boolean;
      showEdges?: boolean;
      edgeThreshold?: number;
      clusterLabels?: Map<number, string>;
    } = {}
  ): CanvasGraph {
    const graph = new CanvasGraph();

    if (notes.length === 0) {
      return graph;
    }

    // Step 1: Compute 2D positions using MDS
    const positions = this.computePositions(notes);

    // Step 2: Create file nodes
    const fileNodes = this.createFileNodes(notes, positions);

    // Step 3: Create noteId -> node mapping
    const noteIdToNode = new Map<string, FileNode>();
    notes.forEach((note, index) => {
      noteIdToNode.set(note.noteId, fileNodes[index]);
    });

    // Step 4: Resolve overlaps
    this.resolveOverlaps(fileNodes);

    // Step 5: Cluster nodes
    const { clusters } = this.clusterNodes(fileNodes);

    // Step 6: Apply cluster labels if provided
    if (options.clusterLabels) {
      for (const cluster of clusters) {
        const label = options.clusterLabels.get(cluster.cluster.clusterId);
        if (label) {
          cluster.label = label;
        }
      }
    }

    // Step 7: Create group nodes for clusters
    if (options.includeClusterLabels !== false && clusters.length > 0) {
      const groupNodes = this.createGroupNodes(clusters);
      // Add groups first (they should be rendered below other nodes)
      graph.addNodes(groupNodes);
    }

    // Step 8: Add file nodes
    graph.addNodes(fileNodes);

    // Step 9: Create edges between similar notes
    if (options.showEdges !== false) {
      const edges = this.createEdges(
        notes,
        noteIdToNode,
        options.edgeThreshold ?? this.options.edgeThreshold
      );
      graph.addEdges(edges);
    }

    return graph;
  }
}
