# Protocol Safety: Config Versioning, Emergency Pause, Preflight & Receipts

Covers issues **#175, #176, #177, #178** — the four protocol-safety subsystems
that guard every high-risk Trellis operation. All modules live in `lib/protocol/`
and compose into one entry point (`executeGuardedOperation`).

```
request ─► #178 config compatibility ─► #177 pause gate ─► #175 preflight rules ─► #176 receipt ─► execute
              (incompatible? block)       (paused? block)    (blocked? refuse)      (created-or-replayed)
```

Refused operations never mint receipts and never reach transaction signing.

## Modules

| Module | Issue | Responsibility |
| --- | --- | --- |
| `lib/protocol/operations.ts` | — | Shared operation/environment vocabulary (`PROTOCOL_OPERATIONS`, `PROTOCOL_ENVIRONMENTS`) |
| `lib/protocol/config-versioning.ts` | #178 | Config registry, semver compatibility verdicts, fail-early validation |
| `lib/protocol/emergency-pause.ts` | #177 | Scoped pause/resume, boundary enforcement, audit trail |
| `lib/protocol/preflight.ts` | #175 | Deterministic rule checks → `success` / `warning` / `blocked` |
| `lib/protocol/operation-receipts.ts` | #176 | Canonical request fingerprints, replay-safe receipts, permission-checked lookup |
| `lib/protocol/canonical.ts` | — | Stable serialization shared by fingerprints |
| `lib/protocol/guard.ts` | — | The composed chain above |
| `lib/protocol/index.ts` | — | Barrel export |

## #178 — Protocol configuration versioning

Configuration surfaces (`commission_tiers`, `claim_link_rules`,
`governance_thresholds`) are declared in `DEFAULT_PROTOCOL_CONFIG_REGISTRY`
with:

- `currentVersion` — what this build was written against
- `minSupportedVersion` — the exclusive floor; anything older is refused
- optional `deprecation` metadata and explicit per-version `compatibility` entries

`validateProtocolCompatibility(registry, versions)` is the gate every dependent
operation calls. Behaviour:

| Version class | Result |
| --- | --- |
| current | proceeds, no warnings |
| old but within the supported range | proceeds (+ `CONFIG_DEPRECATED` warning when deprecated) |
| old, below the floor | `ProtocolConfigIncompatibleError` with code `VERSION_TOO_OLD` |
| future / unknown | `ProtocolConfigIncompatibleError` with code `VERSION_UNKNOWN` |
| explicitly marked | `MIGRATION_REQUIRED` error |

**Adding or bumping a config surface:** edit
`DEFAULT_PROTOCOL_CONFIG_REGISTRY`, add the new version to the
`compatibility` map, and update `CLIENT_CONFIG_VERSIONS` if the shipped client
moves. Bump the matching entry in `CHANGELOG.md`.

## #177 — Emergency pause and scoped resume

`PauseManager` pauses one `operation × environment` scope, optionally narrowed
to one `subjectId` (a compromised wallet, a misbehaving agent). Rules:

- **Pause:** maintainers and admins; requires a non-empty reason; idempotent.
- **Enforce:** `assertOperationAllowed()` at the execution boundary (route
  handler / transaction composer) throws `OperationPausedError` carrying a
  user-safe message — the internal reason and pausing actor are never exposed.
  Unrelated operations, environments and subjects are unaffected.
- **Resume:** admins only. Unauthorized attempts are *refused and audited*
  (`resume_denied` entry); the pause stays in effect.
- **Audit:** every pause, resume and denied resume is recorded with actor,
  reason and timestamp in an append-only log.

## #175 — Deterministic preflight

`runPreflight()` evaluates pure rules in fixed order: always-on rules
(pause gate → config gate → sequence freshness) then per-operation rules
(balance coverage for transfers, allowance for payouts, fee sanity for mints).
The verdict folds to `blocked` > `warning` > `success`.

- Determinism: rules are pure, time is injected, no I/O — the same request and
  state snapshot always produce the same result and the same `requestId`.
- Warnings always carry a user-safe `message` **and** a `remediation` step.
- Warning-level results remain submittable by policy (`isSubmittable`);
  `blocked` results must never be signed or submitted.
- Stale-state detection blocks when `sequenceAtComposition` no longer matches
  `currentSequence`.

**Adding a rule:** write a pure `(request) => PreflightRuleResult` and add it to
`OPERATION_RULES` (or pass `extraRules` for deployment-specific checks).

## #176 — Operation receipts

`ReceiptService.createOrGet()` is the replay-safety boundary:

- The fingerprint is taken over the **canonical (RFC 8785-style) encoding** of
  `{ actorId, environment, operation, payload }` — key order can never change it.
- The first submission creates the receipt (`status: 'received'`); any duplicate
  submission resolves to the existing receipt (`created: false`). A double-click
  or retried fetch cannot mint a second receipt.
- Transitions: `received → submitted (externalRef, e.g. tx hash) → confirmed`,
  or `failed` with a user-safe reason.
- Lookup (`lookupById/lookupByFingerprint` via `ReceiptService.lookup`) is
  permission-checked: owners read their own receipts; `maintainer`/`admin` may
  read any (support). Everyone else gets `ReceiptLookupDeniedError`.

## Using the composed guard

```ts
import { executeGuardedOperation } from '@/lib/protocol';

const result = executeGuardedOperation(
  {
    operation: 'claim_payout',
    environment: 'production',
    actorId: wallet.publicKey,
    actor: { id: wallet.publicKey, role: 'contributor' },
    payload: { rewardId, amount },
    configVersions: { commission_tiers: '2.0.0' },
  },
  { configRegistry, pauseManager, receipts },
);
// result.receipt is created-or-replayed; PreflightBlockedError means refused.
```

## Validation and tests

```bash
# Focused unit tests (all four subsystems + the composed guard)
npx jest tests/lib/protocol --coverage=false

# Smoke-validate shipped configuration facts
node scripts/validate-protocol-safety.mjs
```

Test coverage map (acceptance criteria → tests):

| Acceptance criterion | Test |
| --- | --- |
| #178 current/old-compatible/old-incompatible/future-unknown | `tests/lib/protocol/config-versioning.test.ts` |
| #177 pause, resume, unauthorized resume, audit output | `tests/lib/protocol/emergency-pause.test.ts` |
| #175 success/warning/failed/stale-state, determinism | `tests/lib/protocol/preflight.test.ts` |
| #176 fingerprint stability, duplicates, lookup permissions | `tests/lib/protocol/operation-receipts.test.ts` |
| composed chain, receipt dedup, block-before-receipt | `tests/lib/protocol/guard.test.ts` |

## Migration / deployment notes

- **No breaking API changes.** The modules are additive; nothing existing
  imports them yet, so no migration is required to land this.
- **Wiring:** to enforce at a boundary, construct the guard dependencies once
  per deployment (`PauseManager` backed by shared storage, `ReceiptService`
  backed by the API) and call `executeGuardedOperation` from route handlers
  before signing/submission. Until a server-side store is wired, both default
  to in-memory stores — suitable for development, not for multi-instance
  production enforcement.
- **Rollout:** ship with no pauses active and all current config versions;
  pauses are an operational lever, not a code path change.
