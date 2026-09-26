/**
 * Optimistic Concurrency Control
 *
 * Manages cross-device session continuity with version tokens and conflict detection.
 */

export interface VersionToken {
  resourceId: string;
  version: number;
  timestamp: number;
  deviceId: string;
  checksum: string;
}

export interface ConflictInfo {
  resourceId: string;
  currentVersion: number;
  attemptedVersion: number;
  serverVersion: number;
  conflictType: "stale_write" | "concurrent_edit" | "deleted";
  timestamp: number;
}

export interface RecoveryAction {
  type: "retry" | "refresh" | "merge" | "discard";
  description: string;
}

/**
 * Generates a stable checksum for data
 */
function generateChecksum(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Creates a version token for a resource
 */
export function createVersionToken(
  resourceId: string,
  version: number,
  deviceId: string,
  data: unknown,
): VersionToken {
  return {
    resourceId,
    version,
    timestamp: Date.now(),
    deviceId,
    checksum: generateChecksum(data),
  };
}

/**
 * Verifies if a version token is still valid
 */
export function isVersionStale(
  token: VersionToken,
  currentServerVersion: number,
): boolean {
  return token.version < currentServerVersion;
}

/**
 * Detects conflicts between concurrent edits
 */
export function detectConflict(
  localVersion: number,
  serverVersion: number,
  deviceId: string,
  serverDeviceId: string,
): ConflictInfo | null {
  if (localVersion < serverVersion) {
    return {
      resourceId: "",
      currentVersion: serverVersion,
      attemptedVersion: localVersion,
      serverVersion,
      conflictType: "stale_write",
      timestamp: Date.now(),
    };
  }

  if (localVersion === serverVersion && deviceId !== serverDeviceId) {
    return {
      resourceId: "",
      currentVersion: serverVersion,
      attemptedVersion: localVersion,
      serverVersion,
      conflictType: "concurrent_edit",
      timestamp: Date.now(),
    };
  }

  return null;
}

/**
 * Gets recovery actions for a conflict
 */
export function getRecoveryActions(conflict: ConflictInfo): RecoveryAction[] {
  const actions: RecoveryAction[] = [];

  if (conflict.conflictType === "stale_write") {
    actions.push({
      type: "refresh",
      description: "Refresh to get the latest version",
    });
    actions.push({
      type: "retry",
      description: "Retry your changes on the latest version",
    });
  } else if (conflict.conflictType === "concurrent_edit") {
    actions.push({
      type: "refresh",
      description: "Refresh to see the latest changes",
    });
    actions.push({
      type: "merge",
      description: "Attempt to merge your changes",
    });
  } else if (conflict.conflictType === "deleted") {
    actions.push({
      type: "discard",
      description: "Discard your changes",
    });
  }

  return actions;
}

/**
 * Manages session continuity across devices
 */
export class SessionManager {
  private versions: Map<string, VersionToken> = new Map();
  private deviceId: string;

  constructor(deviceId?: string) {
    this.deviceId = deviceId || this.generateDeviceId();
  }

  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setVersion(token: VersionToken): void {
    this.versions.set(token.resourceId, token);
  }

  getVersion(resourceId: string): VersionToken | undefined {
    return this.versions.get(resourceId);
  }

  clearVersion(resourceId: string): void {
    this.versions.delete(resourceId);
  }

  getDeviceId(): string {
    return this.deviceId;
  }

  getAllVersions(): VersionToken[] {
    return Array.from(this.versions.values());
  }

  reset(): void {
    this.versions.clear();
  }
}
