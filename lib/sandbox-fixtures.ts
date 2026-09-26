/**
 * Sandbox Fixtures
 *
 * Provides deterministic test data for common success and failure scenarios.
 */

export interface SandboxFixture {
  id: string;
  name: string;
  description: string;
  data: Record<string, unknown>;
}

export const WALLET_FIXTURES = {
  success: {
    id: "wallet-success",
    name: "Connected Wallet",
    description: "Simulates a successfully connected Stellar wallet",
    data: {
      publicKey: "GBPYXYX5VKRK7KXKHM5CVJWYFQKKMHUXU5VWKJZAWLAQJ6WT3JPSMYD7",
      balances: [
        { asset: "native", balance: "1000" },
        { asset: "USDC", balance: "500" },
      ],
      network: "testnet",
    },
  },
  notFound: {
    id: "wallet-not-found",
    name: "Wallet Not Found",
    description: "Simulates wallet connection failure",
    data: {
      error: "Wallet not found",
      code: 404,
    },
  },
};

export const TRANSACTION_FIXTURES = {
  success: {
    id: "txn-success",
    name: "Successful Transaction",
    description: "Simulates a successful payment transaction",
    data: {
      hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      status: "success",
      timestamp: new Date().toISOString(),
      amount: "100",
      recipient: "GBPYXYX5VKRK7KXKHM5CVJWYFQKKMHUXU5VWKJZAWLAQJ6WT3JPSMYD7",
    },
  },
  insufficientBalance: {
    id: "txn-insufficient",
    name: "Insufficient Balance",
    description: "Simulates insufficient balance error",
    data: {
      error: "Insufficient balance",
      code: 400,
      available: "50",
      requested: "100",
    },
  },
  timeout: {
    id: "txn-timeout",
    name: "Network Timeout",
    description: "Simulates network timeout error",
    data: {
      error: "Request timeout",
      code: 408,
    },
  },
};

export const VERIFICATION_FIXTURES = {
  success: {
    id: "verify-success",
    name: "Verification Approved",
    description: "Simulates successful verification",
    data: {
      verified: true,
      timestamp: new Date().toISOString(),
      level: "standard",
    },
  },
  declined: {
    id: "verify-declined",
    name: "Verification Declined",
    description: "Simulates verification decline",
    data: {
      verified: false,
      reason: "Insufficient documentation",
      timestamp: new Date().toISOString(),
    },
  },
};

export const ALL_FIXTURES = {
  ...WALLET_FIXTURES,
  ...TRANSACTION_FIXTURES,
  ...VERIFICATION_FIXTURES,
};

/**
 * Get a fixture by ID
 */
export function getFixture(id: string): SandboxFixture | undefined {
  return Object.values(ALL_FIXTURES).find((f) => f.id === id) as SandboxFixture | undefined;
}

/**
 * List all available fixtures
 */
export function listFixtures(): SandboxFixture[] {
  return Object.values(ALL_FIXTURES) as SandboxFixture[];
}
