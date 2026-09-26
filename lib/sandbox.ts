/**
 * Sandbox Mode Configuration
 *
 * Provides safe integration testing without production dependencies,
 * real wallets, or irreversible records.
 */

export type SandboxMode = "disabled" | "enabled" | "mock_only";

export interface SandboxConfig {
  enabled: boolean;
  mode: SandboxMode;
  mockExternalServices: boolean;
  useFakeData: boolean;
  preventNetworkCalls: boolean;
  logRequests: boolean;
}

const DEFAULT_CONFIG: SandboxConfig = {
  enabled: false,
  mode: "disabled",
  mockExternalServices: false,
  useFakeData: false,
  preventNetworkCalls: false,
  logRequests: false,
};

class SandboxManager {
  private config: SandboxConfig = { ...DEFAULT_CONFIG };

  initialize(overrides?: Partial<SandboxConfig>): void {
    const envMode = process.env.NEXT_PUBLIC_SANDBOX_MODE as SandboxMode | undefined;
    if (envMode) {
      this.config.mode = envMode;
      this.config.enabled = envMode !== "disabled";
      this.config.mockExternalServices = envMode !== "disabled";
      this.config.useFakeData = envMode !== "disabled";
    }

    if (overrides) {
      this.config = { ...this.config, ...overrides };
    }
  }

  getConfig(): SandboxConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.config.enabled && this.config.mode !== "disabled";
  }

  isMockOnly(): boolean {
    return this.config.mode === "mock_only";
  }

  shouldMockServices(): boolean {
    return this.config.mockExternalServices && this.isEnabled();
  }

  shouldUseFakeData(): boolean {
    return this.config.useFakeData && this.isEnabled();
  }

  shouldPreventNetworkCalls(): boolean {
    return this.config.preventNetworkCalls && this.isEnabled();
  }

  shouldLogRequests(): boolean {
    return this.config.logRequests;
  }

  log(...args: unknown[]): void {
    if (this.shouldLogRequests()) {
      console.log("[SANDBOX]", ...args);
    }
  }

  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
  }
}

export const sandboxManager = new SandboxManager();
