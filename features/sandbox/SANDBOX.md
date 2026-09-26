# Sandbox Mode

Integration sandbox for safe contributor testing without production dependencies.

## Setup

Enable sandbox mode by setting the environment variable:

```bash
NEXT_PUBLIC_SANDBOX_MODE=enabled
```

### Modes

- `disabled`: Production mode (default)
- `enabled`: Full sandbox with mock services and fake data
- `mock_only`: Mock external services but use real data logic

### Environment Variables

```bash
# Enable sandbox mode
NEXT_PUBLIC_SANDBOX_MODE=enabled

# Optional: Enable request logging
NEXT_PUBLIC_SANDBOX_LOG_REQUESTS=true
```

## Available Fixtures

Use sandbox fixtures to test common scenarios:

```typescript
import { getFixture, listFixtures } from "@/lib/sandbox-fixtures";

// Get specific fixture
const walletFixture = getFixture("wallet-success");

// List all fixtures
const allFixtures = listFixtures();
```

### Fixture Categories

#### Wallet Fixtures
- `wallet-success`: Successfully connected Stellar wallet
- `wallet-not-found`: Wallet connection failure

#### Transaction Fixtures
- `txn-success`: Successful payment transaction
- `txn-insufficient`: Insufficient balance error
- `txn-timeout`: Network timeout error

#### Verification Fixtures
- `verify-success`: Verification approved
- `verify-declined`: Verification declined

## API

### SandboxManager

```typescript
import { sandboxManager } from "@/lib/sandbox";

// Initialize sandbox
sandboxManager.initialize({ enabled: true });

// Check status
if (sandboxManager.isEnabled()) {
  // Sandbox is active
}

// Use mock services
if (sandboxManager.shouldMockServices()) {
  // Use MockStellarAdapter, MockVerificationAdapter, etc.
}
```

### Mock Adapters

All mock adapters return deterministic responses:

```typescript
import {
  MockStellarAdapter,
  MockVerificationAdapter,
  MockIPFSAdapter,
} from "@/lib/sandbox-adapters";

// Stellar operations
const balance = await MockStellarAdapter.getBalance(publicKey);
const txn = await MockStellarAdapter.submitTransaction(txn);

// Verification operations
const verified = await MockVerificationAdapter.verify(data);

// IPFS operations
const upload = await MockIPFSAdapter.upload(data);
```

## Testing

Run tests to verify sandbox behavior:

```bash
npm run test features/sandbox
```

Tests cover:
- Sandbox configuration
- Service adapter determinism
- Fixture availability
- Production credential exclusion
