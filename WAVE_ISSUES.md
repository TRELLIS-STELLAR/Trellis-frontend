# Trellis frontend — Next.js application — Wave Program issues

Twenty issues for the Trellis frontend, grounded in the current state of `main`.
These are deliberately distinct from the ten already drafted in
`GITHUB_ISSUES_BOOTSTRAP.md` — post both sets, they do not overlap.

These are staged for release, not posted all at once. Each stage is a batch you can push when the previous one has been picked up.

| Stage | Issues | When to post |
| --- | --- | --- |
| 1 | 7 (#1–#7) | Ready to post now |
| 2 | 8 (#8–#15) | Core contributor work |
| 3 | 5 (#16–#20) | Needs a maintainer decision first |

Create them with `.github/create-issues.sh <stage>` — see the bottom of this file.

---

## Stage 1 — Ready to post now

Self-contained, low-risk, and reviewable in a single pass. Most need no prior knowledge of the codebase. Post these first so the first wave of contributors has somewhere to land.

### 1. There is no CI at all — add lint, typecheck, test and build

**Labels:** `bug`, `ci`, `help wanted`

`.github/` contains `ISSUE_TEMPLATE/bug_report.md`,
`ISSUE_TEMPLATE/feature_request.md` and `PULL_REQUEST_TEMPLATE.md` — and nothing
else. There is no `workflows/` directory.

Nothing runs on a pull request. Not `eslint`, not `tsc`, not `jest`, not
`next build`. `package.json` defines `lint`, `test` and `build` scripts that only
ever run when someone remembers to run them locally.

## Why this matters

This is the largest of the three repositories by file count and the only one with
no automated checks whatsoever. A PR that breaks the build, fails type checking
or deletes a test merges green because there is nothing to go red. The
contracts repo at least builds and lints; this one does nothing.

It is also a prerequisite for most of the other quality work in this list —
coverage thresholds, i18n parity checks and Lighthouse budgets all need a
workflow to hang off.

## Tasks

- [ ] Add `.github/workflows/ci.yml` triggered on push and pull_request
- [ ] Add a job matrix step running `npm ci`
- [ ] Run `npm run lint` (the script exists and uses `--fix`; use a non-fixing invocation in CI)
- [ ] Run `npx tsc --noEmit` for type checking — there is currently no typecheck script, so add one to package.json
- [ ] Run `npm test`
- [ ] Run `npm run build` to catch Next.js build-time failures
- [ ] Cache `~/.npm` and `.next/cache` so the workflow stays fast
- [ ] Note in the PR that branch protection should require these checks (a maintainer setting)

## Files to look at

- `.github/workflows/ci.yml (new)`
- `package.json`
- `jest.config.cjs`
- `.eslintrc.cjs`

## Acceptance criteria

- Lint, typecheck, test and build all run on every pull request
- A deliberately broken type causes a red check (demonstrate in the PR)
- The workflow completes in under five minutes on a warm cache

---

**Skills:** GitHub Actions, Next.js  
**Estimated effort:** half a day

### 2. Arabic translation is 4 keys out of 36 — complete it and add RTL support

**Labels:** `good first issue`, `i18n`, `accessibility`, `help wanted`

Key counts across `i18n/`:

| locale | keys |
| --- | --- |
| `en`, `de`, `es`, `fr`, `ja`, `zh` | 36 |
| `ar`, `ko`, `pt`, `ru` | 4 |

`ar.json` has **4 of 36 keys — 11% complete**. Anything not translated falls
back to English, so an Arabic user sees a near-entirely English interface that
claims to be localised.

Arabic additionally needs right-to-left layout, and `dir="rtl"` does not appear
anywhere in the codebase.

## Why this matters

Humanitarian aid distribution has obvious relevance in Arabic-speaking regions,
which makes this the most consequential of the four incomplete locales. Shipping
a language in the switcher that is 11% translated is worse than not offering it:
it promises support that is not there.

RTL is the part most likely to be missed. Even a fully translated `ar.json`
renders as a broken layout without direction handling.

## Tasks

- [ ] Translate the remaining 32 keys in `i18n/ar.json` using `en.json` as the source
- [ ] Set `dir="rtl"` on the `<html>` element when the active locale is Arabic
- [ ] Audit directional Tailwind utilities — replace `ml-`/`mr-`/`left-`/`right-` with logical equivalents (`ms-`, `me-`, `start-`, `end-`)
- [ ] Check the MUI theme handles RTL (it needs `stylis-plugin-rtl` for emotion)
- [ ] Screenshot the marketplace, dashboard and navigation in RTL and attach them to the PR

## Files to look at

- `i18n/ar.json`
- `i18n/en.json`
- `i18n/config.ts`
- `app/layout.tsx`
- `components/providers/ThemeModeProvider.tsx`
- `components/Navigation.tsx`

## Acceptance criteria

- `ar.json` has the same key set as `en.json`
- The page direction flips to RTL when Arabic is selected
- Navigation, marketplace and dashboard render correctly in RTL (screenshots in the PR)

## Notes

Needs a fluent Arabic speaker. Please do not submit machine translation without review.

---

**Skills:** Arabic, JSON, CSS  
**Estimated effort:** 1 day

### 3. Korean translation is 4 keys out of 36 — complete it

**Labels:** `good first issue`, `i18n`, `help wanted`

`i18n/ko.json` contains 4 keys. `i18n/en.json` contains 36. Every untranslated
string falls back to English, so a user who selects Korean sees a mostly-English
interface.

## Why this matters

The language switcher offers Korean, which sets an expectation the translation
files do not meet. Either the locale should be complete or it should not be
offered.

## Tasks

- [ ] Translate the remaining 32 keys in `i18n/ko.json`, using `en.json` as the source of truth
- [ ] Keep interpolation placeholders (`{{name}}` and similar) exactly as they appear in English
- [ ] Check that longer Korean strings do not overflow navigation and button components
- [ ] Attach a screenshot of the app in Korean to the PR

## Files to look at

- `i18n/ko.json`
- `i18n/en.json`

## Acceptance criteria

- `ko.json` has the same key set as `en.json`
- No interpolation placeholder is lost or renamed
- No visible text overflow in the navigation bar or primary buttons

## Notes

Needs a fluent Korean speaker. Please do not submit machine translation without review.

---

**Skills:** Korean, JSON  
**Estimated effort:** half a day

### 4. Portuguese translation is 4 keys out of 36 — complete it

**Labels:** `good first issue`, `i18n`, `help wanted`

`i18n/pt.json` contains 4 of the 36 keys present in `i18n/en.json`. The rest
falls back to English.

## Why this matters

Portuguese is offered in the language switcher but 89% untranslated. Completing
it is a well-scoped task that needs no knowledge of the codebase beyond the
`i18n/` directory.

## Tasks

- [ ] Translate the remaining 32 keys in `i18n/pt.json` from `en.json`
- [ ] Decide and document whether this targets European or Brazilian Portuguese
- [ ] Keep interpolation placeholders unchanged
- [ ] Check for text overflow in navigation and buttons

## Files to look at

- `i18n/pt.json`
- `i18n/en.json`

## Acceptance criteria

- `pt.json` has the same key set as `en.json`
- The variant (pt-PT or pt-BR) is stated in the PR description
- No interpolation placeholder is lost

## Notes

Needs a fluent Portuguese speaker. Please do not submit machine translation without review.

---

**Skills:** Portuguese, JSON  
**Estimated effort:** half a day

### 5. Russian translation is 4 keys out of 36 — complete it

**Labels:** `good first issue`, `i18n`, `help wanted`

`i18n/ru.json` contains 4 of the 36 keys present in `i18n/en.json`.

## Why this matters

Same as the other incomplete locales: the switcher advertises Russian and
delivers an English interface. Russian strings also tend to run longer than
English, so this is a useful stress test of the layout.

## Tasks

- [ ] Translate the remaining 32 keys in `i18n/ru.json` from `en.json`
- [ ] Keep interpolation placeholders unchanged
- [ ] Pay attention to plural forms — Russian has three, and `i18next` needs `_one`/`_few`/`_many` suffixes where counts appear
- [ ] Check for text overflow, which is likelier here than in most locales

## Files to look at

- `i18n/ru.json`
- `i18n/en.json`

## Acceptance criteria

- `ru.json` has the same key set as `en.json`
- Plural forms use i18next's suffix convention where applicable
- No visible text overflow in navigation and buttons

## Notes

Needs a fluent Russian speaker. Please do not submit machine translation without review.

---

**Skills:** Russian, JSON  
**Estimated effort:** half a day

### 6. Add an i18n key-parity test so locales cannot drift again

**Labels:** `good first issue`, `i18n`, `test`

Four of the ten locale files (`ar`, `ko`, `pt`, `ru`) have 4 keys while the other
six have 36. Nothing detected this drift — there is no test comparing locale
files, and no CI to run one.

## Why this matters

Completing the four locales fixes today's problem. This issue stops it
recurring: without a parity check, the next feature that adds an English string
silently un-completes every other language, and nobody notices until a user
reports English text in a Japanese interface.

## Tasks

- [ ] Add a test that loads every file in `i18n/*.json` and compares its flattened key set against `en.json`
- [ ] Report missing and extra keys per locale with a readable diff, not just a boolean failure
- [ ] Decide how to handle intentionally-untranslated locales — an explicit allowlist with a TODO is better than a skipped test
- [ ] Wire it into CI once the CI workflow exists

## Files to look at

- `i18n/*.json`
- `tests/ (new test file)`
- `jest.config.cjs`

## Acceptance criteria

- The test fails today, listing exactly the missing keys in `ar`, `ko`, `pt` and `ru`
- It passes once those four are completed
- Adding a key to `en.json` alone fails the test

## Notes

Expect this to be red until the four translation issues land. Consider merging it
behind an allowlist first, then removing entries as each locale is completed.

---

**Skills:** TypeScript, Jest  
**Estimated effort:** 2 hours

### 7. Three overlapping i18n packages are installed — consolidate

**Labels:** `good first issue`, `dependencies`, `refactor`

`package.json` depends on all three of:

- `i18next` ^26.0.8
- `next-i18next` ^15.4.3
- `react-i18next` ~17.0.4

`next-i18next` is built for the Pages Router and is not the right choice for an
App Router project, which this is (`app/layout.tsx`, `app/page.tsx`). It also
bundles its own copies of the other two, which is how version conflicts and
duplicate-instance warnings appear at runtime.

## Why this matters

Duplicate i18next instances cause translations to silently fail to load — a
component resolves against a different instance than the provider initialised.
It also inflates the bundle for no benefit. The existing
`GITHUB_ISSUES_BOOTSTRAP.md` flags the duplicate-import console warning; this
issue is the underlying cause.

## Tasks

- [ ] Confirm which packages `i18n/config.ts` and the components actually import
- [ ] Remove `next-i18next` unless something genuinely depends on it — App Router projects should use `i18next` + `react-i18next` directly
- [ ] Run the app and confirm every locale still loads
- [ ] Check the bundle size before and after and report the delta in the PR
- [ ] Verify the duplicate-instance console warning is gone

## Files to look at

- `package.json`
- `i18n/config.ts`
- `components/LanguageSwitcher.tsx`
- `app/layout.tsx`

## Acceptance criteria

- Exactly one i18n stack remains
- All ten locales still load and switch correctly
- The duplicate-instance console warning no longer appears
- Bundle size delta is reported

---

**Skills:** TypeScript, Next.js, i18next  
**Estimated effort:** half a day

---

## Stage 2 — Core contributor work

The substance of the programme: real features, real test coverage, real bug fixes. Each has a defined acceptance test. Post once Stage 1 has cleared and reviewers have bandwidth.

### 8. Affiliate earnings API returns hardcoded mock data

**Labels:** `enhancement`, `help wanted`, `backend-integration`

`app/api/affiliates/earnings/route.ts` line 36 reads `// TODO: Fetch from
database` and returns a hardcoded object. The affiliate dashboard renders that
static response as though it were live earnings.

This is one of six affiliate route handlers in the same state — see the related
issues for payouts, referrals, stats and validation.

## Why this matters

The affiliate dashboard is one of the most complete features in the repository —
`features/affiliate-dashboard/` has 1,581 lines of documentation across five
files — sitting on top of an API that returns fiction. Users see numbers that
never change and cannot be reconciled against anything on-chain.

## Tasks

- [ ] Establish where earnings actually live — `Trellis-API` has a referral subsystem; confirm the endpoint and shape before writing client code
- [ ] Replace the mock response with a real call to the backend
- [ ] Add error handling: backend unreachable, unauthorised, empty result
- [ ] Add loading and error states in the consuming component rather than rendering a blank panel
- [ ] Add tests using a mocked fetch layer, covering success, failure and empty

## Files to look at

- `app/api/affiliates/earnings/route.ts`
- `features/affiliate-dashboard/store/useAffiliateStore.ts`
- `features/affiliate-dashboard/INTEGRATION.md`

## Acceptance criteria

- The endpoint returns data from the backend, not a literal
- Backend failure surfaces a real error state in the UI
- Tests cover success, failure and empty-result paths

## Notes

Agree the contract with the `Trellis-API` maintainers in the thread first. If the
backend endpoint does not exist yet, this issue blocks on one being added there,
and that should be linked rather than worked around with more mocks.

---

**Skills:** TypeScript, Next.js route handlers, REST  
**Estimated effort:** 2–3 days

### 9. Affiliate payouts API is mocked and the Stellar payout is unimplemented

**Labels:** `enhancement`, `help wanted`, `blockchain`

`app/api/affiliates/payouts/route.ts` carries three TODOs:

- line 26 — `// TODO: Fetch from database`
- line 108 — `// TODO: Validate pending earnings and create payout request in database`
- line 109 — `// TODO: Initiate Stellar transaction`

So the endpoint lists fake payouts, does not validate that a payout is owed, and
never moves any funds.

## Why this matters

This is the endpoint that pays people. It currently accepts a payout request,
performs no validation, and returns success without transferring anything. If
the UI is ever pointed at production in this state, it will tell affiliates they
have been paid when they have not.

It also needs care in the other direction: once wired up, missing validation
becomes a double-spend path.

## Tasks

- [ ] Agree the payout flow in the thread: does the frontend initiate the transfer, or does it request one from the backend? The backend is almost certainly correct here
- [ ] Implement listing real payout history
- [ ] Implement validation: sufficient pending earnings, no duplicate request in flight, payout above the minimum threshold
- [ ] Wire the transfer through the backend's payment path rather than signing in the browser
- [ ] Make the request idempotent so a retry cannot pay twice
- [ ] Add tests for insufficient balance, duplicate request and backend failure

## Files to look at

- `app/api/affiliates/payouts/route.ts`
- `features/affiliate-dashboard/store/useAffiliateStore.ts`
- `features/referral-sharing/services/referralService.ts`

## Acceptance criteria

- A payout cannot be requested without sufficient validated pending earnings
- A duplicate or retried request cannot pay twice
- Failure states are surfaced to the user rather than reported as success
- Tests cover the insufficient-balance and duplicate-request paths

## Notes

Security-sensitive. This should not be a first contribution, and it wants a
careful review. Consider splitting listing (read) from initiation (write) into
two PRs.

---

**Skills:** TypeScript, Stellar SDK, Next.js  
**Estimated effort:** 1 week

### 10. Affiliate referrals API returns mock data and does not generate real referral codes

**Labels:** `enhancement`, `help wanted`

`app/api/affiliates/referrals/route.ts` has two TODOs: line 26
`// TODO: Fetch from database` and line 86 `// TODO: Generate and store in
database`.

The referral list is fabricated, and generating a referral code returns one that
is never persisted — so it cannot be attributed when someone uses it.

## Why this matters

Referral attribution is the whole mechanism: `referral-contract` in the contracts
repository exists specifically to pay multi-tier commissions on it. A code that
is never stored cannot be matched to a signup, so no commission is ever
correctly attributed.

## Tasks

- [ ] Fetch the real referral list from the backend
- [ ] Persist generated referral codes so they can be resolved later
- [ ] Ensure code generation is collision-resistant and check uniqueness before returning
- [ ] Return an existing code when the user already has one rather than minting a new one each call
- [ ] Add tests for generation, collision handling and listing

## Files to look at

- `app/api/affiliates/referrals/route.ts`
- `features/referral-sharing/services/referralService.ts`
- `features/referral-sharing/tests/referralService.test.ts`

## Acceptance criteria

- Generated codes are persisted and resolvable
- Repeated calls return the same code for the same user
- Collisions are impossible or detected and retried
- Tests cover generation, repeat-call and collision paths

---

**Skills:** TypeScript, Next.js route handlers  
**Estimated effort:** 2–3 days

### 11. Affiliate stats and program endpoints return mock data

**Labels:** `enhancement`, `help wanted`, `good first issue`

Two more mocked handlers:

- `app/api/affiliates/stats/route.ts` line 26 — `// TODO: Fetch from database`
- `app/api/affiliates/program/route.ts` line 9 — `// TODO: Fetch from database`

`program` returns the tier structure and commission rates; `stats` returns
aggregate performance. Both are read-only, which makes them the safest of the
six mocked affiliate endpoints to wire up first.

## Why this matters

Commission rates displayed from a hardcoded literal will drift from whatever the
`referral-contract` actually pays, and users will reasonably treat the displayed
rate as a promise. Being read-only, these two are a good entry point into the
affiliate integration work.

## Tasks

- [ ] Wire `program` to the real tier and commission configuration — ideally read from the contract or the backend's view of it, not a frontend constant
- [ ] Wire `stats` to real aggregate data
- [ ] Add caching where appropriate; program configuration changes rarely
- [ ] Add loading and error states in the consuming components
- [ ] Add tests for both endpoints

## Files to look at

- `app/api/affiliates/stats/route.ts`
- `app/api/affiliates/program/route.ts`
- `features/affiliate-dashboard/components/`

## Acceptance criteria

- Both endpoints return backend data
- Displayed commission rates match what the referral contract actually pays
- Error and loading states are handled in the UI

## Notes

Good starting point for a contributor new to this codebase — read-only and well-bounded.

---

**Skills:** TypeScript, Next.js route handlers  
**Estimated effort:** 1–2 days

### 12. Affiliate eligibility validation is unimplemented

**Labels:** `enhancement`, `help wanted`

`app/api/affiliates/validate/route.ts` line 26 reads `// TODO: Check eligibility
criteria:` — the comment trails off mid-sentence, so the criteria themselves were
never written down either.

The endpoint currently approves everyone.

## Why this matters

This is the gate on who can join the affiliate programme and earn commissions.
Approving everyone unconditionally makes the programme trivially farmable — one
person can create many accounts, refer themselves, and drain commission from the
treasury contract.

## Tasks

- [ ] Define the eligibility criteria explicitly in the issue thread first — this is a product decision, not an implementation detail
- [ ] Likely candidates: verified wallet, minimum account age, not already enrolled, not self-referring, KYC status where required
- [ ] Implement the checks against real data
- [ ] Return a structured reason for rejection so the UI can explain it rather than failing opaquely
- [ ] Add tests for each rejection reason and for the approval path

## Files to look at

- `app/api/affiliates/validate/route.ts`
- `features/affiliate-dashboard/store/useAffiliateStore.ts`

## Acceptance criteria

- The criteria are documented before the code is written
- Each criterion is enforced and independently tested
- Rejections return a machine-readable reason the UI can render
- Self-referral is impossible

---

**Skills:** TypeScript, Next.js route handlers  
**Estimated effort:** 2–3 days

### 13. AgentMintingWizard has no real wallet or network integration

**Labels:** `enhancement`, `help wanted`, `blockchain`

`components/AgentMintingWizard.tsx` carries two TODOs:

- line 11 — `// TODO: Replace with actual network and wallet integration`
- line 23 — `// TODO: Replace with actual wallet integration`

The minting flow is fully built as a UI and connects to nothing. The project
already depends on `@stellar/freighter-api` ^6.0.0 and `@stellar/stellar-sdk`
^14.0.0, and `components/ConnectWallet.tsx` and `NetworkSwitcher.tsx` exist — so
the pieces are present but not wired into this component.

## Why this matters

Minting an agent is a primary user journey and the wizard is one of the most
visible features in the app. A multi-step wizard that ends without a transaction
is a dead end, and users will reasonably believe their agent was created.

## Tasks

- [ ] Read the wallet connection state from the existing provider rather than adding a second source of truth
- [ ] Read the active network from `NetworkSwitcher` instead of hardcoding it
- [ ] Build, sign and submit the real minting transaction via Freighter
- [ ] Handle the full set of failure modes: wallet locked, user rejects, wrong network, insufficient balance, transaction timeout
- [ ] Show the transaction hash and a link to the explorer on success
- [ ] Add tests with a mocked Freighter API covering rejection and wrong-network paths

## Files to look at

- `components/AgentMintingWizard.tsx`
- `components/ConnectWallet.tsx`
- `components/NetworkSwitcher.tsx`
- `app/create/page.tsx`

## Acceptance criteria

- The wizard submits a real transaction on the selected network
- Every listed failure mode produces a clear, specific message
- Success shows the transaction hash with an explorer link
- Tests cover user rejection and wrong-network

---

**Skills:** TypeScript, React, Stellar SDK, Freighter  
**Estimated effort:** 1 week

### 14. Affiliate dashboard hardcodes `walletAddress = null`

**Labels:** `bug`, `good first issue`, `help wanted`

`features/affiliate-dashboard/page.tsx` line 19:

```ts
const walletAddress = null; // TODO: Get from StellarWalletProvider context
```

The dashboard's wallet address is a literal `null`, so every downstream
component behaves as though no wallet is connected — even when one is.

## Why this matters

This is a one-line bug with a whole-feature blast radius. The affiliate dashboard
cannot identify the user, so it cannot show their referrals, earnings or payout
history correctly regardless of how well the API work lands. It is also a clean,
small first contribution.

## Tasks

- [ ] Read the connected address from the wallet provider context instead of the literal
- [ ] Handle the genuinely-disconnected case with a connect prompt, not a blank dashboard
- [ ] Check every consumer of `walletAddress` in the feature for null-handling that assumed it was always null
- [ ] Add a test rendering the dashboard with and without a connected wallet

## Files to look at

- `features/affiliate-dashboard/page.tsx`
- `features/affiliate-dashboard/store/useAffiliateStore.ts`
- `components/ConnectWallet.tsx`

## Acceptance criteria

- A connected wallet's address reaches the dashboard
- The disconnected state shows a connect prompt
- Tests cover both states

---

**Skills:** TypeScript, React context  
**Estimated effort:** 2–4 hours

### 15. 24 test files for 118 components — add coverage thresholds and raise coverage

**Labels:** `test`, `help wanted`

The repository has 24 test files against 118 `.tsx` files in `app/`, `components/`
and `features/`. `jest.config.cjs` sets no `coverageThreshold` and no
`collectCoverage`, so coverage is never measured and never enforced.

The ROADMAP lists "Complete test coverage (>80%)" as an open milestone.

## Why this matters

Nobody currently knows what the coverage number is, which makes the 80% roadmap
target unmeasurable. Establishing the baseline and ratcheting it is the only way
that milestone becomes real rather than aspirational.

## Tasks

- [ ] Enable `collectCoverage` and record the current baseline in the issue thread
- [ ] Set `coverageThreshold` just below the baseline so CI cannot regress
- [ ] Prioritise by risk: wallet interaction, payment and affiliate paths before presentational components
- [ ] Raise the threshold as coverage improves rather than setting 80% immediately and disabling it
- [ ] Report coverage on pull requests once CI exists

## Files to look at

- `jest.config.cjs`
- `jest.setup.js`
- `.github/workflows/ci.yml`

## Acceptance criteria

- Coverage is measured on every run and the baseline is documented
- CI fails on regression below the threshold
- The threshold has been raised at least once as new tests land

## Notes

Umbrella issue — split into per-area child issues (wallet, affiliate, marketplace,
governance) so several contributors can work in parallel without colliding.
Depends on the CI issue.

---

**Skills:** TypeScript, Jest, React Testing Library  
**Estimated effort:** ongoing — split per area

---

## Stage 3 — Needs a maintainer decision first

Worth doing, but the approach should be agreed in the issue thread before anyone writes code. Post with a maintainer already assigned to discuss.

### 16. Redux Toolkit and Zustand are both installed — pick one

**Labels:** `refactor`, `needs discussion`, `architecture`

`package.json` depends on both state management stacks:

- `@reduxjs/toolkit` ^2.11.2 with `react-redux` ^9.2.0
- `zustand` ^5.0.12

There is a `store/` directory at the root and Zustand stores inside features
(`features/affiliate-dashboard/store/useAffiliateStore.ts`). Two state systems
means two sources of truth, two sets of devtools, two mental models, and shared
state that can diverge between them.

## Why this matters

Every new contributor has to work out which store a given piece of state belongs
in, and the answer is currently "it depends who wrote it". That is a compounding
cost — the longer both remain, the more code is written against each and the more
expensive the eventual consolidation becomes.

Both also ship in the bundle.

## Tasks

- [ ] Inventory what state lives in each system and write it up in the issue thread
- [ ] Agree which one stays before any code moves — this is the actual decision, and it should not be made inside a PR
- [ ] Consider the likely answer: Zustand suits the feature-scoped stores already in use; Redux suits a large shared store with heavy devtools use
- [ ] Migrate incrementally, one slice at a time, keeping the app working at each step
- [ ] Remove the losing dependency and confirm the bundle size drop

## Files to look at

- `package.json`
- `store/`
- `features/*/store/`
- `components/providers/`

## Acceptance criteria

- One state management library remains
- No behaviour regression (the E2E suite, once it exists, should confirm this)
- The bundle size delta is reported
- The choice and its rationale are documented for future contributors

## Notes

Do not start coding before the thread reaches a decision. Migrating to the wrong
one is worse than leaving both.

---

**Skills:** TypeScript, React state management  
**Estimated effort:** 1–2 weeks

### 17. Add Playwright end-to-end smoke tests for the main routes

**Labels:** `test`, `needs discussion`

`app/` contains twenty route groups — `marketplace`, `dashboard`, `portfolio`,
`governance`, `staking`, `trading`, `analytics`, `telemetry`, `provenance`,
`simulations`, `security`, `settings`, `submissions`, `waitlist`, `learn`,
`create`, `testing`, `bug-report`, `bug-reports` and the root page.

There are no end-to-end tests. Nothing verifies that any of those pages renders
without crashing.

## Why this matters

Jest tests components in isolation; they will not catch a page that throws on
mount because a provider is missing, a Next.js App Router boundary is wrong, or
a server component imports something client-only. With twenty routes and no CI,
a broken page can sit unnoticed indefinitely.

A smoke suite that simply loads every route and asserts no console error would
have caught the missing PWA icons and the null wallet address.

## Tasks

- [ ] Agree scope in the thread — smoke-only first, or full user journeys?
- [ ] Add Playwright and a config targeting a locally built app
- [ ] Write a smoke test per route asserting the page renders and logs no console errors
- [ ] Add one real journey end to end: connect wallet → browse marketplace → open an agent
- [ ] Run against a production build, not the dev server, so build-time issues surface
- [ ] Wire into CI on a schedule or on pull requests, depending on runtime

## Files to look at

- `tests/e2e/ (new)`
- `playwright.config.ts (new)`
- `package.json`
- `.github/workflows/ci.yml`

## Acceptance criteria

- Every route in `app/` has a smoke test
- A page that throws on mount fails the suite
- At least one multi-step user journey is covered
- The suite runs in CI within an agreed time budget

## Notes

Depends on the CI issue. Chromium is available in most CI images; no browser download is needed if you pin it.

---

**Skills:** TypeScript, Playwright  
**Estimated effort:** 1 week

### 18. Add a Lighthouse CI budget for performance, accessibility and PWA

**Labels:** `ci`, `performance`, `accessibility`, `needs discussion`

The app is a PWA — `public/manifest.json`, `public/sw.js`, `next-pwa` and a full
icon set are all present — but nothing measures whether it actually meets PWA
criteria, or tracks performance and accessibility scores over time.

The dependency list is heavy: MUI, Emotion, Redux, Zustand, Recharts,
`@stellar/stellar-sdk`, `algoliasearch`, `ipfs-http-client` and `nft.storage` all
ship to the client.

## Why this matters

With that dependency surface, bundle size will drift upward with every feature
and nobody will notice until the app feels slow on a mid-range phone — which
matters for a humanitarian aid product whose users are not all on flagship
hardware.

Accessibility scoring also gives the existing a11y work a number to move.

## Tasks

- [ ] Agree which routes to measure and what the initial budgets should be
- [ ] Add Lighthouse CI against a production build of the key routes
- [ ] Set budgets for performance, accessibility, best practices, SEO and PWA installability
- [ ] Start budgets at the current scores and ratchet, rather than setting aspirational numbers that get muted
- [ ] Report the delta on pull requests
- [ ] Consider adding a bundle-size check alongside it

## Files to look at

- `.github/workflows/ci.yml`
- `next.config.js`
- `public/manifest.json`

## Acceptance criteria

- Lighthouse runs on the agreed routes on every pull request
- Current scores are recorded as the baseline
- A regression beyond the budget fails the check

---

**Skills:** GitHub Actions, Lighthouse, web performance  
**Estimated effort:** 2–3 days

### 19. Add Storybook for the component library

**Labels:** `documentation`, `needs discussion`, `developer-experience`

`components/README.md` is 353 lines documenting the component library in prose.
There is no Storybook, no visual component catalogue, and no way to see a
component in its various states without running the whole app and navigating to
a page that happens to use it.

The theme now supports light and dark modes with distinct token sets, which
doubles the number of states worth reviewing.

## Why this matters

A component library documented only in prose drifts from the code immediately.
Storybook would make the light/dark theme work verifiable at a glance, give
designers something to review without a local dev environment, and give
contributors a place to build a component in isolation before wiring it into a
page.

## Tasks

- [ ] Agree in the thread whether this is worth the maintenance cost — it is a real ongoing commitment
- [ ] Add Storybook configured for Next.js App Router and the MUI theme provider
- [ ] Add a theme toggle addon so every story can be checked in light and dark
- [ ] Write stories for the shared components first: `Button`, `Card`, `Navigation`, `ThemeToggle`
- [ ] Decide whether to deploy it publicly and where
- [ ] Replace the hand-maintained parts of `components/README.md` with links to stories

## Files to look at

- `.storybook/ (new)`
- `components/`
- `components/README.md`
- `components/providers/ThemeModeProvider.tsx`

## Acceptance criteria

- Storybook runs locally against the real theme
- Shared components have stories covering their main states
- Both light and dark themes are switchable within Storybook

---

**Skills:** TypeScript, React, Storybook  
**Estimated effort:** 1 week

### 20. Audit the twenty app routes — `bug-report` and `bug-reports` both exist

**Labels:** `refactor`, `needs discussion`

`app/` has twenty route groups. Two of them are `bug-report` and `bug-reports` —
singular and plural, both present, both with pages. That is either a deliberate
form-versus-list split or an accident, and a newcomer cannot tell which.

More broadly, no document states which routes are production-ready, which are
prototypes, and which are dead. `app/testing/` and `app/simulations/` in
particular read as developer tooling rather than user-facing pages.

## Why this matters

Twenty routes with unclear status is a navigation problem for users and an
orientation problem for contributors. Prototype pages reachable in production
make the product look unfinished, and nobody can safely delete anything because
nobody knows what is load-bearing.

## Tasks

- [ ] Produce an inventory: route, purpose, status (production / prototype / dead), linked from where
- [ ] Resolve `bug-report` versus `bug-reports` — merge, rename, or document the distinction
- [ ] Decide whether `testing` and `simulations` should ship to production or sit behind a flag
- [ ] Remove or gate anything dead — with agreement in the thread first
- [ ] Add the inventory to the README or the architecture docs so it stays answerable

## Files to look at

- `app/`
- `app/bug-report/`
- `app/bug-reports/`
- `components/Navigation.tsx`
- `README.md`

## Acceptance criteria

- Every route has a documented purpose and status
- The singular/plural bug report duplication is resolved
- Developer-only routes are gated or removed
- The inventory lives in the repository, not just the issue thread

---

**Skills:** Next.js App Router, TypeScript  
**Estimated effort:** 3–5 days

---

## Posting these

```bash
# from the repository root, with the GitHub CLI authenticated
./.github/create-issues.sh 1     # post stage 1
./.github/create-issues.sh 2     # later
./.github/create-issues.sh 3

./.github/create-issues.sh 1 --dry-run   # print without creating
```

The script reads `.github/wave-issues.json`, which is generated from the same source as this file. Edit the JSON if you want to tweak wording before posting; this document is the readable copy.
