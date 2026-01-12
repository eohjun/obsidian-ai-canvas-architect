/**
 * Obsidian Canvas Repository
 * Implements ICanvasRepository for Obsidian vault operations
 */

import { App, normalizePath } from 'obsidian';
import type { ICanvasRepository } from '../../domain/interfaces/canvas-repository.interface.js';
import { CanvasGraph } from '../../domain/entities/canvas-graph.js';

export class ObsidianCanvasRepository implements ICanvasRepository {
  constructor(private app: App) {}

  /**
   * Save a canvas graph to a file
   */
  async save(path: string, graph: CanvasGraph): Promise<void> {
    const normalizedPath = normalizePath(path);
    const content = JSON.stringify(graph.toCanvasFormat(), null, 2);

    const existingFile = this.app.vault.getAbstractFileByPath(normalizedPath);

    if (existingFile) {
      // Update existing file
      await this.app.vault.adapter.write(normalizedPath, content);
    } else {
      // Create new file
      await this.app.vault.create(normalizedPath, content);
    }
  }

  /**
   * Load a canvas graph from a file
   */
  async load(path: string): Promise<CanvasGraph | null> {
    const normalizedPath = normalizePath(path);

    try {
      const content = await this.app.vault.adapter.read(normalizedPath);
      const data = JSON.parse(content);
      return CanvasGraph.fromJSON(data);
    } catch {
      return null;
    }
  }

  /**
   * Check if a canvas file exists
   */
  async exists(path: string): Promise<boolean> {
    const normalizedPath = normalizePath(path);
    return await this.app.vault.adapter.exists(normalizedPath);
  }

  /**
   * Delete a canvas file
   */
  async delete(path: string): Promise<void> {
    const normalizedPath = normalizePath(path);
    const file = this.app.vault.getAbstractFileByPath(normalizedPath);

    if (file) {
      await this.app.vault.delete(file);
    }
  }

  /**
   * Open a canvas file in Obsidian
   */
  async open(path: string): Promise<void> {
    const normalizedPath = normalizePath(path);
    const file = this.app.vault.getAbstractFileByPath(normalizedPath);

    if (file) {
      await this.app.workspace.getLeaf(false).openFile(file as never);
    }
  }

  /**
   * List all canvas files in the vault
   */
  async listCanvasFiles(): Promise<string[]> {
    const files = this.app.vault.getFiles();
    return files.filter((f) => f.extension === 'canvas').map((f) => f.path);
  }

  /**
   * Generate a unique canvas file path
   */
  generateCanvasPath(baseName: string, folder: string = ''): string {
    const timestamp = new Date().toISOString().slice(0, 10);
    const safeName = baseName.replace(/[^a-zA-Z0-9가-힣\s-]/g, '').trim();
    const fileName = `${safeName}-${timestamp}.canvas`;

    if (folder) {
      return normalizePath(`${folder}/${fileName}`);
    }
    return fileName;
  }
}
