/**
 * Schema Versioning and Compatibility Layer
 *
 * Enables version-aware handling so older clients, migrated records,
 * and new schema fields can coexist safely during rollout.
 *
 * Supports:
 * - Schema version metadata
 * - Compatibility transforms for read and write paths
 * - Deprecation and migration strategies
 * - Backward and forward compatibility
 */

export type SchemaVersion = string;

export interface VersionMetadata {
  /** Schema version (e.g., "1.0", "2.0", "2.1") */
  schemaVersion: SchemaVersion;
  /** Timestamp when record was migrated to this schema */
  migratedAt?: number;
  /** Previous schema version if migrated */
  previousVersion?: SchemaVersion;
}

export interface Record<T = any> extends VersionMetadata {
  id: string;
  [key: string]: any;
}

/**
 * Semantic version comparison
 */
export function compareVersions(v1: SchemaVersion, v2: SchemaVersion): -1 | 0 | 1 {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }

  return 0;
}

/**
 * Check if version is valid (X.Y or X.Y.Z format)
 */
export function isValidVersion(version: string): boolean {
  return /^\d+\.\d+(\.\d+)?$/.test(version);
}

/**
 * Transform function type: (data) => transformed data
 */
export type TransformFn = (data: any) => any;

/**
 * Schema definition with transforms
 */
export interface SchemaDefinition {
  version: SchemaVersion;
  description: string;
  fields: Record<string, { type: string; required?: boolean; description?: string }>;
  /** Transform to convert from previous version */
  transformFrom?: (previousVersion: SchemaVersion, data: any) => any;
  /** Transform before writing to this version */
  transformTo?: (data: any) => any;
}

/**
 * Version compatibility catalog
 */
class SchemaVersionCatalog {
  private schemas: Map<SchemaVersion, SchemaDefinition> = new Map();
  private currentVersion: SchemaVersion = '1.0';

  /**
   * Register a schema version
   */
  registerSchema(definition: SchemaDefinition): void {
    if (!isValidVersion(definition.version)) {
      throw new Error(`Invalid schema version: ${definition.version}`);
    }

    this.schemas.set(definition.version, definition);

    // Track current version (highest)
    if (compareVersions(definition.version, this.currentVersion) > 0) {
      this.currentVersion = definition.version;
    }
  }

  /**
   * Get schema definition for version
   */
  getSchema(version: SchemaVersion): SchemaDefinition | null {
    return this.schemas.get(version) || null;
  }

  /**
   * Get current/latest schema version
   */
  getCurrentVersion(): SchemaVersion {
    return this.currentVersion;
  }

  /**
   * List all registered versions
   */
  getVersions(): SchemaVersion[] {
    return Array.from(this.schemas.keys()).sort(
      (a, b) => compareVersions(a, b) as any
    );
  }

  /**
   * Check if version is supported
   */
  isVersionSupported(version: SchemaVersion): boolean {
    return this.schemas.has(version);
  }

  /**
   * Get deprecation status for a version
   */
  getDeprecationInfo(version: SchemaVersion): {
    deprecated: boolean;
    deprecatedSince?: SchemaVersion;
    sunsetDate?: number;
  } {
    const schema = this.getSchema(version);
    if (!schema) {
      return { deprecated: true };
    }

    const current = this.getCurrentVersion();
    const isOld = compareVersions(version, current) < 0;

    return {
      deprecated: isOld,
      deprecatedSince: isOld ? current : undefined,
    };
  }
}

// Global catalog instance
const catalog = new SchemaVersionCatalog();

/**
 * Create and register a schema version
 */
export function defineSchema(definition: SchemaDefinition): void {
  catalog.registerSchema(definition);
}

/**
 * Get current schema version
 */
export function getCurrentSchemaVersion(): SchemaVersion {
  return catalog.getCurrentVersion();
}

/**
 * Get all supported schema versions
 */
export function getSupportedSchemaVersions(): SchemaVersion[] {
  return catalog.getVersions();
}

/**
 * Check if a schema version is supported
 */
export function isSchemaVersionSupported(version: SchemaVersion): boolean {
  return catalog.isVersionSupported(version);
}

/**
 * Migrate a record from one schema version to another
 *
 * Automatically applies transforms in sequence.
 * Returns null if version is unsupported.
 */
export function migrateRecord(
  record: Record,
  targetVersion: SchemaVersion
): Record | null {
  const currentVersion = record.schemaVersion || '1.0';

  // No migration needed
  if (currentVersion === targetVersion) {
    return record;
  }

  // Check if target is supported
  if (!isSchemaVersionSupported(targetVersion)) {
    console.warn(`Target schema version not supported: ${targetVersion}`);
    return null;
  }

  // Check if current version is supported
  if (!isSchemaVersionSupported(currentVersion)) {
    console.warn(`Current schema version not supported: ${currentVersion}`);
    return null;
  }

  let result = { ...record };
  const versions = catalog.getVersions();

  // Determine migration direction
  const isUpgrade = compareVersions(currentVersion, targetVersion) < 0;

  if (isUpgrade) {
    // Upgrade: apply transforms forward
    const fromIndex = versions.indexOf(currentVersion);
    const toIndex = versions.indexOf(targetVersion);

    for (let i = fromIndex + 1; i <= toIndex; i++) {
      const versionToApply = versions[i];
      const schema = catalog.getSchema(versionToApply);

      if (schema?.transformFrom) {
        const previousVersion = versions[i - 1];
        try {
          result = schema.transformFrom(previousVersion, result);
          result.schemaVersion = versionToApply;
          result.migratedAt = Date.now();
          result.previousVersion = previousVersion;
        } catch (error) {
          console.error(
            `Failed to migrate from ${previousVersion} to ${versionToApply}:`,
            error
          );
          return null;
        }
      }
    }
  } else {
    // Downgrade: apply reverse transforms
    console.warn(`Schema downgrade requested from ${currentVersion} to ${targetVersion}`);
    // Downgrades are not recommended and not implemented in this version
    return null;
  }

  return result;
}

/**
 * Normalize a record to current schema version
 *
 * Automatically migrates to latest version if needed.
 */
export function normalizeRecord(record: Record): Record {
  const currentVersion = record.schemaVersion || '1.0';
  const targetVersion = getCurrentSchemaVersion();

  if (currentVersion === targetVersion) {
    return record;
  }

  const migrated = migrateRecord(record, targetVersion);
  return migrated || record;
}

/**
 * Validate record matches schema for its version
 */
export function validateRecord(record: Record): {
  valid: boolean;
  errors: string[];
} {
  const version = record.schemaVersion || '1.0';
  const schema = catalog.getSchema(version);

  if (!schema) {
    return {
      valid: false,
      errors: [`Schema version ${version} not found`],
    };
  }

  const errors: string[] = [];

  // Check required fields
  for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
    if (fieldDef.required && !(fieldName in record)) {
      errors.push(`Missing required field: ${fieldName}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Prepare record for writing to storage
 *
 * Applies write transforms and ensures version metadata.
 */
export function prepareRecordForWrite(data: any, version?: SchemaVersion): Record {
  const targetVersion = version || getCurrentSchemaVersion();
  const schema = catalog.getSchema(targetVersion);

  if (!schema) {
    throw new Error(`Schema version not found: ${targetVersion}`);
  }

  let prepared = {
    ...data,
    schemaVersion: targetVersion,
  };

  // Apply write transform
  if (schema.transformTo) {
    try {
      prepared = schema.transformTo(prepared);
    } catch (error) {
      console.error(`Failed to prepare record for version ${targetVersion}:`, error);
      throw error;
    }
  }

  return prepared;
}

/**
 * Read and normalize record from storage
 *
 * Applies read transforms and ensures version is current.
 */
export function readRecord(
  data: any,
  autoMigrate: boolean = true
): Record | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const version = data.schemaVersion || '1.0';

  if (!isSchemaVersionSupported(version)) {
    console.warn(`Unsupported schema version when reading: ${version}`);
    if (!autoMigrate) {
      return null;
    }
  }

  if (autoMigrate) {
    return normalizeRecord(data);
  }

  return data;
}

/**
 * Handle API response that might have different schema versions
 *
 * Automatically detects and normalizes version differences.
 */
export function normalizeAPIResponse<T extends Record>(
  responses: any[]
): T[] {
  return responses
    .map(response => {
      const record = readRecord(response, true);
      return record as T;
    })
    .filter((record): record is T => record !== null);
}

/**
 * Migration strategy documentation helper
 */
export interface MigrationStrategy {
  fromVersion: SchemaVersion;
  toVersion: SchemaVersion;
  description: string;
  deprecatedFeatures?: string[];
  newFeatures?: string[];
  sunsetDate?: number;
}

const migrationStrategies: MigrationStrategy[] = [];

/**
 * Document a migration strategy
 */
export function defineMigrationStrategy(strategy: MigrationStrategy): void {
  migrationStrategies.push(strategy);
}

/**
 * Get migration path documentation
 */
export function getMigrationStrategy(
  fromVersion: SchemaVersion,
  toVersion: SchemaVersion
): MigrationStrategy | null {
  return (
    migrationStrategies.find(
      s => s.fromVersion === fromVersion && s.toVersion === toVersion
    ) || null
  );
}

/**
 * Get all active migration strategies
 */
export function getActiveMigrationStrategies(): MigrationStrategy[] {
  return migrationStrategies.filter(s => {
    if (!s.sunsetDate) return true;
    return s.sunsetDate > Date.now();
  });
}

/**
 * Check if client version is compatible with current API
 */
export function isClientVersionCompatible(clientVersion: SchemaVersion): boolean {
  if (!isValidVersion(clientVersion)) {
    return false;
  }

  if (!isSchemaVersionSupported(clientVersion)) {
    return false;
  }

  const current = getCurrentSchemaVersion();
  const versionDiff = compareVersions(clientVersion, current);

  // Allow clients up to 2 major versions behind
  const clientMajor = parseInt(clientVersion.split('.')[0]);
  const currentMajor = parseInt(current.split('.')[0]);

  return currentMajor - clientMajor <= 2;
}

/**
 * Get compatibility warnings for client
 */
export function getClientCompatibilityWarnings(
  clientVersion: SchemaVersion
): string[] {
  const warnings: string[] = [];

  if (!isValidVersion(clientVersion)) {
    warnings.push(`Invalid version format: ${clientVersion}`);
    return warnings;
  }

  if (!isSchemaVersionSupported(clientVersion)) {
    warnings.push(`Version ${clientVersion} is not supported`);
  }

  const current = getCurrentSchemaVersion();
  if (compareVersions(clientVersion, current) < 0) {
    warnings.push(
      `Client version ${clientVersion} is outdated. Current version: ${current}`
    );
  }

  if (compareVersions(clientVersion, current) > 0) {
    warnings.push(`Client version ${clientVersion} exceeds server version ${current}`);
  }

  return warnings;
}

/**
 * Initialize schema versioning with common schemas
 */
export function initializeDefaultSchemas(): void {
  // Schema 1.0 - Base schema
  defineSchema({
    version: '1.0',
    description: 'Base schema version',
    fields: {
      id: { type: 'string', required: true },
      schemaVersion: { type: 'string', required: true },
      createdAt: { type: 'number', required: true },
    },
  });

  // Schema 2.0 - Added migrations metadata
  defineSchema({
    version: '2.0',
    description: 'Enhanced schema with migration tracking',
    fields: {
      id: { type: 'string', required: true },
      schemaVersion: { type: 'string', required: true },
      createdAt: { type: 'number', required: true },
      migratedAt: { type: 'number' },
      previousVersion: { type: 'string' },
    },
    transformFrom: (previousVersion: string, data: any) => {
      return {
        ...data,
        migratedAt: Date.now(),
        previousVersion,
      };
    },
  });

  // Define migration strategy documentation
  defineMigrationStrategy({
    fromVersion: '1.0',
    toVersion: '2.0',
    description: 'Add migration tracking metadata',
    newFeatures: ['migratedAt', 'previousVersion'],
    sunsetDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

// Auto-initialize default schemas on module load
initializeDefaultSchemas();
