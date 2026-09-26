/**
 * Canonicalization and Input Normalization Utilities
 *
 * Ensures signed, hashed, or externally referenced payloads produce
 * consistent canonical representations across equivalent input.
 *
 * Implements normalization rules for:
 * - String ordering and whitespace
 * - Numeric precision and formatting
 * - Case sensitivity
 * - Legacy record compatibility
 */

export interface CanonicalizeOptions {
  /** Sort object keys alphabetically */
  sortKeys?: boolean;
  /** Normalize whitespace (trim and single spaces) */
  normalizeWhitespace?: boolean;
  /** Convert numeric strings to numbers */
  normalizeNumbers?: boolean;
  /** Lowercase string values */
  lowerCase?: boolean;
  /** Precision for decimal numbers */
  decimalPlaces?: number;
  /** Transform nested objects recursively */
  recursive?: boolean;
}

const DEFAULT_OPTIONS: CanonicalizeOptions = {
  sortKeys: true,
  normalizeWhitespace: true,
  normalizeNumbers: true,
  lowerCase: false,
  decimalPlaces: 8,
  recursive: true,
};

/**
 * Normalize whitespace in strings (trim and single internal spaces)
 */
export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Normalize numeric precision for consistent comparison and hashing
 */
export function normalizeNumber(value: number, decimalPlaces: number = 8): string {
  // Handle edge cases
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric value: ${value}`);
  }

  // Convert to fixed decimal places
  const normalized = Number(value.toFixed(decimalPlaces));

  // Return string representation to preserve precision
  return normalized.toString();
}

/**
 * Canonicalize a single value based on options
 */
function canonicalizeValue(
  value: unknown,
  options: CanonicalizeOptions = DEFAULT_OPTIONS
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    let result = value;
    if (options.normalizeWhitespace) {
      result = normalizeWhitespace(result);
    }
    if (options.lowerCase) {
      result = result.toLowerCase();
    }
    return result;
  }

  if (typeof value === 'number') {
    if (options.normalizeNumbers) {
      return normalizeNumber(value, options.decimalPlaces);
    }
    return value;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    if (options.recursive) {
      return value.map(item => canonicalizeValue(item, options));
    }
    return value;
  }

  if (typeof value === 'object') {
    if (options.recursive) {
      return canonicalizeObject(value as Record<string, unknown>, options);
    }
    return value;
  }

  return value;
}

/**
 * Canonicalize an object with sorting, normalization, and recursion
 */
function canonicalizeObject(
  obj: Record<string, unknown>,
  options: CanonicalizeOptions = DEFAULT_OPTIONS
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Get keys and sort if requested
  const keys = Object.keys(obj);
  const sortedKeys = options.sortKeys ? keys.sort() : keys;

  for (const key of sortedKeys) {
    const value = obj[key];
    result[key] = canonicalizeValue(value, options);
  }

  return result;
}

/**
 * Canonicalize input for signing/hashing
 *
 * Produces consistent canonical form for equivalent logical data.
 * Safe for use with JSON.stringify before signing/hashing.
 *
 * @example
 * ```typescript
 * const data = { name: "John", age: 30.1234567 };
 * const canonical = canonicalize(data);
 * // { age: "30.12345670", name: "John" }
 *
 * const stringified = JSON.stringify(canonical);
 * // Produces consistent hash regardless of input key order
 * ```
 */
export function canonicalize(
  input: unknown,
  options: Partial<CanonicalizeOptions> = {}
): unknown {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  if (Array.isArray(input)) {
    if (mergedOptions.recursive) {
      return input.map(item => canonicalizeValue(item, mergedOptions));
    }
    return input;
  }

  if (typeof input === 'object' && input !== null) {
    return canonicalizeObject(input as Record<string, unknown>, mergedOptions);
  }

  return canonicalizeValue(input, mergedOptions);
}

/**
 * Create a canonical JSON string suitable for signing/hashing
 *
 * @example
 * ```typescript
 * const signature = sign(canonicalJSON(data));
 * // Always produces same JSON string for equivalent data
 * ```
 */
export function canonicalJSON(input: unknown, options: Partial<CanonicalizeOptions> = {}): string {
  const canonical = canonicalize(input, options);
  return JSON.stringify(canonical);
}

/**
 * Verify that two inputs produce the same canonical form
 *
 * @returns true if inputs are canonically equivalent
 * @example
 * ```typescript
 * const a = { b: 1, a: 2 };
 * const b = { a: 2, b: 1 };
 * isCanonicallyEquivalent(a, b); // true
 * ```
 */
export function isCanonicallyEquivalent(
  input1: unknown,
  input2: unknown,
  options: Partial<CanonicalizeOptions> = {}
): boolean {
  try {
    return canonicalJSON(input1, options) === canonicalJSON(input2, options);
  } catch {
    return false;
  }
}

/**
 * Handle legacy record normalization for compatibility
 *
 * Transforms old record formats to current canonical form.
 * Supports gradual migration from non-canonical data.
 */
export interface LegacyRecord {
  version?: string | number;
  [key: string]: unknown;
}

/**
 * Normalize a legacy record to current schema
 *
 * Returns normalized record or null if format is unsupported.
 */
export function normalizeLegacyRecord(
  record: LegacyRecord,
  options: Partial<CanonicalizeOptions> = {}
): Record<string, unknown> | null {
  if (!record || typeof record !== 'object') {
    return null;
  }

  // Determine version and apply compatibility transforms
  const version = record.version || '1.0';

  let normalized = { ...record };

  // Version 1.x → 2.x compatibility transforms
  if (typeof version === 'string' && version.startsWith('1.')) {
    // Example legacy transforms:
    // - Remove deprecated fields
    // - Rename fields
    // - Convert data types
    const { version: _, ...withoutVersion } = normalized;
    normalized = withoutVersion;
  }

  // Apply canonicalization
  const canonical = canonicalize(normalized, options);

  return typeof canonical === 'object' && canonical !== null
    ? (canonical as Record<string, unknown>)
    : null;
}

/**
 * Validate that input can be canonicalized without errors
 */
export function isCanonicalizable(input: unknown): boolean {
  try {
    canonicalize(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract canonicalization errors from problematic input
 */
export function getCanonicalizeError(input: unknown): Error | null {
  try {
    canonicalize(input);
    return null;
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}
