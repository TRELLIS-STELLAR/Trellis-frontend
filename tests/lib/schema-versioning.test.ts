import {
  compareVersions,
  isValidVersion,
  defineSchema,
  getCurrentSchemaVersion,
  getSupportedSchemaVersions,
  isSchemaVersionSupported,
  migrateRecord,
  normalizeRecord,
  validateRecord,
  prepareRecordForWrite,
  readRecord,
  normalizeAPIResponse,
  isClientVersionCompatible,
  getClientCompatibilityWarnings,
  defineMigrationStrategy,
  getMigrationStrategy,
  initializeDefaultSchemas,
} from '@/lib/schema-versioning';
import type { Record, SchemaDefinition } from '@/lib/schema-versioning';

describe('Schema Versioning', () => {
  describe('compareVersions', () => {
    it('correctly compares versions', () => {
      expect(compareVersions('1.0', '2.0')).toBe(-1);
      expect(compareVersions('2.0', '1.0')).toBe(1);
      expect(compareVersions('1.0', '1.0')).toBe(0);
    });

    it('handles patch versions', () => {
      expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
      expect(compareVersions('1.1.0', '1.0.0')).toBe(1);
    });

    it('pads missing version parts', () => {
      expect(compareVersions('1.0', '1.0.0')).toBe(0);
      expect(compareVersions('2.0', '1.9.9')).toBe(1);
    });
  });

  describe('isValidVersion', () => {
    it('accepts valid version formats', () => {
      expect(isValidVersion('1.0')).toBe(true);
      expect(isValidVersion('2.1')).toBe(true);
      expect(isValidVersion('1.0.0')).toBe(true);
      expect(isValidVersion('10.20.30')).toBe(true);
    });

    it('rejects invalid version formats', () => {
      expect(isValidVersion('1')).toBe(false);
      expect(isValidVersion('1.0.0.0')).toBe(false);
      expect(isValidVersion('v1.0')).toBe(false);
      expect(isValidVersion('1.a')).toBe(false);
    });
  });

  describe('Schema Registration', () => {
    beforeEach(() => {
      initializeDefaultSchemas();
    });

    it('registers schema versions', () => {
      const versions = getSupportedSchemaVersions();
      expect(versions).toContain('1.0');
      expect(versions).toContain('2.0');
    });

    it('rejects invalid version format', () => {
      expect(() => {
        defineSchema({
          version: 'invalid',
          description: 'test',
          fields: {},
        });
      }).toThrow();
    });

    it('tracks current version as highest registered', () => {
      expect(getCurrentSchemaVersion()).toBe('2.0');
    });

    it('checks version support', () => {
      expect(isSchemaVersionSupported('1.0')).toBe(true);
      expect(isSchemaVersionSupported('2.0')).toBe(true);
      expect(isSchemaVersionSupported('3.0')).toBe(false);
    });
  });

  describe('migrateRecord', () => {
    beforeEach(() => {
      initializeDefaultSchemas();
    });

    it('returns same record if versions match', () => {
      const record: Record = {
        id: 'test-1',
        schemaVersion: '1.0',
      };

      const result = migrateRecord(record, '1.0');
      expect(result?.schemaVersion).toBe('1.0');
    });

    it('upgrades record to newer version', () => {
      const record: Record = {
        id: 'test-1',
        schemaVersion: '1.0',
      };

      const result = migrateRecord(record, '2.0');
      expect(result).toBeDefined();
      expect(result?.schemaVersion).toBe('2.0');
    });

    it('applies transforms during migration', () => {
      const record: Record = {
        id: 'test-1',
        schemaVersion: '1.0',
      };

      const result = migrateRecord(record, '2.0');
      expect(result?.migratedAt).toBeDefined();
      expect(result?.previousVersion).toBe('1.0');
    });

    it('handles missing schemaVersion in input', () => {
      const record: any = {
        id: 'test-1',
        // no schemaVersion
      };

      const result = migrateRecord(record, '2.0');
      expect(result).toBeDefined();
      expect(result?.schemaVersion).toBe('2.0');
    });

    it('returns null for unsupported target version', () => {
      const record: Record = {
        id: 'test-1',
        schemaVersion: '1.0',
      };

      const result = migrateRecord(record, '99.0');
      expect(result).toBeNull();
    });

    it('returns null for downgrade attempt', () => {
      const record: Record = {
        id: 'test-1',
        schemaVersion: '2.0',
      };

      const result = migrateRecord(record, '1.0');
      expect(result).toBeNull();
    });
  });

  describe('normalizeRecord', () => {
    beforeEach(() => {
      initializeDefaultSchemas();
    });

    it('migrates to current version', () => {
      const record: Record = {
        id: 'test-1',
        schemaVersion: '1.0',
      };

      const result = normalizeRecord(record);
      expect(result.schemaVersion).toBe(getCurrentSchemaVersion());
    });

    it('preserves already normalized records', () => {
      const record: Record = {
        id: 'test-1',
        schemaVersion: '2.0',
      };

      const result = normalizeRecord(record);
      expect(result.schemaVersion).toBe('2.0');
    });
  });

  describe('validateRecord', () => {
    beforeEach(() => {
      initializeDefaultSchemas();

      // Define schema with required fields
      defineSchema({
        version: '3.0',
        description: 'Test schema with requirements',
        fields: {
          id: { type: 'string', required: true },
          name: { type: 'string', required: true },
          email: { type: 'string', required: false },
          schemaVersion: { type: 'string', required: true },
        },
      });
    });

    it('validates record with all required fields', () => {
      const record: Record = {
        id: 'test-1',
        name: 'John Doe',
        schemaVersion: '3.0',
      };

      const result = validateRecord(record);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects missing required fields', () => {
      const record: Record = {
        id: 'test-1',
        schemaVersion: '3.0',
        // missing 'name'
      };

      const result = validateRecord(record);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: name');
    });

    it('allows missing optional fields', () => {
      const record: Record = {
        id: 'test-1',
        name: 'John Doe',
        schemaVersion: '3.0',
        // email not required
      };

      const result = validateRecord(record);
      expect(result.valid).toBe(true);
    });

    it('fails for unsupported schema version', () => {
      const record: Record = {
        id: 'test-1',
        schemaVersion: '99.0',
      };

      const result = validateRecord(record);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not found'))).toBe(true);
    });
  });

  describe('prepareRecordForWrite', () => {
    beforeEach(() => {
      initializeDefaultSchemas();
    });

    it('adds schema version to record', () => {
      const data = { id: 'test-1', name: 'Test' };
      const result = prepareRecordForWrite(data);

      expect(result.schemaVersion).toBeDefined();
      expect(result.schemaVersion).toBe(getCurrentSchemaVersion());
    });

    it('uses specified version if provided', () => {
      const data = { id: 'test-1', name: 'Test' };
      const result = prepareRecordForWrite(data, '1.0');

      expect(result.schemaVersion).toBe('1.0');
    });

    it('applies write transforms', () => {
      defineSchema({
        version: '3.0',
        description: 'Schema with write transform',
        fields: { id: { type: 'string' } },
        transformTo: (data: any) => ({
          ...data,
          processed: true,
          processedAt: Date.now(),
        }),
      });

      const data = { id: 'test-1' };
      const result = prepareRecordForWrite(data, '3.0');

      expect(result.processed).toBe(true);
      expect(result.processedAt).toBeDefined();
    });

    it('throws for unsupported version', () => {
      expect(() => {
        prepareRecordForWrite({ id: 'test-1' }, '99.0');
      }).toThrow();
    });
  });

  describe('readRecord', () => {
    beforeEach(() => {
      initializeDefaultSchemas();
    });

    it('reads and normalizes record', () => {
      const data = {
        id: 'test-1',
        schemaVersion: '1.0',
      };

      const result = readRecord(data, true);
      expect(result).toBeDefined();
      expect(result?.schemaVersion).toBe('2.0');
    });

    it('returns null for invalid input', () => {
      expect(readRecord(null)).toBeNull();
      expect(readRecord(undefined)).toBeNull();
      expect(readRecord('string')).toBeNull();
    });

    it('respects autoMigrate flag', () => {
      const data = {
        id: 'test-1',
        schemaVersion: '1.0',
      };

      const result = readRecord(data, false);
      expect(result?.schemaVersion).toBe('1.0');
    });

    it('returns null for unsupported version without autoMigrate', () => {
      const data = {
        id: 'test-1',
        schemaVersion: '99.0',
      };

      const result = readRecord(data, false);
      expect(result).toBeNull();
    });
  });

  describe('normalizeAPIResponse', () => {
    beforeEach(() => {
      initializeDefaultSchemas();
    });

    it('normalizes array of records with mixed versions', () => {
      const responses = [
        { id: 'test-1', schemaVersion: '1.0' },
        { id: 'test-2', schemaVersion: '2.0' },
        { id: 'test-3', schemaVersion: '1.0' },
      ];

      const result = normalizeAPIResponse(responses);
      expect(result).toHaveLength(3);
      expect(result.every(r => r.schemaVersion === '2.0')).toBe(true);
    });

    it('filters out invalid records', () => {
      const responses = [
        { id: 'test-1', schemaVersion: '1.0' },
        null,
        { id: 'test-2', schemaVersion: '1.0' },
      ];

      const result = normalizeAPIResponse(responses);
      expect(result).toHaveLength(2);
    });
  });

  describe('Client Compatibility', () => {
    beforeEach(() => {
      initializeDefaultSchemas();
    });

    it('allows compatible client versions', () => {
      expect(isClientVersionCompatible('2.0')).toBe(true);
      expect(isClientVersionCompatible('1.0')).toBe(true);
    });

    it('rejects incompatible client versions', () => {
      expect(isClientVersionCompatible('99.0')).toBe(false);
      expect(isClientVersionCompatible('invalid')).toBe(false);
    });

    it('provides compatibility warnings for outdated clients', () => {
      const warnings = getClientCompatibilityWarnings('1.0');
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some(w => w.includes('outdated'))).toBe(true);
    });

    it('provides warnings for version mismatch', () => {
      const warnings = getClientCompatibilityWarnings('99.0');
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some(w => w.includes('not supported'))).toBe(true);
    });
  });

  describe('Migration Strategies', () => {
    beforeEach(() => {
      initializeDefaultSchemas();
    });

    it('documents migration strategies', () => {
      defineMigrationStrategy({
        fromVersion: '2.0',
        toVersion: '3.0',
        description: 'Add new fields',
        newFeatures: ['customField'],
      });

      const strategy = getMigrationStrategy('2.0', '3.0');
      expect(strategy).toBeDefined();
      expect(strategy?.description).toBe('Add new fields');
    });

    it('returns null for unknown strategy', () => {
      const strategy = getMigrationStrategy('1.0', '99.0');
      expect(strategy).toBeNull();
    });
  });

  describe('Integration - Full Lifecycle', () => {
    beforeEach(() => {
      initializeDefaultSchemas();
    });

    it('handles complete data flow: write, read, migrate', () => {
      // 1. Prepare data for write
      const inputData = { id: 'claim-1', amount: 100 };
      const prepared = prepareRecordForWrite(inputData);

      expect(prepared.schemaVersion).toBeDefined();

      // 2. Simulate storage and retrieval
      const stored = JSON.parse(JSON.stringify(prepared));

      // 3. Read and normalize
      const read = readRecord(stored, true);

      expect(read).toBeDefined();
      expect(read?.schemaVersion).toBe(getCurrentSchemaVersion());
      expect(read?.id).toBe('claim-1');
    });

    it('handles legacy record compatibility', () => {
      // Old record from system using version 1.0
      const legacyRecord: Record = {
        id: 'old-claim',
        schemaVersion: '1.0',
        amount: 100,
      };

      // New code expects current version
      const normalized = normalizeRecord(legacyRecord);

      expect(normalized.schemaVersion).toBe(getCurrentSchemaVersion());
      expect(normalized.id).toBe('old-claim');
      expect(normalized.amount).toBe(100);
      expect(normalized.migratedAt).toBeDefined();
    });

    it('validates migrated records', () => {
      const oldRecord: Record = {
        id: 'claim-1',
        schemaVersion: '1.0',
      };

      const migrated = migrateRecord(oldRecord, '2.0');
      expect(migrated).toBeDefined();

      const validation = validateRecord(migrated!);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    beforeEach(() => {
      initializeDefaultSchemas();
    });

    it('preserves existing data during migration', () => {
      const record: Record = {
        id: 'test-1',
        schemaVersion: '1.0',
        customField: 'custom-value',
        amount: 100,
      };

      const migrated = migrateRecord(record, '2.0');

      expect(migrated?.customField).toBe('custom-value');
      expect(migrated?.amount).toBe(100);
    });

    it('handles records missing version gracefully', () => {
      const unversioned: any = {
        id: 'test-1',
        data: 'some-data',
      };

      const result = readRecord(unversioned);
      expect(result).toBeDefined();
      expect(result?.schemaVersion).toBe(getCurrentSchemaVersion());
    });
  });
});
