# Idempotency for High-Risk Writes

`lib/idempotency.ts` makes a retried write safe. It exists because the client cannot know whether its previous request reached the server: a timeout, a dropped connection, a reloaded tab and a double click all look the same from the browser, and each one used to be a second request.

Use it for writes where a duplicate is a duplicate **side effect** — payout requests, reward claims, anything that queues settlement or moves funds. Reads and ordinary updates should keep using `apiClient.post`/`put`/`delete`.

## Client

```ts
const { value, replayed } = await apiClient.postIdempotent<PayoutRequest>(
  '/affiliates/payouts',
  { walletAddress, amount, destinationAddress },
  { scope: `payout:${walletAddress}` },
);
```

`apiClient.postIdempotent` derives a key from the endpoint and payload when you do not pass one, sends it as the `Idempotency-Key` header, and remembers the outcome. `replayed: true` means the value came from a stored outcome and no second request reached the network — useful for telling the user "this was already done".

### Failure modes it reports instead of guessing

| Situation | Result |
|---|---|
| Same key, different payload | `IdempotencyConflictError` (`IDEMPOTENCY_CONFLICT`) |
| Key past its replay window | `IdempotencyKeyExpiredError` (`IDEMPOTENCY_KEY_EXPIRED`) |
| Another tab is processing the same key | `IdempotencyInProgressError` (`IDEMPOTENCY_IN_PROGRESS`) |
| Previous attempt failed | the operation runs again |
| Previous attempt succeeded | the stored result is returned |

An `in_progress` record older than `staleInProgressMs` (30s) is treated as abandoned and retried, so a crashed tab cannot lock a key forever.

## Repeating the same request on purpose

Paying out 100 XLM twice is a legitimate second intent, so a key derived from the body alone would replay the first payout forever. For those paths the key identifies the *attempt*:

```ts
const scope = `payout:${walletAddress}:${amount}:${destinationAddress}`;
const key = await beginIdempotentAttempt(scope);   // same key for every retry of this attempt
await affiliateService.requestPayout(walletAddress, amount, destinationAddress, key);
finishIdempotentAttempt(scope);                    // only after it lands
```

The attempt is persisted, so a reload keeps the same key, and it is closed on success, so the next identical request is a new intent.

## Storage

Outcomes live in `localStorage` under `trellis:idempotency:` and survive a reload — a promise cache does not, which is why the previous in-memory approach could not protect a retry after a refresh. When storage is unavailable (SSR, private mode, storage disabled) the store falls back to memory and still dedupes within the page. A record that cannot be parsed is dropped, so corrupted storage cannot block every future attempt.

## Server contract

`Idempotency-Key` is accepted as a header or as a body field (`idempotencyKey`) on `POST /api/affiliates/payouts`. The route answers:

- `201` — first request, payout queued;
- `200` with `"Duplicate request: returning the original payout..."` — recognised replay;
- `409` `IDEMPOTENCY_CONFLICT` — the key was used for a different payout request;
- `409` `IDEMPOTENCY_KEY_EXPIRED` — the key is past `IDEMPOTENCY_KEY_TTL_MS` (24h).

Keys are remembered per process; a multi-instance deployment needs a shared store (Redis) for the same guarantees across instances.

## Scope

This covers duplicate **requests**. It does not make the backend's own settlement retry-safe — that is the submission path behind `submitPayoutToNetwork` — and it does not replace the operator-level checks (pending-earnings reservation, in-flight duplicate rejection) that already guard the payout flow.
