# Client Error Handling

`lib/soroban/errors.ts` provides a stable error boundary for wallet, network, and contract-interaction failures.

## UI contract

Use `toUserSafeError(error)` at user-facing boundaries. It returns:

- `code`: a stable value suitable for UI state, analytics, and support triage;
- `message`: a recovery-oriented message that does not expose raw provider or contract details;
- `retryable`: whether the user can reasonably retry without changing input;
- `correlationId`: a support reference that can be paired with protected diagnostic logs.

Use `getHumanReadableError(error)` only for existing text-only call sites. New flows should keep the full structured result so they can render an appropriate retry affordance and include the correlation ID in a support path.

## Logging

Raw errors may contain provider or contract context and must not be displayed to users. Log them only through the application’s protected diagnostics path, alongside the returned correlation ID. Do not store wallet secrets, signed transaction payloads, or private user data in error telemetry.

## Extending the taxonomy

Add a new stable error code only when a failure mode needs different user guidance or retry behavior. Keep existing codes stable once released so analytics and support workflows remain reliable.