import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { TimelinePageResponse, TimelineEvent, TimelinePageRequest, isEventVisible } from "../types";
import { fetchTimeline } from "../api";

/**
 * Hook to fetch paginated activity timeline with visibility filtering
 */
export function useActivityTimeline(userId: string, limit: number = 20) {
  return useInfiniteQuery<TimelinePageResponse>({
    queryKey: ["activity-timeline", userId],
    queryFn: async ({ pageParam = 0 }) => {
      const request: TimelinePageRequest = {
        userId,
        limit,
        offset: pageParam,
        includePrivate: true,
      };
      return fetchTimeline(request);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.offset + lastPage.limit;
      }
      return undefined;
    },
    initialPageParam: 0,
  });
}

/**
 * Hook to fetch public timeline (excludes private events)
 */
export function usePublicTimeline(userId: string, limit: number = 20) {
  return useInfiniteQuery<TimelinePageResponse>({
    queryKey: ["public-timeline", userId],
    queryFn: async ({ pageParam = 0 }) => {
      const request: TimelinePageRequest = {
        userId,
        limit,
        offset: pageParam,
        includePrivate: false,
      };
      const response = await fetchTimeline(request);
      // Filter out private events
      return {
        ...response,
        events: response.events.filter((e) => isEventVisible(e, true)),
        total: response.events.filter((e) => isEventVisible(e, true)).length,
      };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.offset + lastPage.limit;
      }
      return undefined;
    },
    initialPageParam: 0,
  });
}

/**
 * Hook to fetch single event with authorization check
 */
export function useTimelineEvent(eventId: string) {
  return useQuery<TimelineEvent>({
    queryKey: ["timeline-event", eventId],
    queryFn: async () => {
      const response = await fetch(`/api/timeline/events/${eventId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch event");
      }
      return response.json();
    },
  });
}
