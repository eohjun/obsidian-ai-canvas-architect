/**
 * AI Canvas Architect - Main Plugin Entry
 *
 * Phase 0: POC & API Validation
 * - Test direct .canvas file creation
 * - Validate node rendering performance
 * - Test group node containment
 * - Test mixed coordinate placement
 */

import { Plugin, Notice, normalizePath } from 'obsidian';
import type { PluginSettings, CanvasData, CanvasTextNode, CanvasGroupNode, CanvasEdge } from './types';
import { DEFAULT_SETTINGS } from './types';

export default class AICanvasArchitectPlugin extends Plugin {
  settings!: PluginSettings;

  async onload(): Promise<void> {
    await this.loadSettings();

    // POC Command: Generate test canvas with 100 nodes
    this.addCommand({
      id: 'poc-generate-test-canvas',
      name: 'POC: Generate Test Canvas (100 nodes)',
      callback: () => this.generatePOCCanvas(),
    });

    // POC Command: Test group containment
    this.addCommand({
      id: 'poc-test-group-containment',
      name: 'POC: Test Group Node Containment',
      callback: () => this.testGroupContainment(),
    });

    // POC Command: Test mixed coordinates
    this.addCommand({
      id: 'poc-test-mixed-coordinates',
      name: 'POC: Test Mixed Positive/Negative Coordinates',
      callback: () => this.testMixedCoordinates(),
    });

    console.log('AI Canvas Architect loaded (POC mode)');
  }

  async onunload(): Promise<void> {
    console.log('AI Canvas Architect unloaded');
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /**
   * POC: Generate a canvas with 100 text nodes in a grid pattern
   * Tests: Canvas creation, large node count rendering
   */
  private async generatePOCCanvas(): Promise<void> {
    const startTime = performance.now();
    const nodeCount = 100;
    const cols = 10;
    const nodeWidth = 200;
    const nodeHeight = 100;
    const gap = 50;

    const nodes: CanvasTextNode[] = [];
    const edges: CanvasEdge[] = [];

    // Generate 100 nodes in a 10x10 grid
    for (let i = 0; i < nodeCount; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = col * (nodeWidth + gap);
      const y = row * (nodeHeight + gap);

      nodes.push({
        id: `node-${i}`,
        type: 'text',
        x,
        y,
        width: nodeWidth,
        height: nodeHeight,
        text: `Node ${i + 1}\nRow: ${row + 1}, Col: ${col + 1}`,
      });

      // Add edges to adjacent nodes (horizontal and vertical)
      if (col > 0) {
        edges.push({
          id: `edge-h-${i}`,
          fromNode: `node-${i - 1}`,
          toNode: `node-${i}`,
          toEnd: 'arrow',
        });
      }
      if (row > 0) {
        edges.push({
          id: `edge-v-${i}`,
          fromNode: `node-${i - cols}`,
          toNode: `node-${i}`,
          toEnd: 'arrow',
        });
      }
    }

    const canvasData: CanvasData = { nodes, edges };
    const canvasPath = normalizePath('POC_100_nodes_test.canvas');

    try {
      await this.createCanvasFile(canvasPath, canvasData);
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);

      new Notice(`POC: Created canvas with ${nodeCount} nodes and ${edges.length} edges in ${duration}ms`);
      console.log(`[POC] Canvas creation time: ${duration}ms`);
    } catch (error) {
      console.error('[POC] Failed to create canvas:', error);
      new Notice(`POC Failed: ${(error as Error).message}`);
    }
  }

  /**
   * POC: Test group node containment
   * Tests: Whether nodes inside group boundaries are visually contained
   */
  private async testGroupContainment(): Promise<void> {
    const groupNode: CanvasGroupNode = {
      id: 'group-1',
      type: 'group',
      x: 0,
      y: 0,
      width: 600,
      height: 400,
      label: 'Test Group',
      color: '1', // Red preset
    };

    const fileNodes: CanvasTextNode[] = [
      {
        id: 'inner-1',
        type: 'text',
        x: 50,
        y: 50,
        width: 150,
        height: 100,
        text: 'Inside Group 1',
      },
      {
        id: 'inner-2',
        type: 'text',
        x: 250,
        y: 50,
        width: 150,
        height: 100,
        text: 'Inside Group 2',
      },
      {
        id: 'inner-3',
        type: 'text',
        x: 150,
        y: 200,
        width: 150,
        height: 100,
        text: 'Inside Group 3',
      },
      {
        id: 'outside-1',
        type: 'text',
        x: 700,
        y: 100,
        width: 150,
        height: 100,
        text: 'Outside Group',
      },
    ];

    const canvasData: CanvasData = {
      nodes: [groupNode, ...fileNodes],
      edges: [
        {
          id: 'edge-1',
          fromNode: 'inner-1',
          toNode: 'inner-2',
          toEnd: 'arrow',
        },
        {
          id: 'edge-2',
          fromNode: 'inner-2',
          toNode: 'inner-3',
          toEnd: 'arrow',
        },
        {
          id: 'edge-3',
          fromNode: 'inner-3',
          toNode: 'outside-1',
          toEnd: 'arrow',
          color: '4', // Green
        },
      ],
    };

    const canvasPath = normalizePath('POC_group_containment_test.canvas');

    try {
      await this.createCanvasFile(canvasPath, canvasData);
      new Notice('POC: Created group containment test canvas');
    } catch (error) {
      console.error('[POC] Failed to create canvas:', error);
      new Notice(`POC Failed: ${(error as Error).message}`);
    }
  }

  /**
   * POC: Test mixed positive/negative coordinates
   * Tests: Whether negative coordinates work correctly
   */
  private async testMixedCoordinates(): Promise<void> {
    const nodes: CanvasTextNode[] = [
      // Quadrant 1 (positive x, positive y)
      {
        id: 'q1',
        type: 'text',
        x: 100,
        y: 100,
        width: 150,
        height: 80,
        text: 'Q1: (+x, +y)',
        color: '1',
      },
      // Quadrant 2 (negative x, positive y)
      {
        id: 'q2',
        type: 'text',
        x: -300,
        y: 100,
        width: 150,
        height: 80,
        text: 'Q2: (-x, +y)',
        color: '2',
      },
      // Quadrant 3 (negative x, negative y)
      {
        id: 'q3',
        type: 'text',
        x: -300,
        y: -200,
        width: 150,
        height: 80,
        text: 'Q3: (-x, -y)',
        color: '3',
      },
      // Quadrant 4 (positive x, negative y)
      {
        id: 'q4',
        type: 'text',
        x: 100,
        y: -200,
        width: 150,
        height: 80,
        text: 'Q4: (+x, -y)',
        color: '4',
      },
      // Origin marker
      {
        id: 'origin',
        type: 'text',
        x: -50,
        y: -30,
        width: 100,
        height: 60,
        text: 'ORIGIN\n(0, 0)',
        color: '6',
      },
    ];

    const edges: CanvasEdge[] = [
      { id: 'e1', fromNode: 'origin', toNode: 'q1', toEnd: 'arrow' },
      { id: 'e2', fromNode: 'origin', toNode: 'q2', toEnd: 'arrow' },
      { id: 'e3', fromNode: 'origin', toNode: 'q3', toEnd: 'arrow' },
      { id: 'e4', fromNode: 'origin', toNode: 'q4', toEnd: 'arrow' },
    ];

    const canvasData: CanvasData = { nodes, edges };
    const canvasPath = normalizePath('POC_mixed_coordinates_test.canvas');

    try {
      await this.createCanvasFile(canvasPath, canvasData);
      new Notice('POC: Created mixed coordinates test canvas');
    } catch (error) {
      console.error('[POC] Failed to create canvas:', error);
      new Notice(`POC Failed: ${(error as Error).message}`);
    }
  }

  /**
   * Create a canvas file with the given data
   */
  private async createCanvasFile(path: string, data: CanvasData): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    const normalizedPath = normalizePath(path);

    // Check if file exists
    const existingFile = this.app.vault.getAbstractFileByPath(normalizedPath);

    if (existingFile) {
      // Modify existing file
      await this.app.vault.adapter.write(normalizedPath, content);
    } else {
      // Create new file
      await this.app.vault.create(normalizedPath, content);
    }

    // Open the canvas file
    const file = this.app.vault.getAbstractFileByPath(normalizedPath);
    if (file) {
      await this.app.workspace.getLeaf().openFile(file as any);
    }
  }
}
