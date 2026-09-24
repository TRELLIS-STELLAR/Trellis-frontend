# Trellis Frontend Routes Inventory

This document provides a complete inventory of all routes in the Trellis frontend application, including their purpose and production status.

## Route Status Legend

- **production** - User-facing feature, fully implemented and ready for end users
- **prototype** - Work in progress or experimental feature not intended for general release
- **internal** - Developer tooling or testing utilities, should not be exposed to end users
- **deprecated** - Route exists but is superseded; scheduled for removal

## User-Facing Routes (Production)

| Route | Purpose | Status | Linked From | Notes |
|-------|---------|--------|-------------|-------|
| `/` | Home page / landing page | production | Navigation, direct links | Entry point to application |
| `/marketplace` | Browse and discover agents | production | Navigation | Core marketplace feature |
| `/dashboard` | User dashboard and statistics | production | Navigation | Shows user activity and metrics |
| `/dashboard/referrals` | Affiliate dashboard | production | Navigation as "Affiliate" | Referral management and earnings |
| `/analytics` | Analytics and performance metrics | production | Navigation | Data visualization and insights |
| `/create` | Create/mint new agent | production | Navigation as "Create Agent" | Agent creation wizard |
| `/learn` | Educational resources | production | Navigation | Learning materials and guides |
| `/portfolio` | User's portfolio of assets | production | Navigation | Shows owned agents and tokens |
| `/staking` | Staking interface | production | Navigation | Stake XLM or other assets |
| `/security` | Security and governance | production | Navigation | Security settings and info |
| `/waitlist` | Waitlist signup | production | Navigation | Beta feature access |

## Bug Reporting Routes (Production - Form and Dashboard)

| Route | Purpose | Status | Linked From | Notes |
|-------|---------|--------|-------------|-------|
| `/bug-report` | Submit a bug report | production | Navigation as "Report Bug" | Bug submission form |
| `/bug-reports` | Bug reports dashboard | production | Navigation as "Bug Reports" | Track submitted bug reports and rewards |

**Note**: `/bug-report` (singular) is the form for submitting bugs, while `/bug-reports` (plural) is the dashboard for viewing existing reports. These serve distinct purposes and are intentionally separate.

## Secondary Routes (Production)

| Route | Purpose | Status | Linked From | Notes |
|-------|---------|--------|-------------|-------|
| `/trading` | Trading interface | production | Navigation | Trade agents or tokens |
| `/governance` | Governance voting | production | Internal | Protocol governance participation |
| `/telemetry` | System telemetry | production | Navigation | System metrics and health |
| `/provenance` | Asset provenance tracking | production | Navigation | Transaction history and verification |

## Developer/Internal Routes (Internal - Not for end users)

| Route | Purpose | Status | Linked From | Notes |
|-------|---------|--------|-------------|-------|
| `/submissions` | Admin submissions dashboard | internal | Legacy link in nav | For content moderation/admin |
| `/testing` | Testing utilities | internal | None | Developer testing tools only |
| `/simulations` | Simulation environment | internal | None | For testing transactions safely |

## API Routes

| Path | Method | Purpose | Status |
|------|--------|---------|--------|
| `/api/affiliates/earnings` | GET | Fetch affiliate earnings | production |
| `/api/affiliates/payouts` | GET/POST | Manage affiliate payouts | production |
| `/api/affiliates/referrals` | GET/POST | Manage referral codes | production |
| `/api/affiliates/stats` | GET | Fetch affiliate statistics | production |
| `/api/affiliates/program` | GET | Fetch program configuration | production |
| `/api/affiliates/validate` | POST | Validate affiliate eligibility | production |
| `/api/bug-reports` | GET/POST | Bug report operations | production |

## Notes

- The application uses Next.js App Router with `app/` directory structure
- Each route group is in its own directory under `app/`
- Shared components are in `components/` directory
- Feature-specific components are in `features/` directory
- All routes are publicly accessible; authentication context is managed via wallet connection
- `/testing`, `/simulations`, and `/submissions` should be gated behind an admin flag or environment check

## Future Cleanup

- Verify whether `/submissions` vs `/submissions/` routing needs clarification
- Consider deprecating `/testing` and `/simulations` if they're not actively used
- Document environment-specific route access (dev-only routes)
