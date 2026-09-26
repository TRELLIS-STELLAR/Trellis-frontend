import {
  createVersionToken,
  isVersionStale,
  detectConflict,
  getRecoveryActions,
  SessionManager,
} from "../../../lib/concurrency";

describe("Concurrency Control", () => {
  describe("Version Tokens", () => {
    it("should create a version token", () => {
      const token = createVersionToken("resource-1", 1, "device-1", { data: "test" });
      expect(token.resourceId).toBe("resource-1");
      expect(token.version).toBe(1);
      expect(token.deviceId).toBe("device-1");
      expect(token.checksum).toBeDefined();
    });

    it("should detect stale versions", () => {
      const token = createVersionToken("resource-1", 1, "device-1", { data: "test" });
      expect(isVersionStale(token, 2)).toBe(true);
      expect(isVersionStale(token, 1)).toBe(false);
    });
  });

  describe("Conflict Detection", () => {
    it("should detect stale write conflicts", () => {
      const conflict = detectConflict(1, 2, "device-1", "device-1");
      expect(conflict?.conflictType).toBe("stale_write");
    });

    it("should detect concurrent edit conflicts", () => {
      const conflict = detectConflict(1, 1, "device-1", "device-2");
      expect(conflict?.conflictType).toBe("concurrent_edit");
    });

    it("should not detect conflict when versions match and same device", () => {
      const conflict = detectConflict(1, 1, "device-1", "device-1");
      expect(conflict).toBeNull();
    });
  });

  describe("Recovery Actions", () => {
    it("should provide recovery for stale writes", () => {
      const conflict = {
        resourceId: "res-1",
        currentVersion: 2,
        attemptedVersion: 1,
        serverVersion: 2,
        conflictType: "stale_write" as const,
        timestamp: Date.now(),
      };
      const actions = getRecoveryActions(conflict);
      expect(actions.some((a) => a.type === "refresh")).toBe(true);
      expect(actions.some((a) => a.type === "retry")).toBe(true);
    });

    it("should provide recovery for concurrent edits", () => {
      const conflict = {
        resourceId: "res-1",
        currentVersion: 1,
        attemptedVersion: 1,
        serverVersion: 1,
        conflictType: "concurrent_edit" as const,
        timestamp: Date.now(),
      };
      const actions = getRecoveryActions(conflict);
      expect(actions.some((a) => a.type === "merge")).toBe(true);
    });
  });

  describe("Session Manager", () => {
    let manager: SessionManager;

    beforeEach(() => {
      manager = new SessionManager("device-1");
    });

    it("should generate device ID", () => {
      expect(manager.getDeviceId()).toBeDefined();
    });

    it("should store and retrieve versions", () => {
      const token = createVersionToken("resource-1", 1, "device-1", {});
      manager.setVersion(token);
      expect(manager.getVersion("resource-1")).toBe(token);
    });

    it("should clear versions", () => {
      const token = createVersionToken("resource-1", 1, "device-1", {});
      manager.setVersion(token);
      manager.clearVersion("resource-1");
      expect(manager.getVersion("resource-1")).toBeUndefined();
    });

    it("should manage multiple versions", () => {
      const token1 = createVersionToken("resource-1", 1, "device-1", {});
      const token2 = createVersionToken("resource-2", 1, "device-1", {});
      manager.setVersion(token1);
      manager.setVersion(token2);
      expect(manager.getAllVersions().length).toBe(2);
    });

    it("should reset all versions", () => {
      manager.setVersion(createVersionToken("resource-1", 1, "device-1", {}));
      manager.reset();
      expect(manager.getAllVersions().length).toBe(0);
    });
  });

  describe("Conflict Resolution", () => {
    it("should handle simultaneous edits", () => {
      const conflict1 = detectConflict(1, 1, "device-1", "device-2");
      const conflict2 = detectConflict(1, 1, "device-2", "device-1");
      expect(conflict1?.conflictType).toBe("concurrent_edit");
      expect(conflict2?.conflictType).toBe("concurrent_edit");
    });

    it("should distinguish between simultaneous edits and stale writes", () => {
      const simultaneous = detectConflict(2, 2, "device-1", "device-2");
      const stale = detectConflict(1, 2, "device-1", "device-1");
      expect(simultaneous?.conflictType).toBe("concurrent_edit");
      expect(stale?.conflictType).toBe("stale_write");
    });
  });
});
