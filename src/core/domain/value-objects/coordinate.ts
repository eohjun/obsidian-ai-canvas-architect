/**
 * Coordinate Value Object
 * Represents a 2D position (x, y) on the canvas
 * Immutable - all operations return new instances
 */
export class Coordinate {
  constructor(
    public readonly x: number,
    public readonly y: number
  ) {}

  /**
   * Create a coordinate at origin
   */
  static origin(): Coordinate {
    return new Coordinate(0, 0);
  }

  /**
   * Create a coordinate from an object
   */
  static from(obj: { x: number; y: number }): Coordinate {
    return new Coordinate(obj.x, obj.y);
  }

  /**
   * Calculate Euclidean distance to another coordinate
   */
  distanceTo(other: Coordinate): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Add another coordinate (vector addition)
   */
  add(other: Coordinate): Coordinate {
    return new Coordinate(this.x + other.x, this.y + other.y);
  }

  /**
   * Subtract another coordinate (vector subtraction)
   */
  subtract(other: Coordinate): Coordinate {
    return new Coordinate(this.x - other.x, this.y - other.y);
  }

  /**
   * Scale by a factor
   */
  scale(factor: number): Coordinate {
    return new Coordinate(this.x * factor, this.y * factor);
  }

  /**
   * Get midpoint between this and another coordinate
   */
  midpoint(other: Coordinate): Coordinate {
    return new Coordinate((this.x + other.x) / 2, (this.y + other.y) / 2);
  }

  /**
   * Check equality with another coordinate
   */
  equals(other: Coordinate): boolean {
    return this.x === other.x && this.y === other.y;
  }

  /**
   * Create a copy with offset
   */
  offset(dx: number, dy: number): Coordinate {
    return new Coordinate(this.x + dx, this.y + dy);
  }

  /**
   * Convert to plain object
   */
  toObject(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  toString(): string {
    return `(${this.x}, ${this.y})`;
  }
}
