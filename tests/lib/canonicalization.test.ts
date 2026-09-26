import {
  canonicalize,
  canonicalJSON,
  isCanonicallyEquivalent,
  normalizeWhitespace,
  normalizeNumber,
  normalizeLegacyRecord,
  isCanonicalizable,
  getCanonicalizeError,
} from '@/lib/canonicalization';

describe('Canonicalization', () => {
  describe('normalizeWhitespace', () => {
    it('trims leading and trailing whitespace', () => {
      expect(normalizeWhitespace('  hello  ')).toBe('hello');
    });

    it('collapses multiple spaces to single space', () => {
      expect(normalizeWhitespace('hello   world')).toBe('hello world');
    });

    it('handles tabs and newlines', () => {
      expect(normalizeWhitespace('hello\t\nworld')).toBe('hello world');
    });
  });

  describe('normalizeNumber', () => {
    it('formats numbers to specified decimal places', () => {
      expect(normalizeNumber(30.123456789, 8)).toBe('30.12345679');
    });

    it('preserves whole numbers', () => {
      expect(normalizeNumber(42, 8)).toBe('42');
    });

    it('rounds correctly', () => {
      expect(normalizeNumber(1.9999999, 8)).toBe('2');
    });

    it('throws on invalid numbers', () => {
      expect(() => normalizeNumber(NaN, 8)).toThrow();
      expect(() => normalizeNumber(Infinity, 8)).toThrow();
    });
  });

  describe('canonicalize', () => {
    it('sorts object keys alphabetically', () => {
      const input = { z: 1, a: 2, m: 3 };
      const result = canonicalize(input);
      expect(Object.keys(result as any)).toEqual(['a', 'm', 'z']);
    });

    it('normalizes whitespace in strings', () => {
      const input = { name: '  John   Doe  ' };
      const result = canonicalize(input);
      expect((result as any).name).toBe('John Doe');
    });

    it('normalizes numeric precision', () => {
      const input = { amount: 30.123456789 };
      const result = canonicalize(input);
      expect((result as any).amount).toBe('30.12345679');
    });

    it('preserves null and undefined', () => {
      const input = { a: null, b: undefined };
      const result = canonicalize(input);
      expect((result as any).a).toBe(null);
      expect((result as any).b).toBe(undefined);
    });

    it('handles nested objects recursively', () => {
      const input = {
        user: { name: '  John  ', age: 30.5 },
        items: [{ id: 3, name: '  Item  ' }],
      };
      const result = canonicalize(input);
      expect((result as any).user.name).toBe('John');
      expect((result as any).user.age).toBe('30.50000000');
      expect((result as any).items[0].name).toBe('Item');
    });

    it('handles arrays recursively', () => {
      const input = [{ z: '  hello  ', a: 1 }, { z: '  world  ', a: 2 }];
      const result = canonicalize(input);
      expect((result as any)[0]).toEqual({ a: '1', z: 'hello' });
      expect((result as any)[1]).toEqual({ a: '2', z: 'world' });
    });

    it('respects custom options', () => {
      const input = { Name: 'John' };
      const result = canonicalize(input, { lowerCase: true });
      expect((result as any).Name).toBe('john');
    });

    it('handles custom decimal places', () => {
      const input = { amount: 30.123456789 };
      const result = canonicalize(input, { decimalPlaces: 2 });
      expect((result as any).amount).toBe('30.12');
    });
  });

  describe('canonicalJSON', () => {
    it('produces JSON with sorted keys', () => {
      const input1 = { z: 1, a: 2 };
      const input2 = { a: 2, z: 1 };
      expect(canonicalJSON(input1)).toBe(canonicalJSON(input2));
    });

    it('produces consistent output for equivalent data', () => {
      const data1 = { amount: 10.1 };
      const data2 = { amount: 10.10000000 };
      expect(canonicalJSON(data1)).toBe(canonicalJSON(data2));
    });

    it('includes normalized whitespace', () => {
      const input = { message: '  hello  ' };
      const json = canonicalJSON(input);
      expect(json).toContain('"hello"');
    });
  });

  describe('isCanonicallyEquivalent', () => {
    it('returns true for equivalent inputs with different key ordering', () => {
      const a = { b: 1, a: 2 };
      const b = { a: 2, b: 1 };
      expect(isCanonicallyEquivalent(a, b)).toBe(true);
    });

    it('returns true for different whitespace but same values', () => {
      const a = { name: 'John' };
      const b = { name: '  John  ' };
      expect(isCanonicallyEquivalent(a, b)).toBe(true);
    });

    it('returns false for different values', () => {
      const a = { name: 'John' };
      const b = { name: 'Jane' };
      expect(isCanonicallyEquivalent(a, b)).toBe(false);
    });

    it('returns true for equivalent numeric precision', () => {
      const a = { amount: 10.1234567 };
      const b = { amount: 10.12345670 };
      expect(isCanonicallyEquivalent(a, b)).toBe(true);
    });

    it('returns true for nested structures', () => {
      const a = { user: { name: '  John  ', age: 30 } };
      const b = { user: { name: 'John', age: 30.0 } };
      expect(isCanonicallyEquivalent(a, b)).toBe(true);
    });

    it('returns false for different nested values', () => {
      const a = { user: { name: 'John', age: 30 } };
      const b = { user: { name: 'John', age: 31 } };
      expect(isCanonicallyEquivalent(a, b)).toBe(false);
    });
  });

  describe('normalizeLegacyRecord', () => {
    it('normalizes version 1.x records', () => {
      const legacy = { version: '1.0', name: '  John  ', amount: 30.5 };
      const normalized = normalizeLegacyRecord(legacy);
      expect(normalized).toBeDefined();
      expect(normalized?.name).toBe('John');
    });

    it('removes version field from normalized records', () => {
      const legacy = { version: '1.0', name: 'John' };
      const normalized = normalizeLegacyRecord(legacy);
      expect(normalized?.version).toBeUndefined();
    });

    it('handles records without version', () => {
      const legacy = { name: '  John  ' };
      const normalized = normalizeLegacyRecord(legacy);
      expect(normalized?.name).toBe('John');
    });

    it('returns null for invalid input', () => {
      expect(normalizeLegacyRecord(null as any)).toBeNull();
      expect(normalizeLegacyRecord(undefined as any)).toBeNull();
      expect(normalizeLegacyRecord('string' as any)).toBeNull();
    });

    it('applies canonicalization to result', () => {
      const legacy = { z: 1, a: 2, name: '  John  ' };
      const normalized = normalizeLegacyRecord(legacy);
      const keys = Object.keys(normalized || {});
      expect(keys).toEqual(['a', 'name', 'z']);
    });
  });

  describe('isCanonicalizable', () => {
    it('returns true for valid inputs', () => {
      expect(isCanonicalizable({ a: 1 })).toBe(true);
      expect(isCanonicalizable('string')).toBe(true);
      expect(isCanonicalizable(42)).toBe(true);
      expect(isCanonicalizable([1, 2, 3])).toBe(true);
    });

    it('handles circular references gracefully', () => {
      const circular: any = { a: 1 };
      circular.self = circular;
      // Should not throw, but return false due to JSON.stringify limitation
      expect(isCanonicalizable(circular)).toBe(false);
    });
  });

  describe('getCanonicalizeError', () => {
    it('returns null for valid input', () => {
      expect(getCanonicalizeError({ a: 1 })).toBeNull();
    });

    it('returns error for invalid input', () => {
      const circular: any = { a: 1 };
      circular.self = circular;
      const error = getCanonicalizeError(circular);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('Signing and Hashing Use Case', () => {
    it('produces consistent hash for equivalent payloads', () => {
      const payload1 = { amount: '100', recipient: 'alice', nonce: 1 };
      const payload2 = { nonce: 1, amount: '100', recipient: 'alice' };

      const json1 = canonicalJSON(payload1);
      const json2 = canonicalJSON(payload2);

      expect(json1).toBe(json2);
      // Both would produce same hash
      expect(Buffer.from(json1).toString('base64')).toBe(
        Buffer.from(json2).toString('base64')
      );
    });

    it('detects payload tampering via different canonical form', () => {
      const original = { amount: 100, fee: 1 };
      const tampered = { amount: 100.00001, fee: 1 };

      expect(isCanonicallyEquivalent(original, tampered)).toBe(false);
      expect(canonicalJSON(original) !== canonicalJSON(tampered)).toBe(true);
    });

    it('handles decimal precision consistently for blockchain values', () => {
      const tx1 = { amount: 10.12345678 };
      const tx2 = { amount: 10.123456780 };

      expect(isCanonicallyEquivalent(tx1, tx2)).toBe(true);
      expect(canonicalJSON(tx1)).toBe(canonicalJSON(tx2));
    });
  });

  describe('Backward Compatibility', () => {
    it('maintains compatibility with old record formats', () => {
      const oldRecord = {
        version: '1.0',
        claim_id: 'abc123',
        recipient_addr: '  GXXX...  ',
        amount_xlm: '100.5',
      };

      const normalized = normalizeLegacyRecord(oldRecord);
      expect(normalized).toBeDefined();
      expect(typeof normalized).toBe('object');
    });
  });
});
