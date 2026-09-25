# Lifecycle & Recovery Notification System

## Overview
The Trellis Lifecycle Notification System manages critical alerts, user actions, lifecycle transitions, and recovery guidance.

---

## Key Features

1. **Deduplication (`dedupKey`)**:
   - Every event has a unique or deterministic deduplication key.
   - Retried events, background task polling, or duplicate webhooks will never create redundant notifications.

2. **Recipient Isolation**:
   - Notifications with `recipientWallet` are strictly visible to that specific wallet address.
   - Prevents private data leakage between players and developers.

3. **Recovery Deep Links**:
   - Critical failures (such as `transaction_failed`, `rate_limit_warning`, `recovery_action_required`) contain embedded `recoveryAction` objects with direct deep links to remediation workflows.

---

## Event Catalog
- `agent_minted`: New agent deployment confirmed on Soroban.
- `agent_upgraded`: Contract bytecode or metadata upgrade applied.
- `simulation_completed` / `simulation_failed`: Simulation test engine completion or failure.
- `transaction_failed`: On-chain execution failure with retry / recovery link.
- `recovery_action_required`: User action needed for wallet or contract state recovery.
- `rate_limit_warning`: Notification when API or gas budget reaches threshold.
