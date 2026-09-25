# Operational rollout and accessibility checks

## Feature flags

Feature flags are read on the server from environment variables. Missing values use the safer defaults:

- `TRELLIS_FEATURE_STABLE_BUG_REPORT_PAGINATION=true` enables deterministic cursor pagination.
- `TRELLIS_FEATURE_SECURITY_REPORT_EXPORT=false` keeps security report exports disabled until explicitly enabled.

Set a flag to `false` to roll back pagination, or set the export flag to `true` only after verifying authorization and output handling in the deployment environment. A restart is required for server configuration changes to take effect.

## Operational health

Open `/dashboard/operations` to review redacted counts for unresolved exceptions, stale records, reconciliation drift, and critical user incidents. Each category links to the relevant bug-report view without including reporter email addresses or wallet addresses in the summary.

## Accessibility verification

Run the existing checks with:

```bash
npm run typecheck
npm test -- --runInBand
npm run test:e2e
```

Keyboard users can tab through the bug-report form, and invalid fields expose `aria-invalid`, `aria-describedby`, and live error messages.