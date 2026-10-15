# Release Readiness Gate & Rollback Rehearsal Standard

This document establishes the production deployment gating standards, automated checks, operational failure modes, and recovery procedures for the Trellis Frontend application.

---

## 🎯 Purpose & Scope

The **Release Readiness Gate** is a mandatory, blocking pre-deployment verification system. It certifies that every production cutover satisfies strict requirements across four operational pillars:

1. **Migrations Gate**: Validates dry-run execution, non-empty rollback notes, and schema invariant assertions.
2. **Security Checks Gate**: Enforces outbound protocol allowlists, Soroban smart contract compliance rules, zero critical/high vulnerabilities, and client secret hygiene.
3. **Smoke Tests Gate**: Verifies domain invariants (`0` errors), runtime environment preflight, and critical UI route registries.
4. **Rollback Rehearsals Gate**: Exercises automated rollback rehearsals, feature flag fail-closed mechanisms, recovery checkpoint replay idempotency, and post-rollback domain invariant audits.

If **any** required check fails, or if any verification step is missing, the release is **BLOCKED**.

---

## 🚀 Running the Readiness Gate

### Standard Verification (Local / Contributor)

```bash
npm run validate:release-readiness
```

### Blocking CI / Production Gate (Strict Mode)

In strict mode, both hard failures and advisory warnings cause non-zero process exits (`exit 1`):

```bash
npm run release:gate
# Equivalent to:
node scripts/validate-release-readiness.mjs --strict
```

### Machine-Readable JSON Output (Deployment Pipelines)

```bash
node scripts/validate-release-readiness.mjs --json
```

---

## 📋 Gate Matrix: Checks, Failure Modes & Recovery Steps

### 1. Migrations Pillar

| Check ID | Requirement | Severity | Failure Mode | Operational Edge Case | Rollback / Remediation Step |
|---|---|---|---|---|---|
| `gate-migration-dry-run` | All pending migrations must run with `preview.safe === true` | **BLOCKER** | Migration throws during simulation or schema validator detects corruption. | Large datasets causing snapshot clone timeouts or cyclical reference serialization failure. | Abort deployment. Inspect dry-run diff in memory store. Repair migration transform function and re-simulate against updated staging snapshot. |
| `gate-migration-rollback-notes` | Every migration must contain an actionable `rollbackNote` (>= 10 chars) | **BLOCKER** | Missing or empty `rollbackNote` property on migration definition. | Irreversible column drops or one-way cryptographic hashing without cold backup reference. | Block release cutover. Document explicit forward-fix or point-in-time snapshot restore procedures in `rollbackNote`. |
| `gate-migration-schema-validation` | Post-migration validations and post-checks report `0` errors | **BLOCKER** | `validate()` returns error strings or `PostMigrationCheck` discovers orphaned entities. | Stale replica read lag causing post-check to query uncommitted migration state. | Trigger documented rollback procedure in `rollbackNote`. Restore pre-migration backup from cold storage and verify with `npm run dr:validate`. |

### 2. Security Pillar

| Check ID | Requirement | Severity | Failure Mode | Operational Edge Case | Rollback / Remediation Step |
|---|---|---|---|---|---|
| `gate-security-protocol-allowlist` | Outbound links & user content restricted to `http:`, `https:`, `mailto:` | **BLOCKER** | Outbound URL with `javascript:`, `data:`, `file:`, or `blob:` protocol. | Mixed-case protocols (`jAvAsCrIpT:`) or URL-encoded schemes attempting filter bypass. | Sanitize link targets using `<SafeExternalLink>` and `<SafeContent>`. Quarantine offending records until re-sanitized. |
| `gate-security-soroban-compliance` | Soroban smart contracts pass SEP-41, auth checks, and scoring >= 80 | **BLOCKER** | Mutating functions missing `require_auth` (SC-002) or token contract missing SEP-41 functions. | Multi-sig accounts with timelocked thresholds failing immediate preflight simulation. | Pause contract deployment via `EmergencyPause` or disable feature flag. Patch authorization checks and re-scan. |
| `gate-security-vulnerability-threshold` | Zero critical and zero high severity vulnerabilities | **BLOCKER** | Scan detects unmitigated high/critical vulnerability in dependencies or contract code. | Transitive dependency vulnerability with no upstream patch available. | Block release. If transitive, apply npm package override or isolate execution path with feature flag. |
| `gate-security-secret-hygiene` | No secret keys or private credentials in client environment | **BLOCKER** | Stellar private seed (`S...`) or secret token detected in `NEXT_PUBLIC_*` variable or client bundle. | Test mnemonic keys in mock fixture files mistaken for live production secrets. | Revoke leaked credentials immediately in upstream services or ledger. Purge build worker cache and redeploy with sanitized env. |

### 3. Smoke Tests Pillar

| Check ID | Requirement | Severity | Failure Mode | Operational Edge Case | Rollback / Remediation Step |
|---|---|---|---|---|---|
| `gate-smoke-domain-invariants` | Baseline domain data satisfies all relational & financial invariants | **BLOCKER** | Relational integrity violation (`ORPHANED_RECORD`), duplicate ID, or balance drift (`FINANCIAL_BALANCE_VIOLATION`). | Horizon indexer ingestion lag causing temporary balance mismatch during cutover. | Halt cutover. Isolate corrupted records using `npm run validate:invariants -- --strict`. Follow remediation in `docs/DISASTER_RECOVERY.md`. |
| `gate-smoke-environment-config` | Core environment configurations and documentation files exist | **BLOCKER** | Missing required environment variables or missing operational runbooks. | Staging vs Production variable naming mismatches during infrastructure provisioning. | Compare environment against `.env.example`. Supply missing variables and re-run preflight. |
| `gate-smoke-critical-routes` | Core routes (`/`, `/marketplace`, `/dashboard/operations`, `/security`, `/telemetry`) present | **WARNING** | Route inventory missing critical path or middleware crash on cold start. | SSR routes timing out when downstream backend API is cold. | Inspect route configuration via `ROUTES_INVENTORY.md` and verify with `npm run build`. |

### 4. Rollback Rehearsals Pillar

| Check ID | Requirement | Severity | Failure Mode | Operational Edge Case | Rollback / Remediation Step |
|---|---|---|---|---|---|
| `gate-rollback-rehearsal-execution` | All 4 designated rollback rehearsals executed and certified | **BLOCKER** | Rehearsal suite missing from test execution records or assertion failure during rehearsal. | Rehearsal passing against memory store but failing on persistent storage permissions. | Run rehearsal suite: `npm run release:gate`. Inspect failure trace in rehearsal logs and patch recovery flow. |
| `gate-rollback-feature-flags-fail-closed` | All feature flags fail closed with safe fallback defaults | **BLOCKER** | Feature flag defaulting to destructive state or throwing when user context is null. | Remote flag polling server down (`TRELLIS_FEATURE_FLAGS_URL`), falling back to process env. | Set `TRELLIS_FEATURE_[FLAG]=false` in deployment environment. Restart service or wait for 30s polling cycle. |
| `gate-rollback-checkpoint-recovery` | Operation checkpoints guarantee side-effect fencing and replay idempotency | **BLOCKER** | Side-effect step re-executing upon operation resume. | Concurrent resumes across multiple browser tabs attempting duplicate settlement. | Cancel operation via `OperationManager.cancelOperation()`. Inspect checkpoint records in maintainer dashboard. |
| `gate-rollback-post-invariants-certified` | Post-rollback domain state certified non-violating | **BLOCKER** | Restored domain state contains orphaned records or negative balances. | Point-in-time database snapshot missing recent parent foreign key records. | Run `npm run dr:validate -- --strict` on restored database dump. Reconcile missing transactions with Horizon ledger. |

---

## 🔄 Emergency Rollback Procedures

When an incident triggers an emergency rollback after release cutover:

### Step 1: Immediate Feature Flag Deactivation (< 2 minutes)
If the incident is isolated to a specific feature:
```bash
# Set in deployment environment (e.g., Kubernetes, Vercel, or systemd):
TRELLIS_FEATURE_[FEATURE_NAME]=false
```
Remote polling clients update within 30 seconds without requiring container restarts.

### Step 2: Emergency Subsystem Pause (< 5 minutes)
If high-risk operations (fund transfers, minting, or payouts) are suspect:
1. Navigate to `/dashboard/operations` or invoke the emergency pause API.
2. Engage the `EmergencyPause` subsystem for the affected operation scope.
3. Operations will fail closed with user-safe error receipts.

### Step 3: Git & Container Reversion (< 15 minutes)
If a code-level regression requires full release rollback:
1. Re-tag and deploy the previous known stable image or commit.
2. Execute the migration rollback procedure documented in the release's `rollbackNote`.
3. Verify restored environment integrity:
   ```bash
   npm run dr:validate -- --strict
   npm run release:gate
   ```

---

## 📱 Operations Dashboard & Offline Support

Maintainers can inspect the live status of the Release Readiness Gate at:
`/dashboard/operations`

### Offline State Handling
- When the operator is disconnected from the internet, the dashboard detects `navigator.onLine === false`.
- The dashboard automatically renders the cached evaluation from `localStorage` (`trellis.release-readiness.last-report`).
- An accessible `[OFFLINE MODE]` notice displays the timestamp of the last certified evaluation and pauses live remote probes.

### Telemetry & Observability
Every gate evaluation emits a sanitized telemetry event:
- **Type**: `status` / `task_completed`
- **Kind**: `release_readiness_gate`
- **Codes**: `RELEASE_GATE_CERTIFIED` (all required passed) or `RELEASE_GATE_BLOCKED` (blockers detected)
- **PII Fencing**: Zero user names, email addresses, or raw private keys are included in telemetry payloads.
