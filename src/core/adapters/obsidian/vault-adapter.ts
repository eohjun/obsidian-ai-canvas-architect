/**
 * Vault Adapter
 * Provides access to vault notes and metadata
 */

import { App, TFile, normalizePath } from 'obsidian';

export interface NoteMetadata {
  path: string;
  basename: string;
  title: string;
  tags: string[];
  links: string[];
  created: number;
  modified: number;
}

export class VaultAdapter {
  constructor(private app: App) {}

  /**
   * Get all markdown files in the vault
   */
  getMarkdownFiles(): TFile[] {
    return this.app.vault.getMarkdownFiles();
  }

  /**
   * Get a file by path
   */
  getFileByPath(path: string): TFile | null {
    const normalizedPath = normalizePath(path);
    const file = this.app.vault.getAbstractFileByPath(normalizedPath);
    return file instanceof TFile ? file : null;
  }

  /**
   * Read file content
   */
  async readFile(file: TFile): Promise<string> {
    return await this.app.vault.cachedRead(file);
  }

  /**
   * Read file content by path
   */
  async readFileByPath(path: string): Promise<string | null> {
    const file = this.getFileByPath(path);
    if (!file) return null;
    return await this.readFile(file);
  }

  /**
   * Get note metadata
   */
  getNoteMetadata(file: TFile): NoteMetadata {
    const cache = this.app.metadataCache.getFileCache(file);

    // Extract tags from cache
    const tags: string[] = [];
    if (cache?.frontmatter?.tags) {
      const fmTags = cache.frontmatter.tags;
      if (Array.isArray(fmTags)) {
        tags.push(...fmTags);
      } else if (typeof fmTags === 'string') {
        tags.push(fmTags);
      }
    }
    if (cache?.tags) {
      tags.push(...cache.tags.map((t) => t.tag.replace('#', '')));
    }

    // Extract links from cache
    const links: string[] = [];
    if (cache?.links) {
      links.push(...cache.links.map((l) => l.link));
    }

    // Get title from frontmatter or filename
    const title = cache?.frontmatter?.title || file.basename;

    return {
      path: file.path,
      basename: file.basename,
      title,
      tags: [...new Set(tags)], // Remove duplicates
      links: [...new Set(links)],
      created: file.stat.ctime,
      modified: file.stat.mtime,
    };
  }

  /**
   * Get all notes with metadata
   */
  getAllNotesWithMetadata(): NoteMetadata[] {
    const files = this.getMarkdownFiles();
    return files.map((file) => this.getNoteMetadata(file));
  }

  /**
   * Search notes by title
   */
  searchByTitle(query: string): TFile[] {
    const normalizedQuery = query.toLowerCase();
    return this.getMarkdownFiles().filter((file) =>
      file.basename.toLowerCase().includes(normalizedQuery)
    );
  }

  /**
   * Search notes by tags
   */
  searchByTags(tags: string[]): TFile[] {
    const normalizedTags = tags.map((t) => t.toLowerCase().replace('#', ''));

    return this.getMarkdownFiles().filter((file) => {
      const metadata = this.getNoteMetadata(file);
      return normalizedTags.some((tag) =>
        metadata.tags.some((t) => t.toLowerCase() === tag)
      );
    });
  }

  /**
   * Get the currently active file
   */
  getActiveFile(): TFile | null {
    return this.app.workspace.getActiveFile();
  }

  /**
   * Create a folder if it doesn't exist
   * Cross-platform safe: handles "already exists" errors from sync race conditions
   */
  async ensureFolder(path: string): Promise<void> {
    const normalizedPath = normalizePath(path);
    const exists = await this.app.vault.adapter.exists(normalizedPath);

    if (!exists) {
      try {
        await this.app.vault.createFolder(normalizedPath);
      } catch (error) {
        // Handle "already exists" error from sync race conditions as success
        if (error instanceof Error && error.message.includes('already exists')) {
          return;
        }
        throw error;
      }
    }
  }
}
