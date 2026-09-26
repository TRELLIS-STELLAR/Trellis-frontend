/**
 * Fake External Service Adapters
 *
 * Provides deterministic mock responses for external services.
 */

import { sandboxManager } from "./sandbox";
import { getFixture } from "./sandbox-fixtures";

export interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

/**
 * Mock Stellar RPC Adapter
 */
export class MockStellarAdapter {
  static async getBalance(
    publicKey: string,
  ): Promise<ServiceResponse<{ balance: string }>> {
    sandboxManager.log("MockStellarAdapter.getBalance", publicKey);

    if (!publicKey.startsWith("G")) {
      return {
        success: false,
        error: "Invalid public key",
        timestamp: Date.now(),
      };
    }

    return {
      success: true,
      data: { balance: "1000.0000000" },
      timestamp: Date.now(),
    };
  }

  static async submitTransaction(txn: unknown): Promise<ServiceResponse<{ hash: string }>> {
    sandboxManager.log("MockStellarAdapter.submitTransaction", txn);

    return {
      success: true,
      data: { hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
      timestamp: Date.now(),
    };
  }

  static async getTransactionStatus(
    hash: string,
  ): Promise<ServiceResponse<{ status: string }>> {
    sandboxManager.log("MockStellarAdapter.getTransactionStatus", hash);

    return {
      success: true,
      data: { status: "confirmed" },
      timestamp: Date.now(),
    };
  }
}

/**
 * Mock Verification Service Adapter
 */
export class MockVerificationAdapter {
  static async verify(data: unknown): Promise<ServiceResponse<{ verified: boolean }>> {
    sandboxManager.log("MockVerificationAdapter.verify", data);

    return {
      success: true,
      data: { verified: true },
      timestamp: Date.now(),
    };
  }

  static async checkStatus(userId: string): Promise<ServiceResponse<{ level: string }>> {
    sandboxManager.log("MockVerificationAdapter.checkStatus", userId);

    return {
      success: true,
      data: { level: "standard" },
      timestamp: Date.now(),
    };
  }
}

/**
 * Mock IPFS Adapter
 */
export class MockIPFSAdapter {
  static async upload(data: unknown): Promise<ServiceResponse<{ hash: string }>> {
    sandboxManager.log("MockIPFSAdapter.upload", data);

    return {
      success: true,
      data: { hash: "QmX5kkqbvJ5vY5K5v5kK5v5kK5v5kK5v5kK5v5kK5v5kK" },
      timestamp: Date.now(),
    };
  }

  static async retrieve(hash: string): Promise<ServiceResponse<{ content: unknown }>> {
    sandboxManager.log("MockIPFSAdapter.retrieve", hash);

    return {
      success: true,
      data: { content: {} },
      timestamp: Date.now(),
    };
  }
}

/**
 * Get adapter based on sandbox configuration
 */
export function getStellarAdapter() {
  if (sandboxManager.shouldMockServices()) {
    return MockStellarAdapter;
  }
  // Return real adapter
  return MockStellarAdapter; // Fallback for demo
}

export function getVerificationAdapter() {
  if (sandboxManager.shouldMockServices()) {
    return MockVerificationAdapter;
  }
  return MockVerificationAdapter;
}

export function getIPFSAdapter() {
  if (sandboxManager.shouldMockServices()) {
    return MockIPFSAdapter;
  }
  return MockIPFSAdapter;
}
