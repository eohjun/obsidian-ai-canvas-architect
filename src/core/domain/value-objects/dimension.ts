/**
 * Dimension Value Object
 * Represents width and height of a canvas element
 * Immutable - all operations return new instances
 */
export class Dimension {
  constructor(
    public readonly width: number,
    public readonly height: number
  ) {
    if (width < 0 || height < 0) {
      throw new Error('Dimension values must be non-negative');
    }
  }

  /**
   * Create a default node dimension
   */
  static defaultNode(): Dimension {
    return new Dimension(250, 150);
  }

  /**
   * Create a square dimension
   */
  static square(size: number): Dimension {
    return new Dimension(size, size);
  }

  /**
   * Create from an object
   */
  static from(obj: { width: number; height: number }): Dimension {
    return new Dimension(obj.width, obj.height);
  }

  /**
   * Calculate area
   */
  get area(): number {
    return this.width * this.height;
  }

  /**
   * Calculate aspect ratio (width / height)
   */
  get aspectRatio(): number {
    return this.height === 0 ? 0 : this.width / this.height;
  }

  /**
   * Scale by a factor
   */
  scale(factor: number): Dimension {
    return new Dimension(this.width * factor, this.height * factor);
  }

  /**
   * Add padding
   */
  pad(padding: number): Dimension {
    return new Dimension(this.width + padding * 2, this.height + padding * 2);
  }

  /**
   * Check if another dimension fits within this one
   */
  contains(other: Dimension): boolean {
    return this.width >= other.width && this.height >= other.height;
  }

  /**
   * Check equality
   */
  equals(other: Dimension): boolean {
    return this.width === other.width && this.height === other.height;
  }

  /**
   * Convert to plain object
   */
  toObject(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  toString(): string {
    return `${this.width}x${this.height}`;
  }
}
