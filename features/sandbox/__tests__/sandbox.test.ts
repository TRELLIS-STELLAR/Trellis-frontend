import { sandboxManager } from "../../../lib/sandbox";
import {
  MockStellarAdapter,
  MockVerificationAdapter,
  MockIPFSAdapter,
} from "../../../lib/sandbox-adapters";
import { getFixture, listFixtures } from "../../../lib/sandbox-fixtures";

describe("Sandbox Mode", () => {
  beforeEach(() => {
    sandboxManager.reset();
  });

  describe("Configuration", () => {
    it("should initialize sandbox with default settings", () => {
      sandboxManager.initialize();
      expect(sandboxManager.isEnabled()).toBe(false);
    });

    it("should enable sandbox mode", () => {
      sandboxManager.initialize({ enabled: true, mode: "enabled" });
      expect(sandboxManager.isEnabled()).toBe(true);
    });

    it("should support mock-only mode", () => {
      sandboxManager.initialize({ enabled: true, mode: "mock_only" });
      expect(sandboxManager.isMockOnly()).toBe(true);
    });
  });

  describe("Service Adapters", () => {
    beforeEach(() => {
      sandboxManager.initialize({ enabled: true, mockExternalServices: true, logRequests: true });
    });

    it("should mock Stellar adapter calls", async () => {
      const response = await MockStellarAdapter.getBalance(
        "GBPYXYX5VKRK7KXKHM5CVJWYFQKKMHUXU5VWKJZAWLAQJ6WT3JPSMYD7",
      );
      expect(response.success).toBe(true);
      expect(response.data?.balance).toBeDefined();
    });

    it("should mock verification adapter calls", async () => {
      const response = await MockVerificationAdapter.verify({});
      expect(response.success).toBe(true);
      expect(response.data?.verified).toBeDefined();
    });

    it("should mock IPFS adapter calls", async () => {
      const response = await MockIPFSAdapter.upload({});
      expect(response.success).toBe(true);
      expect(response.data?.hash).toBeDefined();
    });

    it("should return deterministic responses", async () => {
      const response1 = await MockStellarAdapter.getBalance(
        "GBPYXYX5VKRK7KXKHM5CVJWYFQKKMHUXU5VWKJZAWLAQJ6WT3JPSMYD7",
      );
      const response2 = await MockStellarAdapter.getBalance(
        "GBPYXYX5VKRK7KXKHM5CVJWYFQKKMHUXU5VWKJZAWLAQJ6WT3JPSMYD7",
      );
      expect(response1.data?.balance).toBe(response2.data?.balance);
    });
  });

  describe("Fixtures", () => {
    it("should provide wallet success fixture", () => {
      const fixture = getFixture("wallet-success");
      expect(fixture).toBeDefined();
      expect(fixture?.data.publicKey).toBeDefined();
    });

    it("should provide transaction fixtures", () => {
      const fixture = getFixture("txn-success");
      expect(fixture).toBeDefined();
      expect(fixture?.data.hash).toBeDefined();
    });

    it("should provide verification fixtures", () => {
      const fixture = getFixture("verify-success");
      expect(fixture).toBeDefined();
      expect(fixture?.data.verified).toBe(true);
    });

    it("should list all available fixtures", () => {
      const fixtures = listFixtures();
      expect(fixtures.length).toBeGreaterThan(0);
    });
  });

  describe("No Production Credentials Required", () => {
    it("should work without Stellar API key", () => {
      sandboxManager.initialize({ enabled: true, mockExternalServices: true });
      expect(sandboxManager.shouldMockServices()).toBe(true);
    });

    it("should work without verification service credentials", () => {
      sandboxManager.initialize({ enabled: true, mockExternalServices: true });
      expect(sandboxManager.shouldMockServices()).toBe(true);
    });
  });
});
