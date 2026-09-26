import { TimelinePageRequest, TimelinePageResponse } from "./types";

/**
 * Fetch timeline events with pagination and visibility filtering
 */
export async function fetchTimeline(request: TimelinePageRequest): Promise<TimelinePageResponse> {
  const params = new URLSearchParams({
    userId: request.userId,
    limit: String(request.limit || 20),
    offset: String(request.offset || 0),
    includePrivate: String(request.includePrivate || false),
  });

  const response = await fetch(`/api/timeline?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch timeline");
  }

  return response.json();
}

/**
 * Create a timeline event
 */
export async function createTimelineEvent(event: Omit<any, "id" | "timestamp">): Promise<any> {
  const response = await fetch("/api/timeline/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    throw new Error("Failed to create event");
  }

  return response.json();
}

/**
 * Delete a timeline event (soft delete)
 */
export async function deleteTimelineEvent(eventId: string): Promise<void> {
  const response = await fetch(`/api/timeline/events/${eventId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete event");
  }
}
