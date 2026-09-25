export type LifecycleEventType =
  | 'agent_minted'
  | 'agent_upgraded'
  | 'agent_deprecated'
  | 'simulation_completed'
  | 'simulation_failed'
  | 'transaction_failed'
  | 'recovery_action_required'
  | 'approval_required'
  | 'governance_proposal_active'
  | 'rate_limit_warning'
  | 'security_audit_alert';

export type NotificationSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface RecoveryAction {
  label: string;
  actionId: string;
  href?: string;
  isDestructive?: boolean;
}

export interface LifecycleNotification {
  id: string;
  dedupKey: string;
  type: LifecycleEventType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  recipientWallet?: string; // If set, only visible to this wallet
  audience: 'user' | 'admin' | 'all';
  deepLink?: string;
  recoveryAction?: RecoveryAction;
  isRead: boolean;
  readAt?: string;
  dismissed: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface NotificationFilterOptions {
  unreadOnly?: boolean;
  severity?: NotificationSeverity;
  type?: LifecycleEventType;
  limit?: number;
}
