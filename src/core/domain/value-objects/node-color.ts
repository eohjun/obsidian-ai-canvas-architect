/**
 * NodeColor Value Object
 * Represents a color for canvas nodes
 * Supports both preset colors (1-6) and custom hex colors
 */

export type PresetColor = '1' | '2' | '3' | '4' | '5' | '6';

export const PRESET_COLOR_NAMES: Record<PresetColor, string> = {
  '1': 'Red',
  '2': 'Orange',
  '3': 'Yellow',
  '4': 'Green',
  '5': 'Cyan',
  '6': 'Purple',
};

export const PRESET_COLOR_HEX: Record<PresetColor, string> = {
  '1': '#fb464c',
  '2': '#e9973f',
  '3': '#e0de71',
  '4': '#44cf6e',
  '5': '#53dfdd',
  '6': '#a882ff',
};

export class NodeColor {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * Create from preset color (1-6)
   */
  static preset(color: PresetColor): NodeColor {
    return new NodeColor(color);
  }

  /**
   * Create from hex color (#RRGGBB)
   */
  static hex(color: string): NodeColor {
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      throw new Error(`Invalid hex color: ${color}`);
    }
    return new NodeColor(color);
  }

  /**
   * Create from any valid color string
   */
  static from(color: string): NodeColor {
    if (/^[1-6]$/.test(color)) {
      return NodeColor.preset(color as PresetColor);
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return NodeColor.hex(color);
    }
    throw new Error(`Invalid color: ${color}`);
  }

  /**
   * Get a random preset color
   */
  static random(): NodeColor {
    const presets: PresetColor[] = ['1', '2', '3', '4', '5', '6'];
    const index = Math.floor(Math.random() * presets.length);
    return NodeColor.preset(presets[index]);
  }

  /**
   * Get color by index (cycles through presets)
   */
  static byIndex(index: number): NodeColor {
    const presets: PresetColor[] = ['1', '2', '3', '4', '5', '6'];
    return NodeColor.preset(presets[index % presets.length]);
  }

  /**
   * Check if this is a preset color
   */
  get isPreset(): boolean {
    return /^[1-6]$/.test(this.value);
  }

  /**
   * Get the hex representation
   */
  get hex(): string {
    if (this.isPreset) {
      return PRESET_COLOR_HEX[this.value as PresetColor];
    }
    return this.value;
  }

  /**
   * Get the color name (for presets) or hex value
   */
  get name(): string {
    if (this.isPreset) {
      return PRESET_COLOR_NAMES[this.value as PresetColor];
    }
    return this.value;
  }

  /**
   * Get the canvas-compatible value
   */
  toString(): string {
    return this.value;
  }

  /**
   * Check equality
   */
  equals(other: NodeColor): boolean {
    return this.value === other.value;
  }
}
