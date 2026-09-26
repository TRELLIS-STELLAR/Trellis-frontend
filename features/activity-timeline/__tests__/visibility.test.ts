import { isEventVisible, TimelineEvent } from "../types";

describe("Timeline Event Visibility", () => {
  const createEvent = (visibility: "public" | "private" | "maintainer_only"): TimelineEvent => ({
    id: "test-1",
    userId: "user-1",
    type: "claim_settled",
    visibility,
    timestamp: Date.now(),
    title: "Test Event",
    description: "Test description",
  });

  describe("isEventVisible", () => {
    it("should hide maintainer_only events from users", () => {
      const event = createEvent("maintainer_only");
      expect(isEventVisible(event, false)).toBe(false);
      expect(isEventVisible(event, true)).toBe(false);
    });

    it("should show public events in all views", () => {
      const event = createEvent("public");
      expect(isEventVisible(event, false)).toBe(true);
      expect(isEventVisible(event, true)).toBe(true);
    });

    it("should show private events only in user view", () => {
      const event = createEvent("private");
      expect(isEventVisible(event, false)).toBe(true);
      expect(isEventVisible(event, true)).toBe(false);
    });
  });

  describe("deleted records", () => {
    it("should handle soft-deleted events", () => {
      const event: TimelineEvent = {
        id: "deleted-1",
        userId: "user-1",
        type: "claim_rejected",
        visibility: "private",
        timestamp: Date.now(),
        title: "Deleted Claim",
        description: "This claim was removed",
        metadata: { deletedAt: Date.now(), reason: "privacy_request" },
      };
      expect(isEventVisible(event, false)).toBe(true);
    });
  });

  describe("restricted records", () => {
    it("should filter restricted records based on visibility", () => {
      const restrictedEvent: TimelineEvent = {
        id: "restricted-1",
        userId: "user-1",
        type: "verification_completed",
        visibility: "private",
        timestamp: Date.now(),
        title: "Restricted Verification",
        description: "Contains sensitive data",
        metadata: { restricted: true, restrictedUntil: new Date().toISOString() },
      };
      expect(isEventVisible(restrictedEvent, false)).toBe(true);
      expect(isEventVisible(restrictedEvent, true)).toBe(false);
    });
  });
});
