/**
 * Activity Timeline Types
 *
 * Defines event types, visibility rules, and data structures for user-facing
 * activity timeline that excludes maintainer-only audit events.
 */

export type TimelineEventType =
  | "claim_created"
  | "claim_settled"
  | "claim_rejected"
  | "referral_earned"
  | "payout_requested"
  | "payout_completed"
  | "wallet_connected"
  | "profile_updated"
  | "verification_completed";

export type EventVisibility = "public" | "private" | "maintainer_only";

export interface TimelineEvent {
  id: string;
  userId: string;
  type: TimelineEventType;
  visibility: EventVisibility;
  timestamp: number;
  title: string;
  description: string;
  resourceId?: string;
  resourceType?: "claim" | "referral" | "payout" | "wallet";
  resourceUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface TimelinePageRequest {
  userId: string;
  limit?: number;
  offset?: number;
  includePrivate?: boolean;
}

export interface TimelinePageResponse {
  events: TimelineEvent[];
  total: number;
  hasMore: boolean;
  offset: number;
  limit: number;
}

export const VISIBILITY_RULES: Record<EventVisibility, string> = {
  public: "Visible to user and public records",
  private: "Visible to user only",
  maintainer_only: "Visible to maintainers only",
};

export const EVENT_TYPE_LABELS: Record<TimelineEventType, string> = {
  claim_created: "Claim Created",
  claim_settled: "Claim Settled",
  claim_rejected: "Claim Rejected",
  referral_earned: "Referral Earned",
  payout_requested: "Payout Requested",
  payout_completed: "Payout Completed",
  wallet_connected: "Wallet Connected",
  profile_updated: "Profile Updated",
  verification_completed: "Verification Completed",
};

/**
 * Determines which events should be visible to a user
 * Filters out maintainer-only events
 */
export function isEventVisible(
  event: TimelineEvent,
  forPublicView: boolean = false,
): boolean {
  if (event.visibility === "maintainer_only") {
    return false;
  }
  if (forPublicView && event.visibility === "private") {
    return false;
  }
  return true;
}
