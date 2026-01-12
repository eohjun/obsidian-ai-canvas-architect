/**
 * Canvas Repository Interface
 * Port for canvas file operations
 */

import type { CanvasGraph } from '../entities/canvas-graph.js';

export interface ICanvasRepository {
  /**
   * Save a canvas graph to a file
   * @param path File path (relative to vault root)
   * @param graph Canvas graph to save
   */
  save(path: string, graph: CanvasGraph): Promise<void>;

  /**
   * Load a canvas from a file
   * @param path File path (relative to vault root)
   * @returns Canvas graph or null if not found
   */
  load(path: string): Promise<CanvasGraph | null>;

  /**
   * Check if a canvas file exists
   * @param path File path (relative to vault root)
   */
  exists(path: string): Promise<boolean>;

  /**
   * Delete a canvas file
   * @param path File path (relative to vault root)
   */
  delete(path: string): Promise<void>;

  /**
   * Open a canvas file in Obsidian
   * @param path File path (relative to vault root)
   */
  open(path: string): Promise<void>;
}
